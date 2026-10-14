# Audyt techniczny FormaWWW — 2026-10-11

## Wynik i granice etapu

Podstawowa wersja statyczna została skontrolowana i technicznie uporządkowana.
Kod jest przygotowany do umieszczenia w repozytorium GitHub, po ocenie tego
audytu przez właściciela. **Nie jest to zgoda na publiczną publikację.**
Wysyłka, dokumenty prawne w wersji finalnej, OG/favicon i konfiguracja hostingu
pozostają do domknięcia. Nie utworzono repozytorium zdalnego ani wdrożenia.

Treści główne wszystkich ośmiu stron porównano z kopią przed audytem.
Są identyczne po pominięciu poprawionych URL i atrybutów elementu main.
Aktywne deklaracje CSS oraz ich kolejność także pozostały identyczne.
Nie zmieniono kolorów, kompozycji, marketingu ani treści dokumentów prawnych.

## Co sprawdzono

- Osiem gotowych HTML, dwa wspólne CSS, JavaScript, fonty, robots i sitemap.
- Menu, stopki, CTA, linki treści/prawne, lokalne zasoby, kotwice SVG/HTML i ARIA.
- Tytuły, opisy, canonical, OG, lang, viewport, nagłówki, JSON-LD i indeksowanie.
- Formularz, walidację, zachowanie danych, honeypot i blokadę ponownego submitu.
- Układy 1440, 1366, 1024, 768, 390, 375 i 320 px na każdej stronie: 56 przypadków.
- Klawiaturę, skip linki, focus, menu, radio demonstracji, FAQ i spis treści.
- Kontrast widocznych tekstów, błędy konsoli, odpowiedzi HTTP i rozmiary zasobów.
- Nieużywane klasy CSS, dawne mechanizmy kontaktowe, animacje i brak zewnętrznych zależności.
- Aktualność dokumentacji, brak linkowania do pustych plików i ryzyko publikacji plików roboczych.

## Znalezione problemy i poprawki

| Problem | Poprawka |
| --- | --- |
| O FormaWWW pod adresem ze spacją; docelowy plik z myślnikiem był pusty | Przeniesienie treści do o-formawww.html, wycofanie starej nazwy |
| Polityka prywatności pod adresem ze spacją | Nazwa polityka-prywatnosci.html, spójne linki/canonical/OG |
| Różne pozycje i etykiety głównego menu | Na sześciu stronach treściowych: Strona główna, Oferta, O FormaWWW, Kontakt; aria-current |
| Niepełna sitemap i niespójne lokalne meta robots | Sześć docelowych canonicali; lokalnie jednolite noindex, follow |
| Brak jawnej procedury otwarcia indeksacji | Nieaktywny docs/robots.production.txt i dokładna checklista; główny robots nietknięty |
| Brak skip linku na Dziękujemy | Skip link i identyfikator/focusowalność main, bez zmiany widocznej kompozycji |
| Fonty base64 powiększały wspólny blokujący CSS | Dwa identyczne binarnie lokalne WOFF2 i preload na korzystających z nich widokach |
| Martwe style dawnego dialogu, noscript-note i ct-policy-pending | Usunięte po potwierdzeniu braku użycia w HTML/JS |
| Różne historyczne klucze wersji zasobów | Jedna wersja audit-1, brak zbędnych wariantów tych samych CSS/JS w cache |
| Brak danych AboutPage | JSON-LD AboutPage + potwierdzone Organization; bez opinii, cen i wymyślonych danych |
| README i statusy opisywały pusty projekt; błędny opis fontów | Aktualny stan, instrukcje podglądu/testów/wdrożenia, historia i statusy |

Nie było martwych linków do Realizacji ani Metamorfoz. Oba puste pliki
pozostawiono bez zmian, poza sitemap i nawigacją. Pusty favicon.svg nie jest
osadzony: strony mają techniczne `data:,`, nie finalną ikonę.

