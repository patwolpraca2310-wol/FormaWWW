/* Public endpoint only. Authentication to the mail service stays inside the Worker. */
(() => {
  "use strict";
  const failure = code => Object.assign(new Error(code), { code });
  const endpointURL = endpoint => {
    if (!endpoint) throw failure("not_configured");
    let url;
    try { url = new URL(endpoint); } catch { throw failure("not_configured"); }
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    if ((url.protocol !== "https:" && !(local && url.protocol === "http:")) ||
        url.hostname.endsWith(".invalid") || /replace|placeholder/i.test(url.hostname) ||
        url.username || url.password || url.search || url.hash || url.pathname !== "/contact") throw failure("not_configured");
    return url;
  };
  const isConfigured = endpoint => { try { endpointURL(endpoint); return true; } catch { return false; } };
  const messages = {
    not_configured: "Wysyłka formularza wymaga dokończenia konfiguracji. Skorzystaj z danych kontaktowych powyżej.",
    rate_limited: "Zbyt wiele prób wysłania. Odczekaj co najmniej minutę i spróbuj ponownie. Wpisane dane zostały zachowane.",
    pending: "Poprzednie zgłoszenie jest jeszcze przetwarzane albo jego status wymaga sprawdzenia. Nie zmieniaj treści w celu ponownej wysyłki; spróbuj później lub skontaktuj się bezpośrednio.",
    delivery_unknown: "Nie mogę potwierdzić przyjęcia wiadomości. Mogła już zostać wysłana. Dane pozostały w formularzu; ponowienie tej samej treści nie wyśle jej drugi raz w ciągu 24 godzin.",
    delivery_failed: "Usługa pocztowa nie przyjęła wiadomości. Dane zostały zachowane. Spróbuj ponownie później lub skorzystaj z danych kontaktowych.",
    server_error: "Formularz jest chwilowo niedostępny. Twoje dane zostały zachowane. Spróbuj ponownie później.",
    request_timeout: "Przekroczono czas oczekiwania. Wiadomość mogła dotrzeć do serwera. Dane zostały zachowane; spróbuj później, pozostawiając tę samą treść.",
    network_error: "Nie udało się potwierdzić połączenia z formularzem. Sprawdź internet i spróbuj ponownie z tą samą treścią. Dane zostały zachowane.",
    invalid_request: "Nie udało się przyjąć zgłoszenia. Sprawdź dane i spróbuj ponownie. Wpisana treść pozostała w formularzu.",
  };
  async function submit(payload, { endpoint, timeoutMs = 20000 }) {
    const url = endpointURL(endpoint);
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url.href, {
        method: "POST", mode: "cors", credentials: "omit", redirect: "error",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        cache: "no-store", referrerPolicy: "no-referrer", signal: controller.signal,
        body: JSON.stringify(payload),
      });
      let result;
      try { result = await response.json(); }
      catch (error) {
        if (error.name === "AbortError") throw error;
        throw failure("server_error");
      }
      if (response.status === 422 && result?.errors && typeof result.errors === "object" && !Array.isArray(result.errors)) return { mode: "invalid", errors: result.errors };
      if (response.ok && result?.accepted === true) return { mode: "accepted" };
      if (response.status === 429) throw failure("rate_limited");
      if (["pending", "delivery_unknown", "delivery_failed", "not_configured"].includes(result?.code)) throw failure(result.code);
      if (response.status === 408 || response.status === 504) throw failure("request_timeout");
      throw failure(response.status >= 500 ? "server_error" : "invalid_request");
    } catch (error) {
      if (error.name === "AbortError") throw failure("request_timeout");
      if (error.code && Object.hasOwn(messages, error.code)) throw error;
      throw failure("network_error");
    } finally { window.clearTimeout(timeout); }
  }
  window.FormaWWWContactTransport = Object.freeze({
    submit, isConfigured,
    errorMessage: error => messages[error?.code] || messages.server_error,
  });
})();
