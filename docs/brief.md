# Brief projektu FormaWWW

## Marka, odbiorcy i cel

- Marka: FormaWWW.
- Domena docelowa: formawww.pl.
- Odbiorcy: głównie polskie firmy potrzebujące nowej strony internetowej lub modernizacji obecnej.
- Cel: pozyskiwanie klientów na tworzenie i modernizację stron internetowych.
- Folder projektu: C:\Users\Patryk\Desktop\Kody strona  - FormaWWW (dwie spacje po słowie „strona”).

## Zakres usług

1. Tworzenie nowych stron internetowych od zera.
2. Modernizacja i redesign istniejących stron.
3. Opieka i rozwój stron internetowych.
4. SEO i optymalizacja techniczna.
5. Prowadzenie oraz rozwój treści i bloga.

## Planowane główne podstrony

| Podstrona | Plik |
| --- | --- |
| Strona główna | index.html |
| Oferta | oferta.html |
| Realizacje | realizacje.html |
| Metamorfozy stron | metamorfozy.html |
| O FormaWWW | o-formawww.html |
| Kontakt | kontakt.html |

Każda główna podstrona ma osobny plik HTML.
Nie tworzymy osobnych arkuszy CSS dla każdej podstrony bez wyraźnej potrzeby.
Cała witryna korzysta ze wspólnego design systemu.

## Proces i akceptacja

Nie tworzymy całej witryny jednocześnie.

Dla każdej podstrony:
1. Przygotować koncepcję wizualną i funkcjonalną.
2. Opisać sekcje, układ, hierarchię treści, CTA, proponowane grafiki, animacje i zachowanie na telefonie.
3. Przygotować podgląd działającej wersji lokalnej, jeśli jest to możliwe.
4. Pokazać pierwszą wersję i czekać na uwagi.
5. Wprowadzać poprawki aż do wyraźnego potwierdzenia akceptacji przez użytkownika.
6. Dopiero po tym oznaczyć kod danej podstrony jako zatwierdzony i przejść do uzgodnienia kolejnej.

Nie domniemywać akceptacji na podstawie braku uwag.
Nie podejmować samodzielnie decyzji o zakończeniu projektu.
Zatwierdzona jest wyłącznie struktura projektu.
Strona główna i pozostałe podstrony wymagają osobnego polecenia rozpoczęcia prac.

## Kierunek wizualny

Nowoczesne studio webowe: minimalistyczne, premium, czytelne, lekkie wizualnie, profesjonalne B2B, responsywne, szybkie i spójne.

Unikać wyglądu starego WordPressa, taniego gotowego szablonu, typowej strony freelancera, przeładowanej agencji marketingowej i strony wyglądającej na automatycznie wygenerowaną.

Zadbać o:
- dużą, nowoczesną typografię i bardzo dobrą hierarchię informacji;
- kontrolowaną przestrzeń, czytelne CTA i nowoczesne karty usług;
- subtelne animacje, mikrointerakcje i płynne przejścia wspierające odbiór;
- profesjonalną prezentację portfolio i porównań przed/po;
- wysoką jakość UX i dopracowany mobile.

Kolorystyka, fonty, layout i wartości design systemu pozostają do ustalenia.
Nie przesadzać z animacjami.

## Obrazy i grafiki

Nie wybierać ostatecznych obrazów bez konsultacji.
Jeżeli sekcja potrzebuje obrazu, użyć materiału tymczasowego lub placeholdera, opisać proponowany rodzaj obrazu i uzasadnić jego zastosowanie.
Po podglądzie wspólnie ustalić: pozostawienie propozycji, poszukiwanie innej, generowanie własnej grafiki lub użycie portfolio.
Unikać przypadkowych stockowych zdjęć ludzi przy laptopach bez konkretnego uzasadnienia.
Przykładowych materiałów nie przedstawiać jako prawdziwych realizacji.
Na etapie struktury nie dodawać grafik ani placeholderów graficznych.

## SEO, wydajność i dostępność

Od początku implementacji uwzględniać:
- semantyczny HTML oraz poprawną hierarchię H1, H2 i H3;
- czytelne adresy i dobre linkowanie wewnętrzne;
- meta title, meta description, Open Graph i canonical;
- schema.org tam, gdzie ma uzasadnienie;
- sitemapę i robots.txt;
- szybkość, Core Web Vitals, dostępność i responsywność.

Nie upychać słów kluczowych sztucznie.
Finalne adresy i metadane zostaną przygotowane w etapach implementacji, nie podczas tworzenia struktury.
Do sitemap.xml dodawać tylko strony gotowe do publikacji.
Robocze ustawienia indeksowania wymagają przeglądu przed publikacją.

## Technologia i organizacja kodu

Preferowany stack: HTML, CSS, JavaScript.
Lekka strona statyczna, możliwa do bezpłatnego hostowania, docelowo GitHub i Cloudflare Pages.
Bez zbędnych frameworków, bibliotek i zależności.
Przed dodaniem biblioteki wyjaśnić jej realną korzyść.
Kod czytelny, modularny, dobrze nazwany i łatwy do rozwijania.

Wspólne style: css/style.css i css/responsive.css.
Wspólne zachowania: js/main.js.
Dodatkowe moduły dopiero przy uzasadnionej potrzebie.
Materiały projektów przechowywać w osobnych podfolderach portfolio lub metamorfozy.
Treści portfolio i metamorfoz mają korzystać z powtarzalnej struktury umożliwiającej łatwe dodawanie realizacji.

## Mobile i weryfikacja

Responsywność uwzględniać od pierwszej wersji.
Każdą podstronę przed akceptacją sprawdzić na desktopie, tablecie i telefonie.
Nie traktować mobile jako dodatku na końcu projektu.

## Formularz kontaktowy

Docelowo przewidywane pola:
- imię;
- firma;
- e-mail;
- telefon;
- adres obecnej strony;
- rodzaj usługi;
- wiadomość.

Ostateczne pola, wymagania i sposób wysyłki pozostają do ustalenia.
Na tym etapie nie implementować zewnętrznych płatnych usług formularzy.

## Kontrola zmian

Nie nadpisywać bez potrzeby zaakceptowanych elementów.
Przed większą zmianą wspólnego CSS, JS, nagłówka, stopki lub innego używanego komponentu poinformować użytkownika.
Rejestrować postęp i akceptacje w docs/status-podstron.md, a zmiany w docs/historia-zmian.md.

## Raport po każdym etapie

Raport w języku polskim powinien zawierać:
1. Co wykonano.
2. Jakie pliki utworzono lub zmieniono.
3. Jak uruchomić podgląd.
4. Co ocenić wizualnie.
5. Jakie decyzje pozostają do podjęcia.
6. Gdzie użyto grafik lub placeholderów.
7. Co może wymagać poprawy.
8. Jaki powinien być następny krok.

## Zakres etapu tworzenia struktury

Utworzyć zatwierdzone foldery, dokumentację, .gitignore i puste pliki HTML, CSS, JS oraz rezerwację favicon.svg.
robots.txt i sitemap.xml pozostawić jako oznaczone wersje robocze.
Nie dodawać treści marketingowych, sekcji, finalnych metadanych, grafik, animacji ani layoutu.
Po raporcie zatrzymać prace i czekać na zatwierdzenie oraz kolejne polecenie użytkownika.
