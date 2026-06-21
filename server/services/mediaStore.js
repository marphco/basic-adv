// Storage dei MEDIA dei piani editoriali (foto/video dei post + allegati alle
// note del cliente).
//
// ⚠️ INTERIM: salva sul volume Railway in una SOTTOCARTELLA dedicata
// (`<UPLOAD_DIR>/editorial`) servita su una route separata `/uploads-ped`.
// NON tocca in alcun modo l'upload del form AI (UPLOAD_DIR + /uploads + multer
// `upload`): destinazione, route e istanza multer sono distinte.
//
// 🔜 MIGRAZIONE A R2: cambiare SOLO questo file — `saveBackend`/`publicUrl`
// passano a S3/R2; i chiamanti (rotte) restano identici perché ricevono già URL
// assoluti dall'helper `toMedia()`.
const path = require("path");
const fs = require("fs");
const multer = require("multer");

const BASE =
  process.env.UPLOAD_DIR ||
  process.env.RAILWAY_VOLUME_MOUNT_PATH ||
  "/data/uploads";
const PED_DIR = path.join(BASE, "editorial");
if (!fs.existsSync(PED_DIR)) fs.mkdirSync(PED_DIR, { recursive: true });

// Tipi consentiti: solo immagini e video (niente eseguibili/altro).
const ALLOWED =
  /^(image\/(jpeg|jpg|png|webp|gif|heic|heif)|video\/(mp4|quicktime|webm|x-m4v))$/i;
const MAX_BYTES = 60 * 1024 * 1024; // 60MB/file (video brevi)

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, PED_DIR),
  filename: (req, file, cb) => {
    const ext = (path.extname(file.originalname || "") || "")
      .slice(0, 10)
      .replace(/[^.a-z0-9]/gi, "");
    const uniq = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `ped-${uniq}${ext}`);
  },
});

const mediaUpload = multer({
  storage,
  limits: { fileSize: MAX_BYTES, files: 10 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED.test(file.mimetype)) cb(null, true);
    else cb(new Error("Tipo file non consentito (solo foto e video)."));
  },
});

// Esegue il middleware multer e converte gli errori in 400 JSON (così non
// finiscono nell'error handler globale).
function handleUpload(mw) {
  return (req, res, next) =>
    mw(req, res, (err) => {
      if (!err) return next();
      const msg =
        err.code === "LIMIT_FILE_SIZE"
          ? "File troppo grande (max 60MB)."
          : err.message || "Caricamento non riuscito.";
      res.status(400).json({ error: msg });
    });
}

const kindOf = (mimetype) => (/^video\//i.test(mimetype) ? "video" : "image");

// Base URL pubblica del SERVER (dietro al proxy Railway).
function reqBase(req) {
  const proto = String(
    req.headers["x-forwarded-proto"] || req.protocol || "https"
  )
    .split(",")[0]
    .trim();
  const host = req.headers["x-forwarded-host"] || req.get("host");
  return `${proto}://${host}`;
}

// Percorso pubblico relativo del file salvato.
const publicPath = (filename) => `/uploads-ped/${filename}`;

// Converte i file multer in oggetti media {kind,url,thumbUrl} con URL ASSOLUTO.
const toMedia = (req, files) =>
  (files || []).map((f) => ({
    kind: kindOf(f.mimetype),
    url: `${reqBase(req)}${publicPath(f.filename)}`,
    thumbUrl: "",
  }));

// Elimina i file caricati (cleanup su accesso negato/errore).
async function removeFiles(files) {
  await Promise.allSettled(
    (files || []).map((f) => fs.promises.unlink(f.path))
  );
}

// True se l'URL è un media servito da NOI (whitelist anti-URL arbitrari nelle
// note): evita di salvare link esterni nelle note del cliente.
const isOwnMediaUrl = (u) => /\/uploads-ped\/[\w.-]+$/i.test(String(u || ""));

module.exports = {
  PED_DIR,
  mediaUpload,
  handleUpload,
  toMedia,
  removeFiles,
  isOwnMediaUrl,
  kindOf,
};
