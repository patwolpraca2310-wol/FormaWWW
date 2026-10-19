/* FormaWWW: shared navigation. Existing CTA links now open the ready Contact page. */
(() => {
  "use strict";

  const menuButton = document.querySelector(".menu-toggle");
  const navigation = document.querySelector("#site-nav");
  const mobileViewport = window.matchMedia("(max-width: 900px)");

  if (menuButton && navigation) {
    document.documentElement.classList.add("js-enabled");
    menuButton.hidden = false;

    const closeMenu = (restoreFocus = false) => {
      navigation.classList.remove("is-open");
      menuButton.setAttribute("aria-expanded", "false");
      if (restoreFocus && mobileViewport.matches) menuButton.focus();
    };

    menuButton.addEventListener("click", () => {
      const opening = menuButton.getAttribute("aria-expanded") !== "true";
      menuButton.setAttribute("aria-expanded", String(opening));
      navigation.classList.toggle("is-open", opening);
    });

    navigation.addEventListener("click", (event) => {
      const link = event.target.closest("a");
      if (!link) return;
      closeMenu();
      // Move keyboard focus to the section, not to a newly hidden menu item.
      const href = link.getAttribute("href");
      if (mobileViewport.matches && href && href.startsWith("#")) {
        const target = document.querySelector(href);
        if (target) {
          target.setAttribute("tabindex", "-1");
          target.focus({ preventScroll: true });
          target.addEventListener("blur", () => target.removeAttribute("tabindex"), { once: true });
        }
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && menuButton.getAttribute("aria-expanded") === "true") closeMenu(true);
    });
    document.addEventListener("click", (event) => {
      if (!event.target.closest(".site-header")) closeMenu();
    });
    navigation.addEventListener("focusout", (event) => {
      if (event.relatedTarget && !navigation.contains(event.relatedTarget) && event.relatedTarget !== menuButton) closeMenu();
    });
    mobileViewport.addEventListener("change", () => closeMenu());
  }

  const year = document.querySelector("[data-year]");
  if (year) year.textContent = String(new Date().getFullYear());
})();

/* Contact form. The public Worker URL is configured in kontakt.html.
   No secrets in this file. Transport and CORS contract: worker/README.md.
   Client checks are UX; the Worker independently validates every request. */
