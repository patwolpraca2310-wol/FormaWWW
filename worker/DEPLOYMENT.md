# Wdrożenie: GitHub Pages → Worker Free → Resend → OVH

Ta instrukcja zastępuje wersję dla Cloudflare Email Sending. Nie używamy bindingu EMAIL ani płatnego planu Workers. Wysyłka pozostaje wyłączona, ID D1 i endpoint frontendu są placeholderami. Niczego nie wdrożono, nie zmieniono DNS, nie wykonano commit/push ani prawdziwego testu maila. Etapy zdalne wymagają osobnej zgody.

## 1. Resend — konto i subdomena

1. Załóż konto Resend, potwierdź e-mail i włącz MFA. Pozostań na wybranym darmowym planie; sprawdź aktualne limity i ewentualną potrzebę zatwierdzenia konta do wysyłki produkcyjnej.
2. **Domains → Add domain**: dodaj dokładnie `send.formawww.pl`, nie domenę główną. Wybierz region wysyłki, np. dostępny europejski; nie jest to gwarancja przetwarzania wszystkich danych tylko w UE.
3. Włącz wyłącznie wysyłanie. **Receiving/Inbound wyłączone**, tracking otwarć i kliknięć również. Skrzynka pozostaje w OVH.
4. Pozostaw domyślny return-path `send`, którego dotyczy tabela poniżej. Wybierz ręczne dodanie DNS. Nie nadawaj automatycznego dostępu do strefy bez osobnej decyzji.

## 2. DNS w Cloudflare

Po aktywacji strefy i sprawdzeniu strony oraz poczty OVH otwórz **formawww.pl → DNS → Records**. Przy domenie nadawczej `send.formawww.pl` i domyślnym return-path oczekiwane mapowanie to:

| Typ | Name w Cloudflare | Pełna nazwa | Content / ustawienia |
| --- | --- | --- | --- |
| TXT DKIM | `resend._domainkey.send` | `resend._domainkey.send.formawww.pl` | Indywidualny klucz DKIM z panelu Resend; TTL Auto. |
| TXT SPF | `send.send` | `send.send.formawww.pl` | Dokładna wartość z Resend; typowo `v=spf1 include:amazonses.com ~all`; TTL Auto. |
| MX bounce | `send.send` | `send.send.formawww.pl` | Serwer z Resend dla wybranego regionu; zwykle `feedback-smtp.<region>.amazonses.com`; priorytet z panelu, typowo 10; TTL Auto. |

`send.send` jest celowe: pierwsze send oznacza return-path, drugie należy do subdomeny nadawcy. Nie wpisuj tych rekordów pod `@` ani nie przenoś ich pod samo `send`.

