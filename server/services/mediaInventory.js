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
const PostVersion = require("../models/PostVersion");
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
    // Il poster di un video è un file a parte: se sparisce lui, il video
    // resta ma senza anteprima.
    const t = locate(m?.thumbUrl);
    if (loc)
      out.push({ ...loc, kind: m.kind || "image", origine, thumb: t?.name || "" });
    if (t) out.push({ ...t, kind: "image", origine: `${origine} (anteprima)` });
  };
  (post.media || []).forEach((m) => push(m, "post"));
  (post.clientNotes || []).forEach((n, i) =>
    (n.media || []).forEach((m) => push(m, n.fromAgency ? "nota agenzia" : "nota cliente"))
  );
  return out;
}

// Gli stessi riferimenti, ma dentro le fotografie dello storico delle
// versioni. Un file può non essere più in nessun post e servire lo stesso: se
// una versione di tre mesi fa lo mostra, ripristinandola deve tornare al suo
// posto. Per questo non è un file "orfano" — cancellarlo lascerebbe un buco.
async function citatiDalloStorico() {
  const out = new Set();
  const versioni = await PostVersion.find({})
    .select("snapshot.media snapshot.clientNotes")
    .lean();

  const push = (m) => {
    for (const u of [m?.url, m?.thumbUrl]) {
      const loc = locate(u);
      if (loc) out.add(`${loc.folder}/${loc.name}`);
    }
  };
  for (const v of versioni) {
    (v.snapshot?.media || []).forEach(push);
    (v.snapshot?.clientNotes || []).forEach((n) => (n?.media || []).forEach(push));
  }
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

  const [posts, clients, storico] = await Promise.all([
    Post.find(filtro)
      .select("clientId year month day caption media clientNotes")
      .lean(),
    Client.find({}).select("name").lean(),
    citatiDalloStorico(),
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
        // Percorso pubblico: serve al pannello per mostrare l'anteprima.
        // Relativo e non assoluto, così vale con qualsiasi indirizzo del
        // server e non si porta dietro URL vecchi salvati nei post.
        path: `/${key}`,
        thumb: ref.thumb ? `/${ref.folder}/${ref.thumb}` : "",
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
  //
  // ⚠️ Solo i media dei piani. Gli allegati del form (uploads/) NON compaiono
  // qui: nessun post li cita per definizione — appartengono alle richieste dei
  // clienti — e finirebbero nell'elenco di ciò che si può cancellare. Sono
  // loghi ed esecutivi altrui: non devono nemmeno essere proposti.
  //
  // ⚠️ E nemmeno i file trattenuti dallo storico delle versioni: nessun post
  // li mostra più, ma una versione sì, e cancellarli vorrebbe dire
  // ripristinarla con un buco al posto della foto. Finiscono in un elenco a
  // parte: si possono comunque buttare, ma sapendo cosa si perde.
  const orfani = [];
  const trattenuti = [];
  if (bucketLetto)
    for (const [key, bytes] of suBucket)
      if (key.startsWith("uploads-ped/") && !citati.has(key)) {
        const voce = {
          key,
          name: path.basename(key),
          path: `/${key}`, // serve l'anteprima anche qui: non si cancella al buio
          kind: /\.(mp4|mov|m4v|webm)$/i.test(key) ? "video" : "image",
          bytes,
        };
        (storico.has(key) ? trattenuti : orfani).push(voce);
      }

  const somma = (arr) => arr.reduce((n, f) => n + (f.bytes || 0), 0);
  return {
    bucketLetto,
    files,
    orfani,
    trattenuti,
    totali: {
      citati: files.length,
      mancanti: files.filter((f) => f.stato === "mancante").length,
      soloDisco: files.filter((f) => f.stato === "soloDisco").length,
      bytes: somma(files),
      orfani: orfani.length,
      bytesOrfani: somma(orfani),
      trattenuti: trattenuti.length,
      bytesTrattenuti: somma(trattenuti),
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
        anteprime: [],
      });
    const g = gruppi.get(k);
    g.files += 1;
    g.bytes += f.bytes || 0;
    if (f.kind === "video") g.video += 1;
    if (f.stato === "mancante") g.mancanti += 1;
    g.keys.push(f.key);
    // Poche anteprime per riga: servono a riconoscere il mese a colpo
    // d'occhio, non a sfogliarlo.
    if (g.anteprime.length < 6 && f.stato !== "mancante")
      g.anteprime.push({ path: f.path, thumb: f.thumb, kind: f.kind });
  }
  return [...gruppi.values()];
}

module.exports = { build, byMonth, locate };