Uproszczone strony Dziękujemy i 404 zachowują zaakceptowane linki powrotu
zamiast pełnego menu — celowy wyjątek dla stron użytkowych, bez rozbudowy designu.

## SEO każdej podstrony

Wszystkie mają unikalny title i description, jeden H1, poprawne lang=pl,
viewport, UTF-8, canonical i logiczne poziomy H2/H3. Metadane nie zmieniają
zaakceptowanego przekazu. Nie dodano sztucznych fraz.

| Plik | Canonical względem https://formawww.pl | Meta lokalne | Docelowo | Sitemap |
| --- | --- | --- | --- | --- |
| index.html | / | noindex, follow | index, follow | tak |
| oferta.html | /oferta.html | noindex, follow | index, follow | tak |
| kontakt.html | /kontakt.html | noindex, follow | index, follow | tak |
| o-formawww.html | /o-formawww.html | noindex, follow | index, follow | tak |
| polityka-prywatnosci.html | /polityka-prywatnosci.html | noindex, follow | index, follow po uzupełnieniu dokumentu | tak |
| regulamin.html | /regulamin.html | noindex, follow | index, follow po zatwierdzeniu dokumentu | tak |
| dziekujemy.html | /dziekujemy.html | noindex, follow | noindex, follow | nie |
| 404.html | /404.html | noindex, follow | noindex, follow + HTTP 404 dla brakujących URL | nie |

Podstawowe Open Graph (title, description, URL, locale, type i nazwa marki)
są poprawne; brak zatwierdzonego obrazu pozostaje zadaniem przed publikacją.
Nie osadzono pustego lub losowego og:image. JSON-LD obejmuje Organization,
WebSite/WebPage na homepage, WebPage/BreadcrumbList na Ofercie, ContactPage
oraz AboutPage. Nie dodano ocen, opinii, cen, godzin ani danych niepotwierdzonych.
To nie gwarantuje specjalnego wyglądu wyniku wyszukiwania.

**Nie uruchomiono indeksowania.** Główny robots.txt jest identyczny jak przed
audytem i ma Disallow: /. Przy publikacji trzeba świadomie zmienić jednocześnie
robots i meta sześciu stron. Szczegóły: przed-publikacja.md.
Robots nie służy do ochrony dostępu; blokuje odczyt noindex przez robota.

## Mobile, UI i UX

- 56/56 sprawdzonych układów bez poziomego przewijania; kontrolowano również
  prostokąty treści, nie tylko scrollWidth dokumentu. Dekoracje aria-hidden
  mogą celowo wychodzić poza kontener i nie zostały usunięte.
- Zrzuty całych ośmiu stron przy 1440 i 320 px oraz próbki formularza/dokumentu
  zachowano w roboczym folderze zadania, poza publicznym projektem.
- Pola formularza mają tekst 16 px, wysokość co najmniej 56 px; textarea większa.
  Menu rozwinięte przy 320 px ma odnośniki wysokości około 50 px.
- Dokumenty prawne mają tekst 16 px, kontrolowaną szerokość i natywny spis treści.
- Brak nowych sticky kontrolek nad klawiaturą, interstitiali lub zmian CTA.
- Testy dotyczą przeglądarki Chromium w podglądzie z emulowaną szerokością,
  nie fizycznych urządzeń i nie pełnej macierzy Safari/Firefox/Android/iOS.

## Dostępność

- Po jednym main i H1; nagłówki bez przeskoków, landmarki i prawidłowe ID/ARIA.
- Wszystkie osiem skip linków przenosi focus do main; linki są widoczne po Tab.
- Sześć menu testowano klawiaturą: Enter otwiera, Escape zamyka i oddaje focus.
- Natywne radio demonstracji, FAQ i spis dokumentu działają z klawiatury.
- Formularz ma fieldset/legend, stałe label, required, autocomplete, typy/inputmode,
  summary z linkami do błędów, aria-invalid i tekstowe komunikaty. Honeypot
  jest poza kolejnością Tab i oznaczony aria-hidden.
