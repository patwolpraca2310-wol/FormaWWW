# FormaWWW

Statyczna strona usługowa marki FormaWWW dla polskich firm. Domena docelowa:
https://formawww.pl/. HTML, CSS i JavaScript, bez frameworków, zewnętrznych
skryptów, procesu budowania ani zależności produkcyjnych.

## Stan: 2026-10-11

Zakończony podstawowy etap projektowy: Strona główna, Oferta, Kontakt,
Dziękujemy, O FormaWWW, Polityka prywatności, Regulamin i 404.
Audyt techniczny i jego poprawki oczekują na ocenę właściciela.
Akceptacja wyglądu nie oznacza uruchomienia serwisu ani zatwierdzenia prawnego.

**To nadal podgląd lokalny.** Wysyłka formularza nie działa. `robots.txt`
ma `Disallow: /`, wszystkie osiem stron ma lokalne `noindex, follow`.
Gotowość kodu do GitHuba nie oznacza gotowości do publicznego wdrożenia.
Nie skonfigurowano zdalnego repozytorium, hostingu ani Search Console.

## Pliki

```text
index.html
oferta.html
kontakt.html
dziekujemy.html
o-formawww.html
polityka-prywatnosci.html
regulamin.html
404.html
css/style.css
css/responsive.css
js/main.js
assets/fonts/Manrope-latin.woff2
assets/fonts/Manrope-latin-ext.woff2
assets/fonts/Manrope-variable.ttf
assets/fonts/Manrope-OFL.txt
sitemap.xml
robots.txt
scripts/audit.py
docs/brief.md
docs/design-system.md
docs/status-podstron.md
docs/historia-zmian.md
docs/audyt-techniczny.md
docs/przed-publikacja.md
docs/robots.production.txt
.gitignore
```

`realizacje.html`, `metamorfozy.html` i `favicon.svg` to nadal puste, nieużywane
pliki robocze. Nie są linkowane i **nie mogą trafić do paczki publicznej**.
Puste katalogi zasobów są rezerwą; Git nie śledzi pustych katalogów.
Poprzednie nazwy ze spacjami zastąpiono docelowymi adresami z myślnikami.

## Lokalny podgląd

W katalogu projektu, mając Python 3:

```powershell
python -m http.server 4173 --bind localhost
```

Otwórz http://localhost:4173/. Jeżeli ten port już obsługuje projekt,
nie uruchamiaj drugiego serwera. Zakończ serwer skrótem Ctrl+C w jego terminalu.
Nie są wymagane `npm install` ani narzędzia bundlujące.

## Powtarzalna kontrola techniczna

```powershell
python scripts/audit.py
node --check js/main.js
```

Python sprawdza lokalne linki, zasoby, kotwice, ID/ARIA, nagłówki, metadane,
menu, formularz, sitemapę i blokadę podglądu. Nie zastępuje testu w przeglądarce,
pełnego walidatora W3C, czytnika ekranu ani audytu WCAG.
Node jest potrzebny tylko do opcjonalnego sprawdzenia składni JS, nie do strony.

`python scripts/audit.py --production` to kontrola przed publikacją: obecnie
**ma zgłaszać błędy** z powodu celowego `noindex` i blokady robots. Niczego
nie zmienia, nie przełącza trybu i nie publikuje.

## Formularz

Formularz jest częścią `kontakt.html`. Stałe etykiety, natywne kontrolki,
walidacja po próbie wysłania, zachowanie danych, honeypot i blokada ponownego
submit. Pusty `delivery.endpoint` w `js/main.js` oznacza tryb demonstracyjny:
walidacja pokazuje informację o nieaktywnej wysyłce i nie otwiera Dziękujemy.
Bez JavaScriptu przycisk pozostaje wyłączony, a dane kontaktowe dostępne.

Przyszły endpoint POST JSON musi działać pod tym samym originem; odbiorcę
`patryk.woloszyn@formawww.pl` ustala serwer. Dopiero odpowiedź HTTP 2xx
z `{ "accepted": true }` uruchamia przejście na `dziekujemy.html`.
Błędy pól: HTTP 422 z `{ "errors": { "email": "Komunikat" } }`.
Walidacja serwerowa, antyspam, limity i bezpieczne dostarczenie wiadomości
są zadaniem etapu wdrożenia. W frontendzie nie ma sekretów ani danych SMTP.

## Zasoby i wygląd

Fonty są lokalne, na licencji SIL OFL. Cztery pierwsze widoki używają Manrope
WOFF2; O FormaWWW, dokumenty prawne i 404 zachowują własny dotychczasowy
plik Manrope TTF. Nie podmieniono krojów ani kształtu liter.
Przestrzenne formy powstają w SVG/CSS; nie są materiałami klientów.
Nie dodano analityki, chatbota, cookies ani zewnętrznych żądań fontów.

## Wdrożenie dopiero po osobnej decyzji

Dokładna lista: [docs/przed-publikacja.md](docs/przed-publikacja.md).
`docs/robots.production.txt` to **nieaktywny szablon**, nie zastępuje robots
w katalogu głównym. Mapa zawiera sześć docelowych adresów, ale jej obecność
nie otwiera indeksowania. 404 i Dziękujemy pozostają noindex także po starcie.

Do publicznego katalogu wdrożenia kopiować wyłącznie osiem gotowych HTML,
CSS, JS, używane zasoby, sitemapę i właściwy robots. Dokumentacji, skryptów,
raportów, kopii oraz pustych plików roboczych nie publikować. Przed startem
ustalić przekierowanie `/index.html` do `/`, wariant domeny HTTPS oraz prawdziwy
status HTTP 404. Nie zakładać, że hosting automatycznie zachowa adresy `.html`.

## Zasady pracy

Nie zmieniać zaakceptowanego designu ani treści bez wyraźnej potrzeby.
Większe zmiany wspólnych komponentów uzgadniać. Nie rozpoczynać kolejnego
etapu bez decyzji właściciela. Historia akceptacji i zmian jest w `docs/`.
