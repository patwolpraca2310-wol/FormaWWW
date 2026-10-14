# Design system FormaWWW

Stan dokumentacji po audycie: 2026-10-11. Design został już zaakceptowany;
wcześniejszy zapis o pustej bazie był nieaktualny. Ten plik opisuje istniejący
stan, nie ustanawia nowego kierunku wizualnego.

- Ciemna zieleń `#182920`, limonka `#ddf39b`, kobalt `#304adc`, ciepłe jasne tło `#f2f0e8`.
- Lokalny Manrope, płynna typografia, przestrzenne formy SVG/CSS.
- Wspólne menu, stopka, focus, skip link; reguły podstron ograniczone klasą body.
- Używane fonty zachowują dotychczasowe pliki: starsze widoki — dwa podzbiory WOFF2, pakiet O FormaWWW/prawne/404 — plik zmienny TTF.
- Breakpointy i kompozycje pozostają w css/style.css i css/responsive.css.
- Jednorazowe, lekkie animacje; obsługa prefers-reduced-motion; treści widoczne bez JS.

Nie zmieniono zaakceptowanych kolorów, typografii, kompozycji ani marketingu
w ramach audytu. Pełne skatalogowanie komponentów może powstać w osobnym etapie.
