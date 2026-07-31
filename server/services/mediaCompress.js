// Compressione automatica dei media caricati dagli operatori.
//
// Il principio: nessuno deve ricordarsi di preparare i file. Si carica quello
// che si ha in mano — foto da 12 megapixel, video dal telefono — e ci pensa
// l'app.
//
// "Senza perdere qualità" qui significa SENZA DIFFERENZA VISIBILE, non
// bit-per-bit: il grosso del risparmio viene dal ridimensionare (una foto da
// 4000px mostrata in un piano editoriale non serve a nulla) e da una
// ricodifica di qualità alta. Una compressione matematicamente senza perdite
// darebbe il 5-10%, cioè non risolverebbe il problema.
//
// Due strade diverse, per un motivo pratico:
//  - IMMAGINI: sincrone. Sono millisecondi, l'upload non se ne accorge.
//  - VIDEO: in coda, uno alla volta, DOPO aver risposto. Ricodificare costa
//    minuti di CPU: farlo durante la richiesta significherebbe far aspettare
//    l'operatore e rubare CPU al sito mentre i clienti lo usano. Il file
//    originale resta subito disponibile allo stesso indirizzo e viene
//    sostituito sul posto quando la ricodifica è pronta — quindi il nome non
//    cambia mai e nessun link si rompe.
const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");
const sharp = require("sharp");

const num = (v, def) => (Number.isFinite(Number(v)) ? Number(v) : def);

// Limiti: oltre non si guadagna nulla di visibile.
const IMG_MAX = () => num(process.env.MEDIA_IMG_MAX, 2560); // lato lungo
const IMG_QUALITY = () => num(process.env.MEDIA_IMG_QUALITY, 82);
const VIDEO_CRF = () => num(process.env.MEDIA_VIDEO_CRF, 21); // più basso = più qualità
const VIDEO_MAX_H = () => num(process.env.MEDIA_VIDEO_MAX_H, 1080);

const IMAGE_EXT = /\.(jpe?g|png|webp|gif|heic|heif|tiff?|avif)$/i;
// Solo contenitori compatibili con H.264: il webm resterebbe tale e la
// ricodifica VP9 costa troppo per quello che rende.
const VIDEO_EXT = /\.(mp4|mov|m4v)$/i;

const isImage = (name) => IMAGE_EXT.test(name);
const isVideo = (name) => VIDEO_EXT.test(name);

/* ============================ IMMAGINI ============================ */

// Sceglie il codificatore in base all'estensione di destinazione.
// null = formato che non ricodifichiamo (lo lasciamo com'è).
function encoderFor(pipeline, ext, q) {
  if (/\.jpe?g$/i.test(ext))
    return pipeline.jpeg({ quality: q, mozjpeg: true, progressive: true });
  if (/\.png$/i.test(ext)) return pipeline.png({ compressionLevel: 9, palette: true });
  if (/\.webp$/i.test(ext)) return pipeline.webp({ quality: q });
  if (/\.avif$/i.test(ext)) return pipeline.avif({ quality: q });
  return null;
}

// Il cuore della compressione immagini, in un posto solo: lo usano sia
// l'upload (che ricodifica sul posto) sia la migrazione (che scrive una copia
// altrove e non tocca il disco originale). Restituisce i byte scritti, o null
// se il formato non si ricodifica.
async function renderImage(src, dest, outExt) {
  const pipeline = sharp(src, { failOn: "none" })
    .rotate() // applica l'orientamento EXIF e lo azzera
    .resize({
      width: IMG_MAX(),
      height: IMG_MAX(),
      fit: "inside",
      withoutEnlargement: true, // mai ingrandire: si perderebbe solo spazio
    });
  const enc = encoderFor(pipeline, outExt, IMG_QUALITY());
  if (!enc) return null;
  await enc.toFile(dest);
  return fs.statSync(dest).size;
}

// Ricodifica un'immagine al suo posto. Regole:
//  - ridimensiona solo se supera il lato massimo (mai ingrandire);
//  - rispetta l'orientamento EXIF, altrimenti le foto da telefono ruotano;
//  - HEIC/HEIF e TIFF diventano JPEG: i browser non li mostrano, quindi qui
//    la conversione non è solo peso, è far funzionare l'anteprima;
//  - se il risultato non è più piccolo dell'originale, l'originale resta.
// Restituisce { filename, path, size, before } — il nome può cambiare solo
// per i formati non visualizzabili, che vengono convertiti PRIMA che l'URL
// venga costruito.
async function compressImage(file) {
  const before = fs.statSync(file.path).size;
  const ext = path.extname(file.path).toLowerCase();
  const dir = path.dirname(file.path);

  // GIF: spesso animate, e sharp le appiattirebbe. Meglio non toccarle.
  if (ext === ".gif") return null;

  const toJpeg = /\.(heic|heif|tiff?)$/i.test(ext);
  const outExt = toJpeg ? ".jpg" : ext;
  const outName = path.basename(file.path, ext) + outExt;
  const tmp = path.join(dir, `.tmp-${outName}`);

  const after = await renderImage(file.path, tmp, outExt);
  if (after == null) return null; // formato che non sappiamo ricodificare

  // Non peggiorare mai: se la ricodifica non guadagna nulla, tengo l'originale
  // (a meno che non fosse un formato da convertire per forza).
  if (after >= before && !toJpeg) {
    fs.unlinkSync(tmp);
    return { filename: file.filename, path: file.path, size: before, before };
  }

  const finalPath = path.join(dir, outName);
  fs.renameSync(tmp, finalPath);
  if (finalPath !== file.path) fs.unlinkSync(file.path); // era HEIC/TIFF

  return { filename: outName, path: finalPath, size: after, before };
}

