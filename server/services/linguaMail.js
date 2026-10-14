// Lingua della mail del piano: italiano ai clienti in Italia, inglese a quelli
// all'estero, senza che nessuno debba ricordarsi di sceglierla.
//
// Come si decide, in ordine:
//  1. scelta a mano nella scheda del cliente ("Sempre italiano/inglese");
//  2. italiano se il cliente ha aperto il piano almeno una volta dall'Italia
//     (in vacanza all'estero non deve ritrovarsi le mail in inglese) o se ha
//     un'email .it (vale anche se qualcuno dell'agenzia apre il suo piano
//     dall'estero con la sua email);
//  3. inglese se ha aperto il piano solo dall'estero, o se, prima di qualsiasi
//     apertura, le sue email sono tutte di paesi esteri (.de, .fr, .co.uk…);
//  4. altrimenti (.com, .net… senza aperture) italiano, come è sempre stato.

const ITALIA = ["IT", "SM", "VA"];
const SCELTE = ["auto", "it", "en"];

// Domini che non dicono niente sul paese.
const GENERICI = new Set(["com", "net", "org", "eu", "io", "info", "biz", "co", "me", "app", "dev", "tv"]);

const tld = (email) => {
  const dominio = String(email || "").toLowerCase().split("@")[1] || "";
  return dominio.split(".").pop() || "";
};

// La scelta salvata nella scheda: "auto" | "it" | "en". `lingua: "en"` è il
// campo della prima versione (solo inglese a mano): vale ancora.
function sceltaDi(client) {
  if (SCELTE.includes(client?.linguaMail)) return client.linguaMail;
  return client?.lingua === "en" ? "en" : "auto";
}

function linguaMail(client) {
  const scelta = sceltaDi(client);
  if (scelta === "it") return { lingua: "it", motivo: "scelta a mano" };
  if (scelta === "en") return { lingua: "en", motivo: "scelta a mano" };

  if (client?.apertoDaItalia)
    return { lingua: "it", motivo: "ha aperto il piano dall'Italia" };
  const emails = [...(client?.emails || []), client?.email].filter(Boolean);
  const finali = emails.map(tld).filter(Boolean);
  if (finali.some((t) => t === "it" || t === "sm" || t === "va"))
    return { lingua: "it", motivo: "email con dominio .it" };
  if (client?.apertoDaEstero)
    return {
      lingua: "en",
      motivo: `ha aperto il piano dall'estero${client.paeseEstero ? ` (${client.paeseEstero})` : ""}`,
    };
  const esteri = finali.filter((t) => t.length === 2 && !GENERICI.has(t));
  if (finali.length && esteri.length === finali.length)
    return { lingua: "en", motivo: `email con dominio estero (.${esteri[0]})` };

  return {
    lingua: "it",
    motivo: "non ha ancora aperto un piano: italiano finché non lo apre",
  };
}

// Aggiornamento del cliente dopo un'apertura del piano da `paese` (ISO-2).
// null = niente da registrare (paese sconosciuto o non valido).
function aperturaDa(paese) {
  const p = String(paese || "").toUpperCase();
  if (!/^[A-Z]{2}$/.test(p) || p === "ZZ" || p === "XX") return null;
  return ITALIA.includes(p)
    ? { apertoDaItalia: new Date() }
    : { apertoDaEstero: new Date(), paeseEstero: p };
}

module.exports = { linguaMail, sceltaDi, aperturaDa, SCELTE };
