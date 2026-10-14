# Przed publikacją FormaWWW

Stan: 2026-10-11. Serwis pozostaje lokalny. Dokumenty prawne są projektami do zatwierdzenia, nie opinią prawną ani zapewnieniem zgodności. Wskazany jest przegląd przez prawnika znającego rzeczywisty model współpracy.

## Dane i decyzje właściciela

- Potwierdzić pełną firmę, adres i dane rejestrowe z aktualnym wpisem. Zachowano przekazane NIP 8822155796 i REGON 545101495; nie weryfikowano przypisania w rejestrze.
- Potwierdzić dostawcę poczty, jego rolę, odbiorców/podwykonawców, lokalizację przetwarzania, transfery poza EOG i zabezpieczenia.
- Dopiero przy wdrożeniu wybrać hosting i endpoint formularza: umowy powierzenia, logi, zakres danych, limity, retencja, kopie, kraje i podwykonawcy.
- Ustalić harmonogram retencji osobno dla zapytań bez umowy, umów, dokumentów podatkowych, roszczeń, logów i kopii. Zaproponowane kryteria w polityce wymagają zatwierdzenia i faktycznej realizacji; nie stosować samego „tak długo, jak konieczne”.
- Potwierdzić, czy wyznaczono IOD; niczego nie deklarowano bez informacji właściciela.
- Potwierdzić model klientów i zasady obsługi osób korzystających z ochrony konsumenckiej. Samo B2B nie wyłącza ustawowej ochrony części jednoosobowych przedsiębiorców.
- Zatwierdzić ramy reklamacji, sposób zawierania umów, datę obowiązywania regulaminu. Konkretne ceny, płatności, terminy, poprawki, odbiór i rezygnacja pozostają w indywidualnych ofertach/umowach.
- Przy przeniesieniu praw autorskich ustalić pola eksploatacji i wymaganą formę; nie zakładać, że wystarczy zwykły e-mail. Prawa do zasobów zewnętrznych pozostają zgodne z ich licencjami.

## Formularz

- Wysyłka nadal nieaktywna. Nie dodano dostawcy, hasła SMTP ani tokenu. Nie przekierowuje na Dziękujemy po samym sprawdzeniu pól.
- Odbiorca docelowy po stronie serwera: patryk.woloszyn@formawww.pl. Nie ufać adresowi odbiorcy z klienta.
- Przed aktywacją: walidacja serwerowa, limity rozmiaru, rate limiting, kontrola pochodzenia i antyspam, bezpieczne logowanie błędów bez całej treści wiadomości.
- Klienckie honeypot i walidacja nie stanowią pełnego zabezpieczenia.
- Ocenić minimalizację pól wymaganych, w szczególności nazwy firmy. Obecnie zachowano zatwierdzony zakres użytkownika.
- Dopiero po kompletnej informacji RODO i integracji zastąpić widoczny komunikat podglądu. Zweryfikować sukces, błędy, timeout, powtórne wysłanie i zachowanie danych.

## Chatbot, analityka i cookies — przed dodaniem

Nie są wdrożone. Obecny kod nie ustawia cookies, localStorage ani sessionStorage i nie ładuje trackerów.

Po decyzji o integracji trzeba zaktualizować:

- polityka-prywatnosci.html: faktyczne narzędzia, dane (także treść rozmowy), cele, podstawy, odbiorcy, transfery, okresy, prawa, profilowanie/decyzje automatyczne, jeśli występują;
- regulamin.html: nowe usługi elektroniczne, zasady i ograniczenia chatbota, reklamacje i wymagania;
- kontakt.html: skróconą informację przy formularzu, jeżeli zmienia się proces;
- dokumentację wewnętrzną: rejestr procesów, umowy powierzenia, retencję, konfigurację zgód i listę technologii;
- zarządzanie zgodami na urządzeniu, jeśli potrzebne; blokować nieniezbędne narzędzia przed zgodą oraz umożliwiać jej odwołanie. Nie dodawać pustego banera cookies „na zapas”.

## Indeksowanie, ścieżki i błędy

- Docelowe nazwy zgodne z poleceniem audytu: o-formawww.html i polityka-prywatnosci.html. Wszystkie odnośniki, canonical, OG i sitemap zostały dostosowane. Stare nazwy ze spacjami wycofano z katalogu serwisu; kopia przed audytem pozostaje poza nim.
- Wszystkie osiem gotowych stron ma lokalne meta noindex, follow. robots.txt nadal ma Disallow: / — nie otwarto crawlowania ani indeksowania.
- Sitemap zawiera sześć docelowych adresów: /, oferta.html, kontakt.html, o-formawww.html, polityka-prywatnosci.html, regulamin.html. Jest przygotowana do publikacji, nie opisuje aktywnej indeksowalności lokalnego podglądu.
- 404.html i dziekujemy.html mają noindex, follow i nie są w sitemap. Nie dodawać ich do menu.
- Przy wdrożeniu ustawić faktyczny status HTTP 404 dla brakujących adresów. Sam plik 404.html, otwarty bezpośrednio, zwraca 200 z prostego serwera lokalnego. Sprawdzić również nieistniejący adres w zagnieżdżonym katalogu; zasoby i linki 404 są root-relative.
- Puste realizacje.html, metamorfozy.html i favicon.svg są nieużywane. Nie linkować, nie dodawać do sitemap i wykluczyć z paczki publicznej. o-formawww.html jest już właściwą, niepustą stroną.

