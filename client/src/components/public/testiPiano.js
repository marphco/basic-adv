// Testi della pagina pubblica del piano editoriale (quella che vede il
// cliente), in italiano e in inglese.
//
// La lingua NON si sceglie qui: è quella del resto del sito (i18n.js). Chi
// apre dall'Italia vede l'italiano, da fuori l'inglese; chi la sceglie a mano
// (o arriva con ?lang=en nel link) vince sempre.
//
// Si traduce solo l'interfaccia. Didascalie, rubriche e note sono scritte da
// persone e restano come sono.
//
// Le frasi con parti in grassetto sono elenchi: le stringhe sono testo, gli
// elenchi annidati sono grassetto (li disegna <Testo> in PublicPlan.jsx).
// Così questo file resta puro JavaScript e si prova senza React.

// Stesso ordine del selettore nella barra del sito: EN · IT.
export const LINGUE = ["en", "it"];

export const linguaDi = (l) => (String(l || "").toLowerCase().startsWith("it") ? "it" : "en");

const ordinaleEn = (n) => {
  const s = n % 100;
  if (s >= 11 && s <= 13) return `${n}th`;
  return `${n}${{ 1: "st", 2: "nd", 3: "rd" }[n % 10] || "th"}`;
};

export const TESTI = {
  it: {
    mesi: [
      "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
      "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre",
    ],
    giorni: ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"],
    cambiaLingua: "Lingua",

    // accesso
    linkNonValido: "Il link non è valido.",
    caricamento: "Caricamento del piano…",
    accessoTitolo: "Il tuo piano editoriale",
    accessoTesto: "Inserisci la tua email per vedere il piano e lasciare le tue note.",
    accessoEsempio: "latua@email.it",
    accessoVerifica: "Verifica…",
    accessoEntra: "Accedi al piano",
    erroreServizio: "Servizio non ancora disponibile (404). Riprova tra poco.",
    erroreAccesso: (stato) => `Accesso non riuscito (HTTP ${stato}).`,
    erroreRete: "Impossibile contattare il server. Riprova.",

    // introduzione e guida
    ciao: (nome) => `Ciao ${nome}, ecco il piano editoriale del mese.`,
    guidaTitolo: "Come funziona",
    guida1: ["Clicca un post per vederlo in grande (foto e testo)."],
    guida2: ["Se vuoi una ", ["modifica"], ", lascia una nota sul post. Puoi lasciarne quante vuoi, anche su più post."],
    guida3: ["Quando hai segnalato ", ["tutte"], " le modifiche, premi ", ["«Invia le note a Basic»"], ": le riceviamo tutte in una volta sola."],
    guida4: ["Se è già tutto a posto, premi ", ["«Approva»"], " con il nome del mese: ogni mese si approva da sé."],
    legendaTue: "Le tue note",
    legendaBasic: "Nota da Basic",

    // invio note
    noteInviate: "Note inviate: Basic applicherà le modifiche.",
    noteLasciate: (n) => `Hai lasciato ${n} ${n === 1 ? "nota" : "note"}: inviale a Basic per le modifiche.`,
    invio: "Invio…",
    noteInviateBreve: "Note inviate",
    inviaNote: "Invia le note a Basic",
    inviaMessaggio: "Invii le tue note a Basic. Vuoi aggiungere un messaggio? (facoltativo)",
    inviaTitolo: "Invia le note a Basic",
    inviaConferma: "Invia le note",
    inviaEsempio: "Es. una precisazione, un cambiamento in vista…",

    // approvazione
    approvaDiNuovoInfo: "Il piano è stato aggiornato dopo l'ultima approvazione: se è tutto a posto, riconfermalo.",
    approvaInfo: "Se è tutto a posto, conferma il piano editoriale.",
    approvazioneInCorso: "Approvazione…",
    approvaDiNuovo: "Approva di nuovo",
    approvaPiano: (mese) => `Approva ${mese}`,
    approvaMessaggio: (mese) =>
      `Stai approvando solo il piano di ${mese}: gli altri mesi non cambiano. Puoi aggiungere un messaggio per Basic (facoltativo).`,
    approvaTitolo: (mese) => `Approva il piano di ${mese}`,
    approvaConferma: (mese) => `Approva ${mese}`,
    mesiTitolo: "Mesi del piano",
    meseApprovato: "Approvato",
    approvaEsempio: "Es. Tutto perfetto! / una precisazione per il prossimo mese…",
    approvatoVolte: (n) => `Piano approvato ${n} volte`,
    approvatoIl: (data) => `Piano approvato il ${data}`,
    nApprovazione: (n) => `${n}ª approvazione`,

    // calendario e post
    nessunPost: "Nessun post pubblicato per questo mese.",
    piede: "Basic Adv · Piano editoriale",
    chiudi: "Chiudi",
    sponsorizzato: "Sponsorizzato",
    ingrandisci: "Ingrandisci",
    precedente: "Precedente",
    successivo: "Successivo",
    apriPdf: "Apri il PDF",

    // note
    annulla: "Annulla",
    salva: "Salva",
    modifica: "Modifica",
    elimina: "Elimina",
    richiestaBasic: "Richiesta da Basic",
    notaBasic: "Nota da Basic",
    notaEsempio: "Aggiungi una nota su questo post (puoi allegare foto o video)…",
    rimuoviAllegato: "Rimuovi allegato",
    carico: "Carico…",
    fotoVideo: "Foto / Video",
    aggiungiNota: "Aggiungi nota",
    eliminaNotaDomanda: "Eliminare questa nota?",

    // errori di riserva (se il server non dice niente)
    erroreAllegati: "Caricamento allegati non riuscito.",
    erroreNota: "Invio nota non riuscito.",
    erroreModifica: "Modifica non riuscita.",
    erroreElimina: "Eliminazione non riuscita.",
    erroreFeedback: "Invio feedback non riuscito.",
    erroreApprova: "Approvazione non riuscita.",

    // le etichette delle card dei post (PostChip). Identiche a quelle che il
    // componente usa da solo nel pannello admin.
    card: {
      sponsor: "Sponsor",
      video: (quanti, carosello) => (carosello ? `${quanti} video` : "Video"),
      cliente: (n) => `Cliente${n > 1 ? ` ${n}` : ""}`,
      note: (n) => `Note${n > 1 ? ` ${n}` : ""}`,
      pdf: (n) => (n > 1 ? `${n} PDF` : "PDF"),
    },

    dataOra: (data, ora) => `${data} · ${ora}`,
  },

  en: {
    mesi: [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December",
    ],
    giorni: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    cambiaLingua: "Language",

    linkNonValido: "This link is not valid.",
    caricamento: "Loading your content calendar…",
    accessoTitolo: "Your content calendar",
    accessoTesto: "Enter your email to view the calendar and leave comments.",
    accessoEsempio: "you@company.com",
    accessoVerifica: "Checking…",
    accessoEntra: "View calendar",
    erroreServizio: "This page isn't available right now (404). Please try again in a few minutes.",
    erroreAccesso: (stato) => `We couldn't open the calendar (HTTP ${stato}).`,
    erroreRete: "We can't reach the server. Check your connection and try again.",

    ciao: (nome) => `Hi ${nome}, here's your content calendar for this month.`,
    guidaTitolo: "How it works",
    guida1: ["Click any post to see it full size, with its caption."],
    guida2: ["Want something ", ["changed"], "? Leave a comment on the post. Add as many comments as you need, on any post."],
    guida3: ["When you've added ", ["all"], " your comments, click ", ["“Send comments to Basic”"], " and we'll get them all at once."],
    guida4: ["If everything looks good, click ", ["“Approve”"], " for that month. Each month is approved separately."],
    legendaTue: "Your comments",
    legendaBasic: "Comment from Basic",

    noteInviate: "Comments sent. Basic will make the changes.",
    noteLasciate: (n) =>
      n === 1
        ? "You've left 1 comment. Send it to Basic so they can make the change."
        : `You've left ${n} comments. Send them to Basic so they can make the changes.`,
    invio: "Sending…",
    noteInviateBreve: "Comments sent",
    inviaNote: "Send comments to Basic",
    inviaMessaggio: "You're about to send your comments to Basic. Want to add a message? (optional)",
    inviaTitolo: "Send comments to Basic",
    inviaConferma: "Send comments",
    inviaEsempio: "E.g. some context, an upcoming change…",

    approvaDiNuovoInfo: "The calendar was updated after you approved it. If everything looks good, please approve it again.",
    approvaInfo: "If everything looks good, approve the calendar.",
    approvazioneInCorso: "Approving…",
    approvaDiNuovo: "Approve again",
    approvaPiano: (mese) => `Approve ${mese}`,
    approvaMessaggio: (mese) =>
      `You're approving the ${mese} calendar only. Other months aren't affected. You can add a message for Basic (optional).`,
    approvaTitolo: (mese) => `Approve the ${mese} calendar`,
    approvaConferma: (mese) => `Approve ${mese}`,
    mesiTitolo: "Months",
    meseApprovato: "Approved",
    approvaEsempio: "E.g. Looks great! / A note for next month…",
    approvatoVolte: (n) => `Approved ${n} times`,
    approvatoIl: (data) => `Approved on ${data}`,
    nApprovazione: (n) => `${ordinaleEn(n)} approval`,

    nessunPost: "No posts scheduled for this month yet.",
    piede: "Basic Adv · Content calendar",
    chiudi: "Close",
    sponsorizzato: "Sponsored",
    ingrandisci: "View full size",
    precedente: "Previous",
    successivo: "Next",
    apriPdf: "Open the PDF",

    annulla: "Cancel",
    salva: "Save",
    modifica: "Edit",
    elimina: "Delete",
    richiestaBasic: "Request from Basic",
    notaBasic: "Comment from Basic",
    notaEsempio: "Add a comment on this post (you can attach photos or videos)…",
    rimuoviAllegato: "Remove attachment",
    carico: "Uploading…",
    fotoVideo: "Photo / Video",
    aggiungiNota: "Add comment",
    eliminaNotaDomanda: "Delete this comment?",

    erroreAllegati: "We couldn't upload your attachments.",
    erroreNota: "We couldn't send your comment.",
    erroreModifica: "We couldn't save your changes.",
    erroreElimina: "We couldn't delete the comment.",
    erroreFeedback: "We couldn't send your comments.",
    erroreApprova: "We couldn't approve the calendar.",

    card: {
      sponsor: "Sponsored",
      video: (quanti, carosello) =>
        carosello ? `${quanti} ${quanti === 1 ? "video" : "videos"}` : "Video",
      cliente: (n) => `Client${n > 1 ? ` ${n}` : ""}`,
      note: (n) => (n > 1 ? `${n} comments` : "Comment"),
      pdf: (n) => (n > 1 ? `${n} PDFs` : "PDF"),
    },

    // Le ore sono sempre quelle italiane (lo storico è dell'agenzia): per chi
    // legge dall'estero va detto, altrimenti sembrano ore sue.
    dataOra: (data, ora) => `${data} · ${ora} (Italy time)`,
  },
};