- Kontrola 556 widocznych węzłów tekstu: brak potwierdzonych naruszeń progów
  4,5:1 / 3:1. Sześć automatycznych wskazań nagłówka Polityki było fałszywych:
  nagłówek leży nad ciemną okładką, nie nad jasnym tłem body; sprawdzono jego
  rzeczywiste tło i położenie. Nie jest to pełna certyfikacja WCAG.
- Reduced motion jest obsługiwany w CSS: brak animacji/przejść i smooth scroll
  dla preferencji ograniczonego ruchu. Treści są statyczne i domyślnie widoczne.
- Brak JS: kod pozostawia menu i treści dostępne, formularz ma disabled i noscript.
  Te dwa tryby oceniono w kodzie — nie emulowano ich w przeglądarce narzędziowej.
- Nie przeprowadzono testów rzeczywistym czytnikiem ekranu ani wszystkich
  kombinacji zoomu/kontrastu systemowego. Zalecane przed publicznym startem.

## Formularz — wyniki

Przeszedł testy: brak błędów po pierwszej literze, puste pola wymagane,
focus w summary i przejście do pola, zły e-mail/URL/telefon, niedozwolony
protokół URL, samo białe pole imienia, opcjonalne pola puste i poprawnie
wypełnione, zachowanie danych, honeypot, blokada ponownego Enter i odblokowanie
po edycji. Nie ma zaznaczonej z góry usługi.

Po poprawnej walidacji pokazuje: „Wysyłka formularza zostanie aktywowana
po podłączeniu usługi formularzowej.” Bez przekierowania i bez fetch w trybie
podglądu. JavaScript formularza nie wymagał modyfikacji. Nie ma SMTP/tokenów
w frontendzie ani mailto jako działania formularza; mailto w danych kontaktowych
pozostaje zwykłym, świadomym odnośnikiem do poczty.

Nie testowano prawdziwej dostawy, timeoutów ani błędów działającego endpointu,
bo go nie uruchomiono. Serwer musi ustalać odbiorcę, walidować, ograniczać ruch
i potwierdzać przyjęcie; ochrona kliencka nie jest zabezpieczeniem serwerowym.

## Wydajność i technika

- style.css: 119 314 → 60 440 B (około 49% mniej surowego CSS).
- Wyodrębnione WOFF2: 15 120 + 24 836 B, byte-identical z dawnym base64.
  To nie oznacza 49% mniej całego transferu; fonty nadal trzeba pobrać.
- responsive.css: 46 615 B, main.js: 10 835 B. Bez nowych bibliotek i JS.
- TTF używany przez późniejszy pakiet nadal ma 164 700 B; zachowany dla
  pewności zgodności wyglądu. Konwersja do WOFF2 pozostaje ewentualną optymalizacją.
- DOM poniżej 320 elementów na stronę. Brak zdjęć rastrowych, iframe i trackerów.
- Grafiki mają kontrolowane wymiary/viewBox; efekty bazują głównie na transform
  i opacity, są jednorazowe lub zależne od działania użytkownika, bez pętli JS.
- Brak pozostałych nieużywanych klas w przeglądzie HTML/CSS (dynamiczne stany
  również sprawdzono). Powtórzenia reguł kaskady/breakpointów zachowano, bo
  opisują odmienne stany; nie stosowano ryzykownego automatycznego purge.
- Font-display swap może powodować niewielką zmianę metryk na zimnym cache.
  Preload ogranicza opóźnienie; nie deklaruje się zmierzonego zerowego CLS.
- HTTP lokalnie: gotowe HTML, CSS, JS, fonty, robots i sitemap odpowiadają 200;
  nie wykryto brakujących zasobów. Brakujący zagnieżdżony adres odpowiada 404
  prostego serwera Python, nie uruchamia jeszcze zaprojektowanej strony błędu.
