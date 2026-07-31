// Inventario dei media: che fine ha fatto ogni file citato nei piani.
//
// Serve a due domande diverse che però hanno bisogno degli stessi dati:
//
//   "questa immagine non si vede più: dov'è finita?"
//   "sto per riempire il bucket: cosa pesa di più e posso cancellarlo?"
//
// Il punto di partenza NON è l'elenco dei file, ma l'elenco di ciò che i
// piani editoriali chiedono di mostrare: un file che nessuno cita è spazio
// sprecato, e un file citato che non esiste è un'immagine rotta. Solo
// mettendo le due liste una accanto all'altra si vede la verità.
const fs = require("fs");
const path = require("path");
const Post = require("../models/Post");
const Client = require("../models/Client");
const storage = require("./storage");

const BASE = () =>
  process.env.UPLOAD_DIR ||
  process.env.RAILWAY_VOLUME_MOUNT_PATH ||
  "/data/uploads";

const DIRS = {
  uploads: () => BASE(),
  "uploads-ped": () => path.join(BASE(), "editorial"),
};

// Da un URL (assoluto o relativo) al nome del file e alla cartella pubblica.
// Restituisce null per gli URL che non sono nostri (link esterni nelle note).
function locate(url) {
  const s = String(url || "");
  const m = s.match(/\/(uploads-ped|uploads)\/([^/?#]+)$/);
  if (!m) return null;
  let name = m[2];
  try {
    name = decodeURIComponent(name);
  } catch {
    /* nome non decodificabile: lo uso com'è */
  }
  return { folder: m[1], name: path.basename(name) };
}

const MESI = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre",
];

/* ==================== RACCOLTA ==================== */

// Tutti i riferimenti a media presenti nei post: quelli del post e quelli
// allegati alle note (agenzia e cliente).
function refsOfPost(post) {
  const out = [];
  const push = (m, origine) => {
    const loc = locate(m?.url);
    if (loc) out.push({ ...loc, kind: m.kind || "image", origine });
    // Il poster di un video è un file a parte: se sparisce lui, il video
    // resta ma senza anteprima.
    const t = locate(m?.thumbUrl);
    if (t) out.push({ ...t, kind: "image", origine: `${origine} (anteprima)` });
  };
  (post.media || []).forEach((m) => push(m, "post"));
  (post.clientNotes || []).forEach((n, i) =>
    (n.media || []).forEach((m) => push(m, n.fromAgency ? "nota agenzia" : "nota cliente"))
  );
  return out;
}

/* ==================== INVENTARIO ==================== */

// Restituisce, per ogni file citato: dove si trova, quanto pesa, e a quale
// cliente/mese/giorno/post appartiene.
//
// `stato` può essere:
//   ok        → è sul bucket (o sul volume): si vede
//   soloDisco → esiste solo sul volume: da copiare prima di staccarlo
//   mancante  → non c'è da nessuna parte: è un'immagine rotta
async function build({ clientId = "", year = 0, month = 0 } = {}) {
  const filtro = {};
  if (clientId) filtro.clientId = clientId;
  if (year) filtro.year = Number(year);
  if (month) filtro.month = Number(month);

  const [posts, clients] = await Promise.all([
    Post.find(filtro)
      .select("clientId year month day caption media clientNotes")
      .lean(),
    Client.find({}).select("name").lean(),
  ]);
  const nomeCliente = new Map(clients.map((c) => [String(c._id), c.name || "—"]));

  // Cosa c'è davvero sul bucket, in una volta sola.
  const suBucket = new Map();
  let bucketLetto = false;
  if (storage.isR2Configured()) {
    try {
      for (const o of await storage.listObjects("")) suBucket.set(o.key, o.size || 0);
      bucketLetto = true;
    } catch (e) {
      console.error("[inventario] elenco bucket non riuscito:", e?.message);
    }
  }

  const citati = new Set();
  const files = [];

  for (const p of posts) {
    for (const ref of refsOfPost(p)) {
      const key = `${ref.folder}/${ref.name}`;
      if (citati.has(key)) continue; // stesso file in più post: conta una volta
      citati.add(key);

      const localPath = path.join(DIRS[ref.folder](), ref.name);
      let bytesDisco = 0;
      try {
        bytesDisco = fs.statSync(localPath).size;
      } catch {
        bytesDisco = 0;
      }
      const bytesBucket = suBucket.has(key) ? suBucket.get(key) : null;

      const stato =
        bytesBucket != null ? "ok" : bytesDisco ? "soloDisco" : "mancante";

      files.push({
        key,
        name: ref.name,
        kind: ref.kind,
        origine: ref.origine,
        bytes: bytesBucket != null ? bytesBucket : bytesDisco,
        stato,
        clientId: String(p.clientId),
        cliente: nomeCliente.get(String(p.clientId)) || "—",
        year: p.year,
        month: p.month,
        day: p.day,
        mese: `${MESI[(p.month || 1) - 1]} ${p.year}`,
        caption: (p.caption || "").slice(0, 80),
        postId: String(p._id),
      });
    }
  }

  // File presenti sul bucket che nessun post cita più: sono i post cancellati
  // nel tempo. Occupano spazio e non li vede nessuno.
  const orfani = [];
  if (bucketLetto)
    for (const [key, bytes] of suBucket)
      if (!citati.has(key)) orfani.push({ key, name: path.basename(key), bytes });

  const somma = (arr) => arr.reduce((n, f) => n + (f.bytes || 0), 0);
  return {
    bucketLetto,
    files,
    orfani,
    totali: {
      citati: files.length,
      mancanti: files.filter((f) => f.stato === "mancante").length,
      soloDisco: files.filter((f) => f.stato === "soloDisco").length,
      bytes: somma(files),
      orfani: orfani.length,
      bytesOrfani: somma(orfani),
    },
  };
}

/* ==================== VISTE ==================== */

// Raggruppa per cliente + mese: è l'unità con cui si ragiona quando si fa
// pulizia ("il piano di marzo di quel cliente non serve più").
function byMonth(files) {
  const gruppi = new Map();
  for (const f of files) {
    const k = `${f.clientId}|${f.year}|${f.month}`;
    if (!gruppi.has(k))
      gruppi.set(k, {
        chiave: k,
        clientId: f.clientId,
        cliente: f.cliente,
        year: f.year,
        month: f.month,
        mese: f.mese,
        files: 0,
        bytes: 0,
        video: 0,
        mancanti: 0,
        keys: [],
      });
    const g = gruppi.get(k);
    g.files += 1;
    g.bytes += f.bytes || 0;
    if (f.kind === "video") g.video += 1;
    if (f.stato === "mancante") g.mancanti += 1;
    g.keys.push(f.key);
  }
  return [...gruppi.values()];
}

module.exports = { build, byMonth, locate };