// Versione per i file GIÀ ONLINE (migrazione sul bucket): scrive una copia
// compressa in `dest` e non tocca minimamente l'originale.
//
// Differenza sostanziale rispetto all'upload: qui il nome NON può cambiare,
// perché quel file è già linkato nei piani editoriali. Quindi niente
// conversione di formato — si ricodifica solo ciò che si può riscrivere
// nello stesso formato. HEIC, TIFF e GIF restano tali e vengono copiati
// così come sono.
// Restituisce i byte scritti, oppure null se non c'è nulla da guadagnare
// (in quel caso `dest` non esiste e va copiato l'originale).
async function compressImageTo(src, dest) {
  const ext = path.extname(src).toLowerCase();
  if (!/^\.(jpe?g|png|webp|avif)$/.test(ext)) return null;

  const before = fs.statSync(src).size;
  const after = await renderImage(src, dest, ext);
  if (after == null || after >= before) {
    // Nessun guadagno: meglio l'originale, bit per bit.
    try {
      fs.unlinkSync(dest);
    } catch {
      /* non è stato creato */
    }
    return null;
  }
  return after;
}

/* ============================ VIDEO ============================ */

const ffmpegPath = () => {
  try {
    return require("ffmpeg-static");
  } catch {
    return null;
  }
};

const run = (bin, args, timeoutMs) =>
  new Promise((resolve, reject) => {
    execFile(bin, args, { timeout: timeoutMs, maxBuffer: 8 * 1024 * 1024 }, (err) =>
      err ? reject(err) : resolve()
    );
  });

// Coda seriale: un video alla volta. Con più ricodifiche in parallelo la CPU
// finirebbe tutta lì e il sito rallenterebbe per tutti.
const queue = [];
let working = false;

async function drain() {
  if (working) return;
  working = true;
  while (queue.length) {
    const job = queue.shift();
    try {
      await transcodeVideo(job);
    } catch (e) {
      console.error("[media] ricodifica video fallita:", job.path, e?.message);
    }
  }
  working = false;
}

// Ricodifica `src` scrivendo in `dest`. Il contenitore lo decide l'estensione
// di `dest`, che teniamo sempre uguale a quella di partenza: così il nome del
// file non cambia mai e nessun link si rompe.
// Restituisce i byte scritti, o null se non c'è guadagno (in quel caso `dest`
// viene rimosso e va tenuto l'originale).
async function encodeVideo(src, dest, { preset = "medium", timeoutMs = 20 * 60 * 1000 } = {}) {
  const bin = ffmpegPath();
  if (!bin || !fs.existsSync(src)) return null;

  const before = fs.statSync(src).size;
  await run(
    bin,
    [
      "-y",
      "-i", src,
      "-vf", `scale='min(iw,trunc(iw*${VIDEO_MAX_H()}/ih/2)*2)':'min(ih,${VIDEO_MAX_H()})':force_original_aspect_ratio=decrease,scale=trunc(iw/2)*2:trunc(ih/2)*2`,
      "-c:v", "libx264",
      "-crf", String(VIDEO_CRF()),
      "-preset", preset,
      "-pix_fmt", "yuv420p", // massima compatibilità con i browser
      "-c:a", "aac",
      "-b:a", "128k",
      "-movflags", "+faststart", // parte subito senza scaricare tutto
      dest,
    ],
    timeoutMs
  );

  const after = fs.statSync(dest).size;
  if (after >= before) {
    fs.unlinkSync(dest); // era già ben compresso
    return null;
  }
  return after;
}

// Versione per la migrazione: copia compressa altrove, originale intoccato.
const transcodeVideoTo = (src, dest, opts) => encodeVideo(src, dest, opts);

// Ricodifica un video SOSTITUENDOLO sul posto: stesso nome, stesso
// contenitore, quindi l'URL già consegnato continua a funzionare.
async function transcodeVideo({ path: filePath }) {
  const bin = ffmpegPath();
  if (!bin || !fs.existsSync(filePath)) return;

  const before = fs.statSync(filePath).size;
  const tmp = path.join(path.dirname(filePath), `.tmp-${path.basename(filePath)}`);

  const after = await encodeVideo(filePath, tmp);
  if (after == null) return; // era già ben compresso: tengo l'originale

  fs.renameSync(tmp, filePath); // sostituzione atomica: il nome non cambia
  console.log(
    `[media] video ricompresso: ${path.basename(filePath)} ` +
      `${(before / 1048576).toFixed(1)} → ${(after / 1048576).toFixed(1)} MB`
  );
}

function queueVideo(file) {
  queue.push({ path: file.path });
  setImmediate(drain); // parte dopo che la risposta è già stata inviata
}

/* ============================ INGRESSO ============================ */

// Elabora i file appena caricati. Le immagini vengono compresse subito e i
// campi del file aggiornati (il nome può cambiare solo per HEIC/TIFF, prima
// che l'URL venga costruito); i video vengono messi in coda.
// Non solleva mai: se la compressione fallisce, il file originale resta valido.
async function processUploads(files = []) {
  for (const file of files) {
    try {
      if (isImage(file.filename)) {
        const r = await compressImage(file);
        if (r) {
          file.filename = r.filename;
          file.path = r.path;
          file.size = r.size;
        }
      } else if (isVideo(file.filename)) {
        queueVideo(file);
      }
    } catch (e) {
      console.error("[media] compressione fallita:", file?.filename, e?.message);
    }
  }
  return files;
}

module.exports = {
  processUploads,
  compressImage,
  compressImageTo,
  transcodeVideo,
  transcodeVideoTo,
  queueVideo,
  isImage,
  isVideo,
};