// Messaggi d'errore del server (server/routes/public.js), che arrivano in
// italiano. In italiano si mostrano come sono; in inglese si traducono. Un
// messaggio nuovo che qui non c'è NON passa in italiano: in inglese si usa
// l'errore di riserva dell'azione.
const ERRORI_SERVER_EN = {
  "Accesso negato.": "Access denied.",
  "Email non riconosciuta per questo piano.": "We don't recognize this email for this calendar.",
  "Errore nel caricamento degli allegati.": "We couldn't upload your attachments.",
  "Errore nel caricamento del piano.": "We couldn't load the calendar.",
  "Errore nell'approvazione del piano.": "We couldn't approve the calendar.",
  "Errore nell'eliminazione della nota.": "We couldn't delete the comment.",
  "Errore nell'invio del feedback.": "We couldn't send your comments.",
  "Errore nell'invio della nota.": "We couldn't send your comment.",
  "Errore nella modifica della nota.": "We couldn't save your changes.",
  "La nota è vuota.": "The comment is empty.",
  "Non ci sono note da inviare.": "There are no comments to send.",
  "Nota non trovata.": "Comment not found.",
  "Post non trovato.": "Post not found.",
  "Puoi eliminare solo le tue note.": "You can only delete your own comments.",
  "Puoi modificare solo le tue note.": "You can only edit your own comments.",
  "Troppi tentativi, riprova tra un minuto.": "Too many attempts, please try again in a minute.",
};

export function erroreServer(messaggio, lingua, riserva) {
  if (!messaggio) return riserva;
  if (lingua === "it") return messaggio;
  return ERRORI_SERVER_EN[String(messaggio).trim()] || riserva;
}

export const ELENCO_ERRORI_SERVER = Object.keys(ERRORI_SERVER_EN);

// Data e ora sempre nel fuso italiano, come prima.
export function fmtDataOra(d, lingua) {
  try {
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return "";
    const tz = { timeZone: "Europe/Rome" };
    if (lingua === "it")
      return TESTI.it.dataOra(
        dt.toLocaleDateString("it-IT", tz),
        dt.toLocaleTimeString("it-IT", { ...tz, hour: "2-digit", minute: "2-digit" })
      );
    // in inglese il mese a parole (Oct 14, 2026): 10/14 o 14/10 si leggono
    // al contrario a seconda di chi guarda
    return TESTI.en.dataOra(
      dt.toLocaleDateString("en-US", { ...tz, month: "short", day: "numeric", year: "numeric" }),
      dt.toLocaleTimeString("en-US", { ...tz, hour: "numeric", minute: "2-digit" })
    );
  } catch {
    return "";
  }
}
