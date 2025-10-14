import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import Backend from "i18next-http-backend";
import LanguageDetector from "i18next-browser-languagedetector";

// --- util per capire se l'utente ha già scelto esplicitamente la lingua
function hasExplicitLangChoice() {
  const params = new URLSearchParams(window.location.search);
  if (params.has("lang")) return true; // URL vince sempre

  // cookie impostati da i18next o dal nostro listener
  const all = document.cookie || "";
  return /(?:^|;\s*)(i18next|lang)=/.test(all);
}

// Inizializzazione base: nessun detector async
i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: "en",
    supportedLngs: ["en", "it"],
    ns: ["common"],
    defaultNS: "common",
    load: "languageOnly",
    interpolation: { escapeValue: false },
    backend: {
      loadPath: "/locales/{{lng}}/{{ns}}.json",
    },
    detection: {
      // priorità: URL ?lang -> cookie -> navigator
      order: ["querystring", "cookie", "navigator"],
      lookupQuerystring: "lang",
      caches: ["cookie"],
      cookieMinutes: 60 * 24 * 365,
    },
  });

// Aggiorna <html lang="">
i18n.on("languageChanged", (lng) => {
  if (typeof document !== "undefined") {
    document.documentElement.setAttribute("lang", lng || "en");
    // manteniamo anche un cookie "lang" (comodo lato server, se ti servirà)
    document.cookie = `lang=${lng};path=/;max-age=${60 * 60 * 24 * 365}`;
  }
});

// ---- Geo post-init (una volta sola) ----
// Se l'utente NON ha scelto esplicitamente la lingua (né ?lang né cookie),
// proviamo a determinare la lingua via geo: IT => "it", altrimenti "en".
(async () => {
  try {
    if (hasExplicitLangChoice()) return;

    // Override solo per test locale:
    const params = new URLSearchParams(window.location.search);
    const overrideCountry = params.get("country");
    let country = overrideCountry ? overrideCountry.toUpperCase() : null;

    // In produzione su Vercel, usa /api/geo (in dev locale può non esistere)
    if (!country) {
      const res = await fetch("/api/geo", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        country = data?.country?.toUpperCase() || null;
      }
    }

    const preferred = country === "IT" ? "it" : "en";

    // Cambia solo se diverso da quello attuale (evita loop e ricarichi inutili)
    const current = (i18n.language || "en").slice(0, 2);
    if (current !== preferred) {
      await i18n.changeLanguage(preferred);
    }
  } catch {
    // silenzioso: se fallisce la geo, restiamo sulla lingua già scelta dai detector
  }
})();

export default i18n;
