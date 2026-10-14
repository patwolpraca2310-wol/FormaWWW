# Historia zmian FormaWWW

## 2026-10-11 — audyt techniczny przed GitHubem i wdrożeniem

- Użytkownik potwierdził zakończenie podstawowego etapu projektowego. Wynik audytu nadal oczekuje na jego akceptację.
- Uporządkowano docelowe nazwy o-formawww.html i polityka-prywatnosci.html, linki, canonicale i OG; stare nazwy ze spacjami wycofano z katalogu serwisu z zachowaniem kopii.
- Sześć stron treściowych ma identyczne główne pozycje menu i wskazanie bieżącej strony. Użytkowe 404/Dziękujemy zachowują uproszczony widok.
- Sitemap: sześć docelowych adresów, bez 404/Dziękujemy i pustych plików. Robots.txt niezmieniony; wszystkie gotowe strony lokalnie noindex, follow. Produkcyjny robots przygotowano wyłącznie jako nieaktywny szablon dokumentacji.
- Dodano AboutPage JSON-LD i skip link na Dziękujemy. OG bez losowego obrazu; favicon pozostaje do osobnego etapu.
- Wyodrębniono istniejące WOFF2 z base64 w CSS bez modyfikacji fontów, dodano preload, usunięto nieużywany CSS dawnego dialogu i dwa nieużywane style pomocnicze.
- Główny CSS 119 314 → 60 440 B; JS bez zmian. Wszystkie żywe reguły CSS i treści main zweryfikowano względem kopii bazowej.
- Test responsywności: 8 stron × 7 szerokości (1440/1366/1024/768/390/375/320), bez poziomego scrolla i wystających treści. Testy menu/skip linków/FAQ/radio/spisu treści oraz formularza opisano w audycie.
- Lokalne zasoby i strony odpowiadają poprawnie; konsola bez błędów. Prawdziwy routing 404 i HTTP nagłówki należą do etapu hostingu.
- Wysyłka nieaktywna; prawdziwego endpointu nie wybrano ani nie uruchomiono. Nie ma udawanej dostawy lub przekierowania po samej walidacji.
- Zaktualizowano README, statusy, dokumentację systemu i publikacji. Skorygowano błędny wcześniejszy opis braku Manrope w starszym kodzie — fonty były osadzone w CSS.
- Dodano powtarzalny skrypt scripts/audit.py (Python standard library), który wyłącznie sprawdza pliki. Tryb --production nie odblokowuje witryny.
- Dokumenty prawne i marketing bez merytorycznych zmian. Nie uruchomiono GitHuba, hostingu, Cloudflare, Search Console, analityki, chatbota ani stopki e-mail.
- Pełne wyniki, ograniczenia i lista przed publikacją: docs/audyt-techniczny.md oraz docs/przed-publikacja.md.

## 2026-10-11 — struktura projektu

- Użytkownik zatwierdził docelową strukturę folderów i plików.
- Utworzono foldery zasobów, CSS, JavaScript i dokumentacji.
- Utworzono README.md, brief, bazę design systemu i rejestr statusów.
- Dodano .gitignore oraz puste pliki HTML, CSS, JavaScript i favicon.svg.
- Dodano robocze robots.txt i sitemap.xml bez finalnych adresów.
- Wszystkie podstrony mają status „nie rozpoczęto”.
- Nie rozpoczęto projektowania, implementacji sekcji ani tworzenia treści marketingowych.
- Nie zainicjalizowano repozytorium Git ani wdrożenia.
- Etap utworzenia struktury oczekuje na ocenę użytkownika.

## 2026-10-11 — uzupełnienie rejestru akceptacji i pakiet podstawowy

