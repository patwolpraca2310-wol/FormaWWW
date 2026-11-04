# FormaWWW

Statyczny serwis HTML/CSS/JS. Zaakceptowana wizualnie wersja V6 przeniesiona do projektu lokalnego 4 listopada 2026. Nie opublikowano zmian.

## Podgląd i testy

```powershell
python -m http.server 4197 --bind 127.0.0.1
python scripts/audit.py
cd worker
node --test test/*.test.mjs
node tools/check-setup.mjs --activation
```

Podgląd: http://127.0.0.1:4197/

Nie wysyłaj prawdziwego formularza podczas lokalnego przeglądu. Formularz posiada rzeczywisty endpoint i produkcyjny kontroler. Testy Node używają atrap transportu i bazy w pamięci, nie wysyłają maili.

## Pliki

Osiem publicznych HTML: index, oferta, o-formawww, kontakt, dziekujemy, 404, polityka-prywatnosci, regulamin. Wspólne css/style.css, css/pages.css i css/responsive.css. js/main.js oraz js/details.js obsługują UI. js/contact-form.js zawiera wydzielony oryginalny kontroler formularza, js/contact-transport.js zachowany transport. Backend pozostaje w worker/. Brak zależności frontendowych.

## Stan przed publikacją

Zachowano zastane noindex i robots.txt z Disallow: /. Test audit.py --production będzie zgłaszał tę celową blokadę. Nie skopiowano robots z preview. Otwieranie indeksacji wymaga osobnego kroku; Dziękujemy i 404 mają nadal pozostać noindex. Sitemap zachowuje sześć adresów docelowych.

Polityka prywatności i Regulamin mają zaakceptowaną oprawę, ale wymagają osobnego finalnego sprawdzenia treści przed pełnym uruchomieniem. Nie dodano analityki, chatbota ani dodatkowych cookies.

Konfiguracja domeny CNAME, backend Workera, D1, Resend i sekrety nie zostały zmienione. Nie przeprowadzono zdalnej próby wysyłki. Szczegóły w docs/przeniesienie-v6.md.