**Indywidualny DKIM i regionalny serwer MX nie są jeszcze znane.** Skopiuj je dopiero z własnego panelu; nie wpisuj `<region>` ani przykładowych kluczy. Panel jest źródłem prawdy również dla selektora, liczby i typu rekordów. Przy zmianie return-path zmienią się nazwy. [DNS Resend w Cloudflare](https://resend.com/docs/guides/dns/cloudflare), [domyślny return-path](https://resend.com/changelog/custom-return-path).

Nowy MX dotyczy tylko zwrotów pod `send.send.formawww.pl`. **Nie zmieniaj istniejących MX OVH, SPF/DKIM/DMARC domeny głównej ani rekordów GitHub Pages.** Nie dodawaj MX Receiving Resend. W razie istniejącego rekordu pod nową nazwą najpierw sprawdź konflikt; nie nadpisuj go. TXT/MX nie są proxy HTTP; ewentualny dodatkowy CNAME ustaw jako DNS only.

DMARC: sprawdź dziedziczoną politykę domeny głównej. Ewentualny TXT `_dmarc.send.formawww.pl` wymaga osobnego uzgodnienia, nie automatycznego osłabienia ochrony. Nie jest potrzebny rekord A/AAAA ani strona WWW pod subdomeną.

W Resend kliknij **Verify DNS Records** i poczekaj na **Verified**. Active w Cloudflare nie zastępuje tej weryfikacji. Nie trzeba tworzyć skrzynki `formularz@send.formawww.pl` w OVH; odpowiedź na zgłoszenie kieruje Reply-To autora.

## 3. Sekrety

W Resend: **API Keys → Create API Key**, nazwa np. `FormaWWW contact`, uprawnienie **Sending access**, ograniczenie do `send.formawww.pl`. Nie używaj Full access bez potrzeby. Klucz umieść wyłącznie w Cloudflare Worker Secrets, nie w repozytorium, `.dev.vars` ani na czacie. [Zarządzanie kluczami](https://resend.com/docs/dashboard/api-keys/introduction).

| Secret Workera | Wartość |
| --- | --- |
| `RESEND_API_KEY` | Rzeczywisty klucz Resend o ograniczonych uprawnieniach. |
| `ABUSE_SECRET` | Minimum 32 losowe znaki; jeśli już istnieje, zachowaj go. Zmiana wpływa na ochronę przed powtórzeniami. |

Jawne ustawienia w konfiguracji: `FROM_EMAIL=formularz@send.formawww.pl`, `ALLOWED_ORIGINS=https://formawww.pl`, `FORM_ENABLED=false` i ID bazy. Nadawca jest już ustawiony lokalnie, ale to nie potwierdza weryfikacji Resend. Nie potrzeba SMTP OVH.

## 4. Komendy — etapami, po osobnych zgodach

### Lokalnie

```powershell
Set-Location -LiteralPath 'C:\Users\Patryk\Desktop\Kody strona  - FormaWWW\worker'
npm.cmd test
npm.cmd run check
```

### Logowanie i D1

Wrangler 4, minimum 4.36.0 dla limiterów. `npx` może poprosić o pobranie narzędzia. Potwierdź właściwe konto; nie aktywuj planu płatnego.

```powershell
npx.cmd wrangler@4 login
npx.cmd wrangler@4 whoami
npx.cmd wrangler@4 d1 list
```

Tylko jeśli baza jeszcze nie istnieje i zezwalasz na jej utworzenie:

```powershell
npx.cmd wrangler@4 d1 create formawww-contact --binding CONTACT_DB --update-config=false
```

Wpisz otrzymane ID w `d1_databases[0].database_id`, nie dodawaj drugiego bindingu. Dla istniejącej bazy sprawdź przeznaczenie i użyj jej ID. Po zgodzie na zapis:

```powershell
npx.cmd wrangler@4 d1 execute CONTACT_DB --remote --file=schema.sql
npx.cmd wrangler@4 d1 execute CONTACT_DB --remote --command "SELECT name FROM sqlite_master WHERE type='table' AND name='contact_submissions';"
```

Schemat nie zmienił się przy zamianie poczty; nie trzeba czyścić D1 ani migrować danych. CONTACT_DB, oba limitery i Cron pozostają. Namespace ID limitów nie powinny kolidować z innymi projektami.

### Pierwsza publikacja — wysyłka nadal false

```powershell
npm.cmd run check:deployment
```

Zatrzymaj się przy błędzie. Dopiero po zgodzie na publikację:

```powershell
npx.cmd wrangler@4 deploy
npx.cmd wrangler@4 secret put ABUSE_SECRET
npx.cmd wrangler@4 secret put RESEND_API_KEY
npx.cmd wrangler@4 secret list
```

Sekrety wpisuj interaktywnie, nie jako argument polecenia. Pomiń ABUSE_SECRET, jeśli już jest poprawnie ustawiony. Alternatywa: **Workers & Pages → formawww-contact → Settings → Variables and Secrets**, typ Secret. `secret put` zmienia zdalną konfigurację i może utworzyć wdrożenie, wymaga zgody.

Konfiguracja nie zawiera już `send_email`. Jeśli ktoś wcześniej dodał EMAIL na koncie ręcznie, sprawdź i usuń wyłącznie ten nieużywany binding podczas uzgodnionego wdrożenia. Nie ruszaj DNS ani OVH. W tym zadaniu nie sprawdzano i nie zmieniano konta.

### Endpoint, aktywacja, logi

Skopiuj rzeczywisty URL z wyniku wdrożenia (nie zgaduj subdomeny):

```powershell
$formEndpoint = 'https://formawww-contact.TWOJA-SUBDOMENA.workers.dev/contact'
npm.cmd run check:endpoint -- "$formEndpoint" --disabled
```

Oczekiwane OPTIONS 204 i pusty POST 503. To nie test wysyłki.

Przed włączeniem sprawdź domenę Verified, klucz, limity i wymagania konta Resend. Nie używaj `onboarding@resend.dev`. Zaktualizuj informację o przetwarzaniu przez Cloudflare, Resend i OVH; dokumentów prawnych teraz nie zmieniano.

Po zgodzie podmień placeholder w `data-contact-endpoint` w kontakt.html na końcowy URL i ustaw `FORM_ENABLED=true`:

```powershell
npm.cmd run check:activation
```

Po poprawnym wyniku i zgodzie na aktywację:

```powershell
npx.cmd wrangler@4 deploy
npm.cmd run check:endpoint -- "$formEndpoint"
```

Oczekiwane OPTIONS 204 i pusty POST 422. Ten test nie sprawdza uprawnień Resend, zapisu rezerwacji ani dostarczalności. Po osobnej zgodzie na publikację frontendu i rzeczywisty test wyślij jedno zgłoszenie przez stronę. Sprawdź OVH/Spam, Resend Emails/Logs, Reply-To, podziękowanie, zachowanie danych po błędzie i brak drugiego maila przy identycznym ponowieniu.

Logi w osobnym terminalu, zakończenie Ctrl+C:

```powershell
npx.cmd wrangler@4 tail formawww-contact --format pretty
```

Kod nie loguje sekretów ani treści. Nie publikuj logów z metadanymi. Nie dodawaj logowania Authorization. Przechowywane logi Workers pozostają wyłączone (`observability.enabled=false`).

## 5. Ręczne decyzje i granice

Właściciel zakłada konto, wybiera region, dodaje wygenerowane DNS, weryfikuje domenę, tworzy ograniczony klucz i wpisuje sekrety. Osobno autoryzuje D1, publikację, włączenie, test maila i frontend. Lokalne testy nie zastępują tych kroków.

Kod można przygotować bez konta. Po autoryzacji D1 i wyłączony Worker nie zależą od propagacji własnej domeny. DNS wymaga aktywnej strefy, a produkcyjna poczta — Verified w Resend i ważnego klucza. Cloudflare Email Sending nie jest etapem tej procedury.

Wyłączenie awaryjne: FORM_ENABLED=false i uzgodnione `npx.cmd wrangler@4 deploy`. Nie usuwaj rezerwacji po timeoutach. Po wyczerpaniu darmowych limitów poczekaj na reset lub zatrzymaj wysyłkę; nie aktywuj płatnego planu bez zgody.
