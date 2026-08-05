// Storico delle versioni di un post: si può tornare indietro nel tempo e
// rimettere le cose com'erano.
//
// Tre regole che tengono la storia utile invece che ingombrante:
//
//  1. NIENTE VERSIONI IDENTICHE. Chi salva due volte di fila senza aver
//     cambiato niente non deve produrre due voci uguali.
//  2. SALVATAGGI RAVVICINATI ACCORPATI. Chi lavora a una didascalia salva
//     cinque volte in dieci minuti: è una sessione sola, non cinque momenti
//     della storia. Lo stato PRECEDENTE alla sessione resta intatto, quindi
//     non si perde niente di importante.
//  3. IL PRIMO STATO SI REGISTRA SEMPRE. Per i post che esistevano già prima
//     di questa funzione, la prima modifica registra anche com'erano PRIMA:
//     senza, non si potrebbe più tornare a oggi.
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const PostVersion = require("../models/PostVersion");
const storage = require("./storage");
const { locate } = require("./mediaInventory");

// Minuti entro i quali i salvataggi della stessa persona si accorpano.
const FINESTRA_MIN = () => Number(process.env.VERSIONI_FINESTRA_MIN || 10);

// Cosa entra in una fotografia: quello che una persona può cambiare a mano.
// Fuori restano `order` e `isDuplicate`, che sono meccanica interna, e
// `createdBy`, che non cambia mai.
function fotografia(post) {
  return {
    pageId: post.pageId,
    year: post.year,
    month: post.month,
    day: post.day,
    caption: post.caption || "",
    category: post.category || "",
    media: (post.media || []).map((m) => ({
      kind: m.kind,
      url: m.url,
      thumbUrl: m.thumbUrl || "",
    })),
    sponsored: !!post.sponsored,
    status: post.status,
    publishStatus: post.publishStatus,
    clientNotes: (post.clientNotes || []).map((n) => ({
      text: n.text || "",
      author: n.author || "",
      authorEmail: n.authorEmail || "",
      fromAgency: !!n.fromAgency,
      needsReply: !!n.needsReply,
      internal: !!n.internal,
      media: (n.media || []).map((m) => ({
        kind: m.kind,
        url: m.url,
        thumbUrl: m.thumbUrl || "",
      })),
      resolved: !!n.resolved,
      createdAt: n.createdAt,
    })),
  };
}

const impronta = (snap) =>
  crypto.createHash("sha1").update(JSON.stringify(snap)).digest("hex");

/* ==================== REGISTRAZIONE ==================== */

// Registra lo stato attuale del post come nuova versione.
// Non solleva mai: la storia è un di più, non deve poter far fallire un
// salvataggio andato a buon fine.
async function registra(post, { user, origine = "salvataggio" } = {}) {
  try {
    const snap = fotografia(post);
    const hash = impronta(snap);

    const ultima = await PostVersion.findOne({ postId: post._id }).sort({ at: -1 });

    // Regola 1: stesso contenuto, nessuna nuova voce.
    if (ultima && ultima.hash === hash) return null;

    // Regola 3: se non c'è storia, questa è la prima voce e va marcata come
    // stato iniziale — è il punto a cui si potrà sempre tornare.
    if (!ultima) origine = origine === "ripristino" ? origine : "iniziale";

    // Regola 2: stessa persona, poco fa, e non è un ripristino → aggiorno la
    // voce esistente invece di crearne una nuova.
    const minuti = ultima ? (Date.now() - new Date(ultima.at).getTime()) / 60000 : Infinity;
    const stessaMano =
      ultima &&
      origine === "salvataggio" &&
      ultima.origine === "salvataggio" &&
      String(ultima.byId || "") === String(user?._id || "") &&
      minuti < FINESTRA_MIN();

    if (stessaMano) {
      ultima.snapshot = snap;
      ultima.hash = hash;
      ultima.at = new Date();
      await ultima.save();
      return ultima;
    }

    return await PostVersion.create({
      postId: post._id,
      clientId: post.clientId,
      at: new Date(),
      byId: user?._id,
      byName: user?.name || "",
      origine,
      snapshot: snap,
      hash,
    });
  } catch (e) {
    console.error("[versioni] non registrata:", e?.message);
    return null;
  }
}

/* ==================== LETTURA ==================== */

