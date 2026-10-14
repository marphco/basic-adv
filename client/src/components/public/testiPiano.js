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
    guida4: ["Se è già tutto a posto, premi ", ["«Approva piano editoriale»"], "."],
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
    approvaPiano: "Approva piano editoriale",
    approvaMessaggio: "Confermi l'approvazione del piano editoriale? Puoi aggiungere un messaggio per Basic (facoltativo).",
    approvaTitolo: "Approva piano editoriale",
    approvaConferma: "Approva piano",
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
    caricamento: "Loading your plan…",
    accessoTitolo: "Your content plan",
    accessoTesto: "Enter your email to see the plan and leave your notes.",
    accessoEsempio: "your@email.com",
    accessoVerifica: "Checking…",
    accessoEntra: "Open the plan",
    erroreServizio: "The service isn't available yet (404). Please try again shortly.",
    erroreAccesso: (stato) => `Couldn't open the plan (HTTP ${stato}).`,
    erroreRete: "Can't reach the server. Please try again.",

    ciao: (nome) => `Hi ${nome}, here is this month's content plan.`,
    guidaTitolo: "How it works",
    guida1: ["Click a post to see it full size (image and text)."],
    guida2: ["Want a ", ["change"], "? Leave a note on the post. You can leave as many as you like, on as many posts as you like."],
    guida3: ["Once you've flagged ", ["all"], " the changes, press ", ["“Send notes to Basic”"], ": we receive them all at once."],
    guida4: ["If everything is already fine, press ", ["“Approve content plan”"], "."],
    legendaTue: "Your notes",
    legendaBasic: "Note from Basic",

    noteInviate: "Notes sent: Basic will make the changes.",
    noteLasciate: (n) =>
      n === 1
        ? "You've left 1 note: send it to Basic to get the change made."
        : `You've left ${n} notes: send them to Basic to get the changes made.`,
    invio: "Sending…",
    noteInviateBreve: "Notes sent",
    inviaNote: "Send notes to Basic",
    inviaMessaggio: "You're sending your notes to Basic. Would you like to add a message? (optional)",
    inviaTitolo: "Send notes to Basic",
    inviaConferma: "Send notes",
    inviaEsempio: "E.g. a clarification, an upcoming change…",

    approvaDiNuovoInfo: "The plan was updated after your last approval: if everything is fine, please confirm it again.",
    approvaInfo: "If everything is fine, approve the content plan.",
    approvazioneInCorso: "Approving…",
    approvaDiNuovo: "Approve again",
    approvaPiano: "Approve content plan",
    approvaMessaggio: "Do you confirm you approve the content plan? You can add a message for Basic (optional).",
    approvaTitolo: "Approve content plan",
    approvaConferma: "Approve plan",
    approvaEsempio: "E.g. All perfect! / a note for next month…",
    approvatoVolte: (n) => `Plan approved ${n} times`,
    approvatoIl: (data) => `Plan approved on ${data}`,
    nApprovazione: (n) => `${ordinaleEn(n)} approval`,

    nessunPost: "No posts published for this month.",
    piede: "Basic Adv · Content plan",
    chiudi: "Close",
    sponsorizzato: "Sponsored",
    ingrandisci: "Enlarge",
    precedente: "Previous",
    successivo: "Next",
    apriPdf: "Open the PDF",

    annulla: "Cancel",
    salva: "Save",
    modifica: "Edit",
    elimina: "Delete",
    richiestaBasic: "Request from Basic",
    notaBasic: "Note from Basic",
    notaEsempio: "Add a note on this post (you can attach photos or videos)…",
    rimuoviAllegato: "Remove attachment",
    carico: "Uploading…",
    fotoVideo: "Photo / Video",
    aggiungiNota: "Add note",
    eliminaNotaDomanda: "Delete this note?",

    erroreAllegati: "Couldn't upload the attachments.",
    erroreNota: "Couldn't send the note.",
    erroreModifica: "Couldn't save the change.",
    erroreElimina: "Couldn't delete the note.",
    erroreFeedback: "Couldn't send your feedback.",
    erroreApprova: "Couldn't approve the plan.",

    card: {
      sponsor: "Sponsored",
      video: (quanti, carosello) =>
        carosello ? `${quanti} ${quanti === 1 ? "video" : "videos"}` : "Video",
      cliente: (n) => `Client${n > 1 ? ` ${n}` : ""}`,
      note: (n) => `${n > 1 ? "Notes" : "Note"}${n > 1 ? ` ${n}` : ""}`,
      pdf: (n) => (n > 1 ? `${n} PDFs` : "PDF"),
    },

    // Le ore sono sempre quelle italiane (lo storico è dell'agenzia): per chi
    // legge dall'estero va detto, altrimenti sembrano ore sue.
    dataOra: (data, ora) => `${data} · ${ora} (Italian time)`,
  },
};

// Messaggi d'errore del server (server/routes/public.js), che arrivano in
// italiano. In italiano si mostrano come sono; in inglese si traducono. Un
// messaggio nuovo che qui non c'è NON passa in italiano: in inglese si usa
// l'errore di riserva dell'azione.
const ERRORI_SERVER_EN = {
  "Accesso negato.": "Access denied.",
  "Email non riconosciuta per questo piano.": "This email isn't recognised for this plan.",
  "Errore nel caricamento degli allegati.": "Couldn't upload the attachments.",
  "Errore nel caricamento del piano.": "Couldn't load the plan.",
  "Errore nell'approvazione del piano.": "Couldn't approve the plan.",
  "Errore nell'eliminazione della nota.": "Couldn't delete the note.",
  "Errore nell'invio del feedback.": "Couldn't send your feedback.",
  "Errore nell'invio della nota.": "Couldn't send the note.",
  "Errore nella modifica della nota.": "Couldn't save the change.",
  "La nota è vuota.": "The note is empty.",
  "Non ci sono note da inviare.": "There are no notes to send.",
  "Nota non trovata.": "Note not found.",
  "Post non trovato.": "Post not found.",
  "Puoi eliminare solo le tue note.": "You can only delete your own notes.",
  "Puoi modificare solo le tue note.": "You can only edit your own notes.",
  "Troppi tentativi, riprova tra un minuto.": "Too many attempts, please try again in a minute.",
};

export function erroreServer(messaggio, lingua, riserva) {
  if (!messaggio) return riserva;
  if (lingua === "it") return messaggio;
  return ERRORI_SERVER_EN[String(messaggio).trim()] || riserva;
}

export const ELENCO_ERRORI_SERVER = Object.keys(ERRORI_SERVER_EN);

// Data e ora sempre nel fuso italiano, come prima; in inglese giorno/mese/anno
// all'europea (en-GB), non mese/giorno all'americana.
export function fmtDataOra(d, lingua) {
  try {
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return "";
    const tz = { timeZone: "Europe/Rome" };
    const loc = lingua === "it" ? "it-IT" : "en-GB";
    return TESTI[lingua].dataOra(
      dt.toLocaleDateString(loc, tz),
      dt.toLocaleTimeString(loc, { ...tz, hour: "2-digit", minute: "2-digit" })
    );
  } catch {
    return "";
  }
}