### Dokładne przełączenie dopiero przy publikacji

1. Najpierw zatwierdzić dokumenty prawne, podłączyć i przetestować formularz albo świadomie zdecydować o publikacji bez wysyłki. Nie otwierać indeksacji roboczych dokumentów prawnych z pominięciem tych decyzji.
2. W sześciu plikach z sitemap zmienić `<meta name="robots" content="noindex, follow">` na `<meta name="robots" content="index, follow">`. Nie zmieniać tego znacznika w dziekujemy.html ani 404.html.
3. Dopiero w zatwierdzonej wersji produkcyjnej zastąpić zawartość głównego robots.txt treścią docs/robots.production.txt: `User-agent: *`, `Allow: /`, `Sitemap: https://formawww.pl/sitemap.xml`. Sam szablon w docs nie jest aktywny.
4. Uruchomić `python scripts/audit.py --production`. Obecnie ten test słusznie nie przechodzi: blokady są celowe. Nie ma skryptu automatycznie odblokowującego indeksację.
5. Sprawdzić odpowiedzi HTTP, brak dodatkowego X-Robots-Tag noindex z hostingu, zgodność końcowych URL z canonical/OG/sitemap, HTTPS i jeden wariant domeny. Jeśli hosting zmienia `.html` na adresy bez rozszerzeń, wybrać jedną konwencję i ujednolicić wszystkie sygnały przed startem.
6. Ustawić 301 z /index.html do / oraz, jeśli stare adresy ze spacjami kiedykolwiek były publiczne, ze starych URL do nowych. Tu nie skonfigurowano hostingu ani przekierowań.
7. Publiczny katalog powinien zawierać tylko gotowe HTML i używane CSS/JS/assets/robots/sitemap. Nie kopiować docs, scripts, kopii, raportów ani pustych plików. GitHub może przechowywać dokumentację; katalog publiczny hostingu nie powinien jej ujawniać.

Blokada robots **nie jest zabezpieczeniem dostępu ani gwarancją braku URL w wynikach**.
Robot zablokowany przez Disallow nie odczyta noindex. Nie wystawiać poufnego
podglądu publicznie; do publicznego stagingu potrzebna jest kontrola dostępu.
Wyjaśnienie: https://developers.google.com/search/docs/crawling-indexing/block-indexing.

## Font i grafiki

Wszystkie strony używają lokalnego Manrope. Audyt skorygował wcześniejszy błędny
opis: starszy kod zawierał dwa fonty WOFF2 osadzone jako base64 w CSS. Wyjęto je
do osobnych plików, zachowując identyczne dane fontów, nazwy rodzin i podzbiory.
Zmniejsza to arkusz i umożliwia osobne cache fontów; dodano preload na czterech
korzystających z nich stronach. Nowy pakiet zachowuje istniejący plik TTF i preload.
Licencja OFL jest w assets/fonts; brak połączeń z Google Fonts.

Przed startem zatwierdzić finalną grafikę Open Graph i favicon. Cztery główne
strony mają komplet podstawowych OG oprócz obrazu. Nie ma pustego og:image
ani odwołania do pustego favicon.svg. Po zatwierdzeniu grafiki dodać poprawny
absolutny og:image, alt, wymiary i typ oraz sprawdzić podgląd udostępnienia.
`href="data:,"` to techniczne wyciszenie żądania ikony, nie finalny favicon.

Po wdrożeniu sprawdzić kompresję Brotli/gzip, cache, rzeczywiste LCP/CLS/INP
na telefonie, wolniejszym łączu i zimnym cache. Lokalny audyt nie nadaje
punktacji Lighthouse ani nie potwierdza terenowych Core Web Vitals.

Przestrzenne elementy to autorskie kształty SVG/CSS, nie fotografie ani realizacje klientów. Brak stocków i fikcyjnego portfolio.

## Źródła do przeglądu prawnego

- RODO, zwłaszcza art. 5, 6, 12–22 i 32: https://eur-lex.europa.eu/legal-content/PL/TXT/?uri=CELEX%3A32016R0679
- Prawa osób, UODO: https://uodo.gov.pl/pl/493/2254
- Retencja, UODO: https://uodo.gov.pl/pl/676/4260
- Ustawa o świadczeniu usług drogą elektroniczną, art. 5–8: https://eli.gov.pl/api/acts/DU/2024/1513/text.html
- Prawo komunikacji elektronicznej, art. 399: https://eli.gov.pl/api/acts/DU/2024/1221/text.html
- Prawo autorskie, art. 41 i 53: https://api.sejm.gov.pl/eli/acts/DU/2025/24/text.pdf
- Kodeks cywilny, w tym ochrona części przedsiębiorców i forma elektroniczna: https://api.sejm.gov.pl/eli/acts/DU/2026/795/text.pdf

Nie rozpoczęto GitHuba, hostingu, Search Console, chatbota, faviconu ani stopki e-mail.
