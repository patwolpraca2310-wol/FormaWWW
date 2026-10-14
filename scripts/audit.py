"""Read-only project preflight, Python 3 standard library. No publishing.

--production checks release robots/meta; default checks protected local preview.
This is a focused project validator, not a complete W3C or WCAG validator.
"""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote
import argparse
import json
import re
import xml.etree.ElementTree as ET

PAGES = ['index.html', 'oferta.html', 'kontakt.html', 'o-formawww.html',
         'polityka-prywatnosci.html', 'regulamin.html', 'dziekujemy.html', '404.html']
INDEXABLE = PAGES[:6]
DOMAIN = 'https://formawww.pl/'
NAV = [('index.html', 'Strona główna'), ('oferta.html', 'Oferta'),
       ('o-formawww.html', 'O FormaWWW'), ('kontakt.html', 'Kontakt')]
VOID = set('area base br col embed hr img input link meta param source track wbr'.split())


class Page(HTMLParser):
    def __init__(self, source):
        super().__init__(convert_charrefs=True)
        self.tags, self.stack, self.structure_errors = [], [], []
        self.feed(source)
        self.close()
        if self.stack:
            self.structure_errors.append('Unclosed: ' + ', '.join(x['tag'] for x in self.stack))

    def handle_starttag(self, tag, attrs):
        node = {'tag': tag, 'attrs': dict(attrs), 'text': '',
                'ancestors': [(x['tag'], x['attrs']) for x in self.stack]}
        self.tags.append(node)
        if tag not in VOID:
            self.stack.append(node)

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if tag not in VOID:
            self.handle_endtag(tag)

    def handle_endtag(self, tag):
        if not self.stack or self.stack[-1]['tag'] != tag:
            self.structure_errors.append('Unexpected closing: ' + tag)
            return
        self.stack.pop()

    def handle_data(self, data):
        for node in self.stack:
            node['text'] += data

    def select(self, tag, **attrs):
        return [n for n in self.tags if n['tag'] == tag and
                all(n['attrs'].get(k.replace('_', '-')) == v for k, v in attrs.items())]

    def meta(self, key, attr='name'):
        return [n['attrs'].get('content', '') for n in self.tags
                if n['tag'] == 'meta' and n['attrs'].get(attr) == key]