// Elenco leggibile, dalla più recente. Non restituisce le fotografie intere:
// per una lista servono solo i riferimenti, il contenuto si carica aprendo
// la singola versione.
async function elenco(postId, { limit = 100 } = {}) {
  const versioni = await PostVersion.find({ postId })
    .sort({ at: -1 })
    .limit(Math.min(Number(limit) || 100, 500))
    .lean();

  return versioni.map((v) => ({
    id: String(v._id),
    at: v.at,
    by: v.byName || "—",
    origine: v.origine,
    // Un assaggio del contenuto, per riconoscere la versione senza aprirla.
    anteprima: (v.snapshot?.caption || "").slice(0, 90),
    media: (v.snapshot?.media || []).length,
    note: (v.snapshot?.clientNotes || []).length,
    // Le foto di allora, in miniatura: una didascalia non basta a riconoscere
    // una versione, e chi ripristina lo fa quasi sempre per le immagini.
    // Sono indirizzi, non copie: non pesano niente.
    foto: (v.snapshot?.media || []).slice(0, 4).map((m) => ({
      kind: m.kind || "image",
      url: m.url,
      thumbUrl: m.thumbUrl || "",
    })),
  }));
}

const leggi = (id) => PostVersion.findById(id);

/* ==================== CONFRONTO ==================== */

const testo = (v) => (v == null ? "" : String(v));

// Cosa cambierebbe ripristinando questa versione. Serve a non far ripristinare
// alla cieca: si vede prima cosa si sta per rimettere.
function differenze(snap, post) {
  const ora = fotografia(post);
  const campi = [
    ["caption", "Didascalia"],
    ["category", "Rubrica"],
    ["publishStatus", "Stato di lavorazione"],
    ["status", "Stato"],
    ["sponsored", "Sponsorizzato"],
    ["day", "Giorno"],
    ["month", "Mese"],
    ["year", "Anno"],
  ];

  const out = [];
  for (const [k, etichetta] of campi)
    if (testo(snap[k]) !== testo(ora[k]))
      out.push({ campo: etichetta, prima: ora[k], dopo: snap[k] });

  const urlDi = (s) => (s.media || []).map((m) => m.url).join("|");
  if (urlDi(snap) !== urlDi(ora))
    out.push({
      campo: "Media",
      prima: `${(ora.media || []).length} file`,
      dopo: `${(snap.media || []).length} file`,
    });

  if ((snap.clientNotes || []).length !== (ora.clientNotes || []).length)
    out.push({
      campo: "Note",
      prima: `${(ora.clientNotes || []).length}`,
      dopo: `${(snap.clientNotes || []).length}`,
    });

  return out;
}

/* ==================== FILE ANCORA AL LORO POSTO ==================== */

const CARTELLE = () => {
  const base =
    process.env.UPLOAD_DIR ||
    process.env.RAILWAY_VOLUME_MOUNT_PATH ||
    "/data/uploads";
  return { uploads: base, "uploads-ped": path.join(base, "editorial") };
};

// I file di una versione che non esistono più da nessuna parte.
//
// La regola è che non spariscano mai da soli, ma qualcuno può averli
// cancellati a mano dall'Archivio: in quel caso il ripristino va fatto
// sapendolo, non scoprendolo dopo con un post pieno di immagini rotte.
async function filesMancanti(snap) {
  const urls = [];
  (snap?.media || []).forEach((m) => urls.push(m?.url));
  (snap?.clientNotes || []).forEach((n) =>
    (n?.media || []).forEach((m) => urls.push(m?.url))
  );

  const visti = new Set();
  const persi = [];
  for (const url of urls) {
    const loc = locate(url);
    if (!loc) continue; // link esterno: non è roba nostra
    const key = `${loc.folder}/${loc.name}`;
    if (visti.has(key)) continue;
    visti.add(key);
    try {
      if (await storage.headObject(key)) continue;
      if (fs.existsSync(path.join(CARTELLE()[loc.folder], loc.name))) continue;
      persi.push(loc.name);
    } catch (e) {
      // Bucket non raggiungibile: meglio non dire "manca" un file che c'è.
      console.error("[versioni] controllo file non riuscito:", key, e?.message);
    }
  }
  return persi;
}

/* ==================== RIPRISTINO ==================== */

// Rimette il post com'era. Prima di toccarlo registra lo stato attuale come
// versione: così anche un ripristino sbagliato si annulla, e non si perde
// mai niente.
async function ripristina(post, versione, { user } = {}) {
  await registra(post, { user, origine: "salvataggio" });

  const s = versione.snapshot;
  post.pageId = s.pageId;
  post.year = s.year;
  post.month = s.month;
  post.day = s.day;
  post.caption = s.caption;
  post.category = s.category;
  post.media = s.media;
  post.sponsored = s.sponsored;
  post.status = s.status;
  post.publishStatus = s.publishStatus;
  post.clientNotes = s.clientNotes;
  post.updatedAt = new Date();
  await post.save();

  await registra(post, { user, origine: "ripristino" });
  return post;
}

// Quando un post viene eliminato la sua storia non ha più senso: senza il
// post non si potrebbe nemmeno aprirla. Via anche quella, così i file che
// tratteneva tornano liberi per la pulizia.
const dimenticaPost = (postId) => PostVersion.deleteMany({ postId });

module.exports = {
  registra,
  elenco,
  leggi,
  differenze,
  filesMancanti,
  ripristina,
  dimenticaPost,
  fotografia,
};