(() => {
  "use strict";
  const form = document.querySelector("[data-contact-form]");
  if (!form) return;

  const delivery = Object.freeze({ endpoint: form.dataset.contactEndpoint || "", timeoutMs: 20000, thankYouPage: "dziekujemy.html" });
  const transport = window.FormaWWWContactTransport;
  const button = form.querySelector("[data-contact-submit]");
  const buttonLabel = form.querySelector("[data-submit-label]");
  const status = form.querySelector("[data-form-status]");
  const summary = form.querySelector("[data-error-summary]");
  const errorList = form.querySelector("[data-error-list]");
  const names = ["service", "website", "name", "company", "email", "phone", "message"];
  const fields = names.map(name => form.elements.namedItem(name));
  const services = new Set(["new-website", "redesign", "maintenance", "seo", "content", "unsure"]);
  const labels = { service: "Rodzaj usługi", website: "Adres strony", name: "Imię", company: "Nazwa firmy", email: "Adres e-mail", phone: "Telefon", message: "Wiadomość" };
  let attempted = false;
  let inFlight = false;
  let accepted = false;

  const validationMessage = field => {
    const value = field.value.trim();
    const requiredMessages = {
      service: "Wybierz usługę lub opcję „Nie wiem jeszcze czego potrzebuję”.",
      name: "Podaj swoje imię.",
      company: "Podaj nazwę firmy.",
      email: "Podaj adres e-mail, na który mogę odpowiedzieć.",
      message: "Napisz kilka słów o tym, czego potrzebuje Twoja firma."
    };
    if (field.required && !value) return requiredMessages[field.name];
    if (!value) return "";
    if (field.maxLength > 0 && value.length > field.maxLength) return "Skróć treść do maksymalnie " + field.maxLength + " znaków.";
    if (field.minLength > 0 && value.length < field.minLength) return "Wpisz co najmniej " + field.minLength + " znaków.";
    if (field.name === "service" && !services.has(value)) return requiredMessages.service;
    if (field.name === "email" && field.validity.typeMismatch) return "Podaj poprawny adres e-mail, np. kontakt@twojafirma.pl.";
    if (field.name === "website") {
      try {
        const url = new URL(value);
        if (!["https:", "http:"].includes(url.protocol) || !url.hostname || url.username || url.password) throw new Error("Invalid URL");
      } catch {
        return "Podaj pełny adres strony, np. https://twojafirma.pl.";
      }
    }
    if (field.name === "phone") {
      const digits = value.replace(/\D/g, "");
      if (!/^[+()\d\s.-]+$/.test(value) || digits.length < 7 || digits.length > 20) return "Sprawdź numer telefonu. Możesz użyć prefiksu kraju, spacji i myślników.";
    }
    return "";
  };

  const setError = (field, message) => {
    const hint = document.getElementById(field.id + "-error");
    hint.textContent = message;
    hint.hidden = !message;
    if (message) field.setAttribute("aria-invalid", "true");
    else field.removeAttribute("aria-invalid");
  };

  const renderSummary = () => {
    errorList.replaceChildren();
    for (const field of fields) {
      if (field.getAttribute("aria-invalid") !== "true") continue;
      const li = document.createElement("li");
      const link = document.createElement("a");
      link.href = "#" + field.id;
      link.textContent = labels[field.name] + ": " + document.getElementById(field.id + "-error").textContent;
      link.addEventListener("click", event => {
        event.preventDefault();
        field.focus();
      });
      li.append(link);
      errorList.append(li);
    }
    summary.hidden = !errorList.childElementCount;
  };

  const showStatus = (message, isError = false) => {
    status.textContent = message;
    status.dataset.error = String(isError);
  };

  const submitInquiry = payload => {
    if (!transport) throw Object.assign(new Error("Missing transport"), { code: "not_configured" });
    return transport.submit(payload, delivery);
  };

  form.addEventListener("submit", async event => {
    event.preventDefault(); // No native POST, URL query string, mailto or false success.
    if (inFlight || accepted) return;
    attempted = true;
    showStatus("");
    for (const field of fields) setError(field, validationMessage(field));
    renderSummary();
    if (!summary.hidden) {
      summary.focus();
      return;
    }
    if (form.elements.namedItem("fax_number").value.trim()) {
      showStatus("Nie udało się zweryfikować formularza. Odśwież stronę i spróbuj ponownie.", true);
      status.focus();
      return;
    }

    const payload = Object.fromEntries(fields.map(field => [field.name, field.value.trim()]));
    payload.fax_number = form.elements.namedItem("fax_number").value;
    inFlight = true;
    button.disabled = true;
    buttonLabel.textContent = "Wysyłanie…";
    form.setAttribute("aria-busy", "true");
    try {
      const result = await submitInquiry(payload);
      if (result.mode === "invalid") {
        for (const field of fields) {
          const message = result.errors[field.name];
          if (typeof message === "string") setError(field, message.slice(0,300));
        }
        renderSummary();
        if (!summary.hidden) summary.focus();
        else {
          showStatus("Nie udało się przyjąć wiadomości. Sprawdź dane i spróbuj ponownie.", true);
          status.focus();
        }
      } else if (result.mode === "accepted") {
        accepted = true;
        window.location.assign(delivery.thankYouPage);
        return;
      }
    } catch (error) {
      showStatus(transport ? transport.errorMessage(error) : "Wysyłka formularza wymaga dokończenia konfiguracji. Skorzystaj z danych kontaktowych powyżej.", true);
      status.focus();
    } finally {
      inFlight = false;
      form.removeAttribute("aria-busy");
      button.disabled = accepted;
      buttonLabel.textContent = accepted ? "Wiadomość przyjęta" : "Wyślij wiadomość";
    }
  });

  for (const field of fields) {
    field.addEventListener("input", () => {
      if (!inFlight) showStatus("");
      // Only clear a previously reported error when the corrected value is valid.
      if (attempted && field.getAttribute("aria-invalid") === "true" && !validationMessage(field)) {
        setError(field, "");
        renderSummary();
      }
    });
    field.addEventListener("blur", () => {
      if (!attempted) return;
      setError(field, validationMessage(field));
      renderSummary();
    });
  }

  // Enhance only after listeners exist. Without JS, the disabled button fails closed.
  const configurationNote = document.getElementById("ct-preview-note");
  if (configurationNote && transport?.isConfigured(delivery.endpoint)) {
    configurationNote.hidden = true;
    form.setAttribute("aria-describedby", "ct-required-note");
  }
  form.noValidate = true;
  button.disabled = false;
})();