def run(root, production=False):
    errors, rows, resources = [], [], set()
    def check(ok, context, message):
        if not ok:
            errors.append(f'{context}: {message}')
    sources = {name: (root / name).read_text(encoding='utf-8-sig') for name in PAGES}
    pages = {name: Page(src) for name, src in sources.items()}
    titles, descriptions = [], []
    expected_urls = [DOMAIN if p == 'index.html' else DOMAIN + p for p in INDEXABLE]
    for name, page in pages.items():
        check(not page.structure_errors, name, str(page.structure_errors))
        check(sources[name].lower().startswith('<!doctype html>'), name, 'Missing doctype')
        check(len(page.select('html', lang='pl')) == 1, name, 'lang=pl')
        check(page.meta('viewport') == ['width=device-width, initial-scale=1'], name, 'viewport')
        check(len(page.select('meta', charset='utf-8')) == 1, name, 'UTF-8')
        title = page.select('title')
        check(len(title) == 1 and bool(title[0]['text'].strip()), name, 'Unique page title tag')
        titles.append(title[0]['text'] if title else '')
        desc = page.meta('description')
        check(len(desc) == 1 and bool(desc[0].strip()), name, 'Description')
        descriptions.extend(desc)
        url = DOMAIN if name == 'index.html' else DOMAIN + name
        check([n['attrs'].get('href') for n in page.select('link', rel='canonical')] == [url], name, 'Canonical')
        check(page.meta('og:url', 'property') == [url], name, 'OG URL')
        for field in ['og:title', 'og:description', 'og:type', 'og:site_name', 'og:locale']:
            check(len(page.meta(field, 'property')) == 1, name, field)
        robots = 'index, follow' if production and name in INDEXABLE else 'noindex, follow'
        check(page.meta('robots') == [robots], name, f'Expected robots {robots}')
        check(len(page.select('h1')) == 1, name, 'Exactly one H1')
        check(len(page.select('main')) == 1, name, 'Exactly one main')
        check(len(page.select('header')) >= 1 and len(page.select('footer')) == 1, name, 'Landmarks')
        check(bool(page.select('a', href='#main')), name, 'Skip link')
        check(bool(page.select('main', id='main', tabindex='-1')), name, 'Focusable main')
        ids = [n['attrs']['id'] for n in page.tags if 'id' in n['attrs']]
        check(len(ids) == len(set(ids)), name, 'Duplicate IDs')
        level = 0
        for n in page.tags:
            if re.fullmatch('h[1-6]', n['tag']):
                next_level = int(n['tag'][1])
                check(next_level <= level + 1, name, 'Skipped heading level: ' + n['text'])
                level = next_level
            for key in ['aria-labelledby', 'aria-describedby', 'aria-controls']:
                for ref in (n['attrs'].get(key) or '').split():
                    check(ref in ids, name, 'Missing ARIA ID: ' + ref)
            if n['tag'] == 'img':
                check('alt' in n['attrs'], name, 'Missing alt')
            if n['tag'] == 'script' and n['attrs'].get('type') == 'application/ld+json':
                try:
                    data = json.loads(n['text'])
                    check(data.get('@context') == 'https://schema.org', name, 'JSON-LD context')
                except (ValueError, AttributeError):
                    errors.append(name + ': Invalid JSON-LD')
        links = [n for n in page.select('a') if any(a.get('id') == 'site-nav' for _, a in n['ancestors'])]
        if name in INDEXABLE:
            found = [(n['attrs'].get('href'), n['text'].replace('↗', '').strip()) for n in links]
            check(found == NAV, name, 'Main menu mismatch: ' + str(found))
            for n in links:
                check((n['attrs'].get('aria-current') == 'page') == (n['attrs']['href'] == name), name, 'Current navigation item')
        for n in page.tags:
            for key in ['href', 'src']:
                link = n['attrs'].get(key)
                if not link:
                    continue
                u = urlsplit(link)
                if u.scheme or u.netloc:
                    continue
                target = unquote(u.path).lstrip('/') or name
                file = root / target
                check(file.is_file() and file.stat().st_size > 0, name, 'Missing/empty: ' + link)
                if u.path and n['tag'] in ['link', 'img', 'script']:
                    resources.add(target)
                if u.fragment and target in pages:
                    target_ids = {n['attrs'].get('id') for n in pages[target].tags}
                    check(unquote(u.fragment) in target_ids, name, 'Missing fragment: ' + link)
        rows.append({'page': name, 'bytes': (root/name).stat().st_size,
                     'elements': len(page.tags), 'h1': len(page.select('h1')),
                     'headings': [n['tag'] for n in page.tags if re.fullmatch('h[1-6]',n['tag'])],
                     'title': titles[-1], 'canonical': url, 'robots': page.meta('robots')})
    check(len(titles) == len(set(titles)), 'SEO', 'Duplicate titles')
    check(len(descriptions) == len(set(descriptions)), 'SEO', 'Duplicate descriptions')
    sitemap = ET.parse(root/'sitemap.xml')
    urls = [n.text for n in sitemap.findall('.//{http://www.sitemaps.org/schemas/sitemap/0.9}loc')]
    check(urls == expected_urls, 'Sitemap', 'Expected exactly the six canonical pages')
    robots = (root/'robots.txt').read_text(encoding='utf-8-sig')
    if production:
        check('Disallow: /' not in robots and 'Sitemap: '+DOMAIN+'sitemap.xml' in robots, 'Robots', 'Production rules not activated')
    else:
        check('Disallow: /' in robots, 'Robots', 'Preview protection missing')
    for cssfile in ['css/style.css', 'css/responsive.css']:
        css = (root/cssfile).read_text(encoding='utf-8-sig')
        for link in re.findall(r'url\([\"\']?([^\)\"\']+)', css):
            if link.startswith(('data:', '#')):
                continue
            check(not urlsplit(link).scheme, cssfile, 'External CSS resource: '+link)
            file = ((root/cssfile).parent/link).resolve()
            check(file.is_file() and file.stat().st_size > 0, cssfile, 'Missing CSS resource: '+link)
            resources.add(file.relative_to(root.resolve()).as_posix())
        clean = re.sub(r'/\*[\s\S]*?\*/', '', css)
        check(clean.count('{') == clean.count('}'), cssfile, 'Unbalanced braces')
    form_page = pages['kontakt.html']
    labels = {n['attrs'].get('for') for n in form_page.select('label')}
    fields = [n for n in form_page.tags if n['tag'] in ['input','select','textarea']]
    expected = ['fax_number','service','website','name','company','email','phone','message']
    check([n['attrs'].get('name') for n in fields] == expected, 'Form', 'Field names/order')
    for n in fields:
        check(n['attrs'].get('id') in labels, 'Form', 'Missing persistent label')
    check('endpoint: ""' in (root/'js/main.js').read_text(), 'Form', 'Sending must remain disabled')
    for old in ['o formwww.html','polityka prywatnosci.html']:
        check(not (root/old).exists(), 'URLs', 'Obsolete duplicate page: '+old)
    for n in ['realizacje.html','metamorfozy.html','favicon.svg']:
        check((root/n).stat().st_size == 0, 'Drafts', 'Unexpected draft modification: '+n)
    return {'mode': 'production' if production else 'preview', 'pages': rows,
            'resources': [{'path': p, 'bytes': (root/p).stat().st_size} for p in sorted(resources)],
            'sitemap': urls, 'errors': errors}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument('--production', action='store_true')
    parser.add_argument('--json', type=Path)
    args = parser.parse_args()
    report = run(args.root.resolve(), args.production)
    if args.json:
        args.json.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    for row in report['pages']:
        print(f"{row['page']}: H1={row['h1']}, DOM={row['elements']}, bytes={row['bytes']}, {row['robots'][0]}")
    for error in report['errors']:
        print('ERROR:', error)
    print(f"{len(report['errors'])} errors; {len(report['sitemap'])} sitemap URLs. Mode: {report['mode']}.")
    raise SystemExit(bool(report['errors']))
