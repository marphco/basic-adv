// Lingua della mail del piano: quella scelta nella scheda del cliente
// (Italiano / Inglese). Si sa a priori, niente da indovinare.
//
// Campi del cliente, nell'ordine in cui sono nati:
//  - `linguaMail` "it" | "en": la scelta attuale;
//  - `lingua: "en"` (prima versione): vale ancora come inglese finché la
//    scheda non viene salvata con la scelta nuova;
//  - `linguaMail: "auto"` (versione automatica, ritirata): italiano, come i
//    clienti senza scelta.

const SCELTE = ["it", "en"];

function linguaMail(client) {
  if (SCELTE.includes(client?.linguaMail)) return client.linguaMail;
  if (!client?.linguaMail && client?.lingua === "en") return "en";
  return "it";
}

module.exports = { linguaMail, SCELTE };