- Bezpośrednie /404.html zwraca lokalnie 200 — właściwy kod/routing musi zapewnić hosting.
- Konsola w sprawdzonych stronach bez błędów/ostrzeżeń. Składnia JS: node --check OK.
- HTML: sprawdzono domknięcia, hierarchię, ID, lokalne odnośniki i metadane
  parserem projektu. CSS: zasoby/nawiasy, przegląd kaskady i renderowanie.
  Nie uruchamiano zewnętrznego pełnego walidatora W3C ani audytora Lighthouse.
- Nie ma terenowych pomiarów LCP/INP/CLS ani testu wolnej sieci. Nie deklaruje
  się wyniku Core Web Vitals. To wymaga wdrożenia i rzeczywistych pomiarów.

## Pliki zmienione

- index.html, oferta.html, kontakt.html: menu, ścieżki, lokalne robots/wersje
  zasobów i preload (tam, gdzie potrzebne), bez zmian treści głównych.
- dziekujemy.html: skip link/main, preload i wersje zasobów.
- o-formawww.html: właściwa treść z dawnego pliku ze spacją, adresy, menu,
  lokalne noindex, AboutPage. Pusty wcześniejszy placeholder został zastąpiony.
- polityka-prywatnosci.html: przeniesiona istniejąca polityka, poprawione
  techniczne URL/menu/zasoby; regulamin.html: menu/URL/wersje zasobów.
- 404.html: wyłącznie wspólny klucz wersji CSS/JS.
- css/style.css, css/responsive.css: wyodrębnienie fontów i usunięcie martwych reguł.
- assets/fonts/Manrope-latin.woff2, assets/fonts/Manrope-latin-ext.woff2: nowe pliki tych samych fontów.
- sitemap.xml, .gitignore, README.md, docs/status-podstron.md,
  docs/historia-zmian.md, docs/design-system.md, docs/przed-publikacja.md.
- Nowe: docs/audyt-techniczny.md, docs/robots.production.txt, scripts/audit.py.
- Wycofane nazwy: o formwww.html, polityka prywatnosci.html. Treść zachowana
  pod nowymi nazwami i w kopii sprzed audytu poza katalogiem serwisu.

**Bez zmian:** js/main.js, główny robots.txt, treść marketingowa i prawna,
dotychczasowe fonty TTF/licencja, brief oraz puste pliki portfolio/faviconu.

## Bezpośrednio przed publikacją

1. Akceptacja audytu i przygotowanie repozytorium — dopiero osobne polecenie.
2. Zatwierdzenie danych operacyjnych i dokumentów prawnych, usunięcie roboczych
   oznaczeń dopiero po akceptacji. Nie przepisywano ich w tym audycie.
3. Bezpieczny endpoint formularza, antyspam serwerowy, testy sukcesu/błędów,
   dostawy i przekierowania; aktualizacja informacji o formularzu.
4. Zatwierdzony obraz OG i favicon, realne podglądy udostępniania.
5. Wydzielona paczka publiczna bez docs/scripts/raportów/pustych plików.
6. HTTPS, wariant domeny, rozszerzenia .html, przekierowania, status i routing 404,
   nagłówki bezpieczeństwa, MIME fontów font/woff2 i font/ttf, cache i kompresja.
7. Świadome przełączenie robots + meta sześciu stron, kontrola produkcyjna skryptem.
8. Końcowy test na prawdziwym telefonie, Safari/Firefox, czytnikiem ekranu oraz
   pomiar wydajności na docelowym hostingu. Search Console dopiero w osobnym etapie.

Po dodaniu analityki, cookies lub chatbota zaktualizować Politykę, odpowiednie
części Regulaminu, informacje formularza i dokumentację procesów/zgód.
Nie dodano tych integracji ani pustego banera cookies.

## Źródła techniczne

- Indeksowanie/noindex: https://developers.google.com/search/docs/crawling-indexing/block-indexing
- Sitemap: https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap
- Organization: https://schema.org/Organization
- AboutPage: https://schema.org/AboutPage

Wynik audytu oczekuje na ocenę. Nie rozpoczęto kolejnego etapu.
