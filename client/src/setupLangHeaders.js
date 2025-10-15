// // client/src/setupLangHeaders.js
// import i18n from "./i18n";

// // Disabilitiamo qualsiasi impostazione dell'header X-Lang da axios.
// // (Se in passato era stato impostato, lo rimuoviamo e lo manteniamo rimosso)
// try {
//   const axios = (await import("axios")).default;
//   if (axios?.defaults?.headers?.common) {
//     delete axios.defaults.headers.common["X-Lang"];
//   }
//   i18n.on("languageChanged", () => {
//     if (axios?.defaults?.headers?.common) {
//       delete axios.defaults.headers.common["X-Lang"];
//     }
//   });
// } catch {
//   /* axios non usato? ok così */
// }

// // Nessun wrapper su window.fetch e niente header custom qui.


// client/src/setupLangHeaders.js
import i18n from "./i18n";
import axios from "axios";

// function langFrom(i18nOrDoc) {
//   const l = (i18nOrDoc?.language || document?.documentElement?.lang || "en").toLowerCase();
//   return l.startsWith("it") ? "it" : "en";
// }

// Imposta l'header globale una volta
// axios.defaults.headers.common["X-Lang"] = langFrom(i18n);

// Aggiorna quando cambia lingua
// i18n.on("languageChanged", (lng) => {
//   const L = (lng || "en").toLowerCase().startsWith("it") ? "it" : "en";
//   axios.defaults.headers.common["X-Lang"] = L;
//   // mantieni anche il cookie "lang" come già fai in i18n.js
// });

delete axios.defaults.headers?.common?.["X-Lang"];
i18n.on("languageChanged", () => {
  delete axios.defaults.headers?.common?.["X-Lang"];
});