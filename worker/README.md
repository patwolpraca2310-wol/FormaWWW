# Formularz FormaWWW — Worker + Resend

Stan: kod przygotowany lokalnie, wysyłka wyłączona. Bez wdrożenia, zmian DNS, commit/push i prawdziwej wysyłki. Instrukcja: [DEPLOYMENT.md](DEPLOYMENT.md).

## Architektura

GitHub Pages (`kontakt.html`) → HTTPS POST `/contact` na Workerze → walidacja, honeypot, limity → rezerwacja D1 → HTTPS Resend API → skrzynka OVH `patryk.woloszyn@formawww.pl`.

Transport to natywny fetch do stałego `https://api.resend.com/emails`, bez SDK i bez bindingu EMAIL. Nie używamy Cloudflare Email Sending, SMTP ani płatnego planu Workers. Odbiorca jest stałą backendu i nie może być podany przez użytkownika.

- From: `FormaWWW <formularz@send.formawww.pl>`.
- Reply-To: zwalidowany adres autora formularza, pole REST `reply_to`.
- To: `patryk.woloszyn@formawww.pl`.
- Plain text, bez interpretowania HTML użytkownika; temat ze stałej listy usług.
- `RESEND_API_KEY`: wyłącznie Secret Workera, nagłówek Bearer do Resend. Przekierowania transportu są zabronione.
- `Idempotency-Key`: prefiks `formawww-` i HMAC zgłoszenia, bez surowego e-maila i treści.