- Zapisano potwierdzone przez użytkownika akceptacje homepage, Oferty, Kontaktu oraz obecnego etapu obejmującego Dziękujemy. Wcześniejszy rejestr nie był aktualizowany po implementacjach; nie zmieniono historycznego wpisu o początkowej strukturze.
- Przygotowano o formwww.html, polityka prywatnosci.html, regulamin.html i 404.html. Wszystkie cztery: wykonane do oceny, NIE zaakceptowane.
- O FormaWWW: przestrzenny motyw prześwitu, podejście do projektowania, UX/mobile/SEO/wydajność, zasady współpracy i rozwój; bez fikcyjnej historii, wyników lub klientów.
- Dokumenty prawne: osobne okładki, spis treści, czytelna kolumna, druk; oznaczona wersja robocza i braki operacyjne.
- 404: „Ta strona wypadła z formy.”, powrót do homepage i Oferty; bez dodatkowych bloków sprzedaży.
- Zaakceptowane kompozycje homepage/Oferty zachowano. Zmieniono jedynie menu/stopki/linkowanie; usunięto nieużywany dialog i nieaktualną informację o niegotowym Kontakcie.
- Kontakt: dodano dane adresowe, NIP i REGON pod istniejącymi danymi oraz link do roboczej polityki przy formularzu. Wygląd/formularz/wysyłka bez przebudowy.
- Dziękujemy i js/main.js bez zmian.
- Nowe style są ograniczone do nowych klas stron; font Manrope jest lokalnym zasobem nowych stron. Dawne widoki zachowują dotychczasowy stos fontów, aby nie zmienić zaakceptowanego wyglądu.
- Sitemap uzupełniono o podstawowe adresy informacyjne. Nie zawiera 404, Dziękujemy, pustych stron ani roboczych dokumentów noindex.
- robots.txt nadal blokuje indeksowanie całego projektu przed publikacją; o formwww.html ma docelowo index, follow. Nie uruchomiono hostingu.
- Dokładna lista otwartych kwestii i źródeł prawnych: docs/przed-publikacja.md.
- Nie uruchomiono GitHuba, hostingu, Search Console, chatbota, faviconu ani stopki e-mail.

### Kontrola końcowa pakietu

- Wszystkie 4 nowe strony sprawdzono w przeglądarce przy 1440, 1366, 768, 390 i 320 px: szerokość dokumentu równa szerokości obszaru treści, bez poziomego przewijania.
- Po kontroli wizualnej skorygowano położenie ozdobnej formy w mobilnej polityce, aby nie wchodziła na tekst.
- Kontrola lokalnych linków, zasobów i kotwic w 8 niepustych stronach: brak odnośników do pustych lub nieistniejących plików, brak brakujących identyfikatorów ARIA i duplikatów ID.
- Po jednym H1, unikalne tytuły, opisy i canonical. 404 oraz Dziękujemy poza sitemap. Robocze dokumenty prawne pozostają noindex.
- Konsola przeglądarki bez błędów/ostrzeżeń podczas kontroli. JavaScript przeszedł sprawdzenie składni i nie był zmieniany.
- Test klawiatury: menu mobilne, Escape z powrotem focusu, otwieranie/zamykanie spisu treści. Sprawdzono kotwicę do praw użytkownika, stopki i powrót z 404.
- Kontrola kontrastu wybranych widocznych tekstów/odnośników wszystkich nowych stron: bez wykrytych odstępstw dla progów 4,5:1 oraz 3:1 dla dużego tekstu. To nie jest pełny audyt WCAG ani test czytnikiem ekranu.
- Treści nowych stron są statyczne i nie wymagają JS; działanie bez JS i reduced-motion zweryfikowano w kodzie, bez emulacji tych trybów przeglądarki.
- Regresja: treść main homepage/Oferty niezmieniona poza usunięciem nieużywanego atrybutu kontaktowego. Poprzednie reguły CSS pozostają zachowane, Dziękujemy i JS identyczne bajtowo. Dodatkowo sprawdzono istniejące strony przy 1440, 390 i 320 px.
- Brak pomiaru rzeczywistych Core Web Vitals po hostingu; nie deklaruje się punktacji Lighthouse. Nowe strony nie dodają bibliotek ani zewnętrznych żądań do usług.
- Raport wizualny: PDF, 9 stron — przegląd i 8 pełnych widoków desktop/mobile. Zweryfikowano wyrenderowane strony PDF. Plik raportu znajduje się w folderze roboczym zadania output/pdf, nie w katalogu publicznego serwisu.