HTTP 2xx z niepustym `id` od Resend oraz zapis statusu D1 dają `{accepted:true}`. Dopiero wtedy frontend przechodzi na `dziekujemy.html`. To potwierdzenie przyjęcia, nie gwarancja dostarczenia do Odebranych; należy sprawdzić Resend i OVH/Spam. [API wysyłki](https://resend.com/docs/api-reference/emails/send-email).

## Ustawienia

| Element | Wartość / miejsce |
| --- | --- |
| `FORM_ENABLED` | Jawna zmienna, obecnie `"false"`. |
| `FROM_EMAIL` | `formularz@send.formawww.pl`; przed wysyłką wymaga zweryfikowanej domeny Resend. |
| `ALLOWED_ORIGINS` | `https://formawww.pl`, bez końcowego `/` i wildcard. |
| `RESEND_API_KEY` | Secret Cloudflare; klucz Resend Sending access ograniczony do subdomeny. |
| `ABUSE_SECRET` | Secret Cloudflare, minimum 32 losowe znaki; zachowaj istniejącą wartość między wdrożeniami. |
| `CONTACT_DB` | D1 `formawww-contact`, rzeczywiste ID do uzupełnienia. |
| `REQUEST_LIMITER` | 5 prób/60 s, osobne klucze IP i e-mail. |
| `SITE_LIMITER` | 30 prób/60 s w lokalizacji Cloudflare. |
| Cron | `17 * * * *`, usuwa wygasłe rezerwacje. |
| Endpoint frontendu | `data-contact-endpoint` w kontakt.html; nadal `https://REPLACE-ME.invalid/contact`. |

Brak sekretu lub niepoprawny format klucza zamyka wysyłkę (503). Format nie potwierdza uprawnień ani ważności klucza — sprawdzi je API. Klucza nie zapisujemy nawet w ignorowanym pliku `.dev.vars`; wzór `.dev.vars.example` zawiera wyłącznie placeholdery. Nie ma klucza SMTP OVH.

## Zabezpieczenia zachowane

- JSON POST, limit 32 KiB i 5 s na body, dozwolone pola/usługi, typy, długości, wymagane dane, e-mail, URL HTTP(S), telefon, znaki sterujące, honeypot `fax_number`. Minimum wiadomości: 10 znaków.
- Parametry SQL wiązane; URL użytkownika nie jest pobierany. CORS dopuszcza dokładne originy, ale nie jest uwierzytelnieniem ani kompletnym antybotem. Nie ma cookies, CAPTCHA ani automatycznych ponowień.
- IP z platformowego `CF-Connecting-IP`. Klucze limitów są HMAC. Limity lokalne i przybliżone, nie globalny limit kosztu; wspólne IP może ograniczyć kilku użytkowników.
- D1 zawiera HMAC zgłoszenia, status, właściciela rezerwacji i datę wygaśnięcia; bez treści, imienia, surowego e-maila i IP. To metadane pseudonimowe. Wygasają po 24 h, godzinowy Cron usuwa je zwykle do około 25 h. Retencja kopii bazy i dostawców jest odrębna.
- Atomowa rezerwacja: `sent` zwraca sukces bez nowego maila; `pending`/`uncertain` blokuje ponowienie; `failed` dopuszcza ponowną próbę po jednoznacznym odrzuceniu. Zmiana treści, sekretu, usunięcie rezerwacji lub upływ okresu ochrony dopuszcza nowe zgłoszenie. Nie jest to bezwarunkowe exactly-once SMTP.

Resend dodatkowo rozpoznaje identyczny klucz przez 24 h. D1 pozostaje podstawową blokadą; nie przebudowano schematu. [Idempotencja Resend](https://resend.com/docs/dashboard/emails/idempotency-keys).

## Błędy i timeouty

| Wynik API | Zachowanie |
| --- | --- |
| 2xx i niepusty `id` | Zapis `sent`, następnie sukces. |
| 400/401/403/404/405/413/422/429 | `failed`, komunikat `delivery_failed`, bez automatycznej ponownej próby. |
| 408/409/5xx, błąd sieci, zły JSON, brak `id` | `uncertain`, `delivery_unknown`, bez ponowienia. |
| Błąd D1 po przyjęciu przez Resend | Brak fałszywego sukcesu; rezerwacja pozostaje. |

429 Resend może oznaczać limit dzienny/miesięczny — nie obiecujemy, że próba za minutę się powiedzie. Osobne limity formularza nadal zwracają 429 i `Retry-After: 60`. Szczegółów błędów API nie zwracamy ani nie logujemy. [Błędy API](https://resend.com/docs/api-reference/errors).

Timeout odpowiedzi Workera pozostaje 10 s, przeglądarki 20 s. Transport HTTP ma dodatkowy limit 15 s obejmujący też odczyt odpowiedzi, po którym następuje abort. Późne potwierdzenie pomiędzy 10 a 15 s może zapisać się przez `waitUntil`; użytkownik wcześniej dostaje informację o niepewności. Nie kasuj rezerwacji po timeoutach bez sprawdzenia Resend i OVH.

Frontend, wygląd, etykiety, focus, blokada przycisku i zachowanie danych po błędzie pozostają bez zmian. Dane zostają w otwartym formularzu, ale nie są utrwalane po zamknięciu/odświeżeniu strony. Nie używamy mailto jako transportu.

## Testy

Node 22.13+, z katalogu worker:

```powershell
npm.cmd test
npm.cmd run check
```

SQLite działa w pamięci, sieć Resend i usługi Cloudflare są atrapami. Testy nie wysyłają maili. Obejmują transport REST, sekrety, idempotencję, błędy, abort, opóźnione wyniki, D1, CORS, walidację, honeypot, zachowanie danych i przekierowanie.

`check:deployment` wymaga prawdziwego ID D1. `check:activation` dodatkowo wymaga FORM_ENABLED=true i końcowego endpointu. Kontrole nie odczytują sekretów ani konta. Ręczny `check:endpoint` wysyła wyłącznie OPTIONS i `{}` — nie jest testem dostarczalności.

## Eksploatacja

Pozostajemy na Workers Free. Sprawdź limity darmowych usług Workers/D1 i wybranego planu Resend; ich przekroczenie może zatrzymać formularz. Nie jest to zgoda na upgrade.

Przed aktywacją zaktualizuj informacje o przetwarzaniu przez Cloudflare, Resend i OVH, retencji i ewentualnych transferach danych. Dokumenty prawne pozostają nietknięte. Wyłącz tracking otwarć i kliknięć w Resend.

Nie loguj body, nagłówka Authorization, sekretów i treści błędów dostawcy. Logi platformy mogą zawierać metadane. Przy braku wiadomości sprawdź domenę, ważność klucza, limity, Resend Emails/Logs, bounce/suppression i Spam OVH. Przyjęcie przez API nie wyklucza późniejszego odbicia.

Nie publikuj lokalnych sekretów ani kopii bezpieczeństwa. Katalog worker nie jest statycznym artefaktem Pages. DNS, komendy i kroki wymagające zgody: [DEPLOYMENT.md](DEPLOYMENT.md).
