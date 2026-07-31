// Cosa succede a un file appena caricato, dal momento in cui multer lo scrive
// su disco a quando è al suo posto definitivo.
//
// L'ordine dei passaggi è pensato per due obiettivi che vanno tenuti insieme:
// non far MAI aspettare chi carica, e non poter MAI perdere un file.
//
//   1. I formati che il browser non sa mostrare (HEIC dell'iPhone, TIFF)
//      vengono convertiti SUBITO. Devono per forza: cambiano nome, e il nome
//      finisce dentro l'URL che stiamo per restituire.
//   2. Se scriviamo sul bucket, il file ci viene caricato e VERIFICATO prima
//      di rispondere. Da quel momento è al sicuro anche se il server riparte
//      un secondo dopo.
//   3. La compressione avviene DOPO la risposta, in coda. La versione leggera
//      sostituisce quella sul bucket con la STESSA chiave: nessun link cambia,
//      e chi ha già l'URL in mano non se ne accorge.
//   4. Solo a quel punto, e solo in modalità bucket, la copia locale viene
//      rimossa: il volume non deve più accumulare niente.
//
// Se qualcosa nella fase 3 non riesce, sul bucket resta la versione grande.
// Pesa di più, ma funziona: meglio un file grande che un file mancante.
const fs = require("fs");
const path = require("path");
const mime = require("mime-types");
const storage = require("./storage");
const mediaCompress = require("./mediaCompress");

// Formati che cambiano nome quando vengono convertiti: vanno gestiti prima di
// costruire l'URL, non dopo.
const RENAME_EXT = /\.(heic|heif|tiff?)$/i;

const sizeOf = (p) => {
  try {
    return fs.statSync(p).size;
  } catch {
    return 0;
  }
};

/* ==================== BUCKET ==================== */

// Carica il file sul bucket e verifica rileggendo la dimensione. La chiave
// ricalca l'URL pubblico, quindi il file resta raggiungibile allo stesso
// indirizzo di sempre.
async function publish(file, folder) {
  const key = `${folder}/${file.filename}`;
  const size = sizeOf(file.path);
  await storage.putFile({
    localPath: file.path,
    key,
    contentType: mime.lookup(file.filename) || "application/octet-stream",
  });
  const check = await storage.headObject(key);
  if (!check || check.size !== size)
    throw new Error(
      `verifica fallita per ${key} (attesi ${size} byte, sul bucket ${
        check?.size ?? "assente"
      })`
    );
  return key;
}

/* ==================== CODE ==================== */

// Due code separate, non una. Le foto si comprimono in mezzo secondo, i video
// in minuti: con una coda sola, venti foto caricate dopo un video resterebbero
// grandi per tutto il tempo della ricodifica.
const queues = {
  image: { jobs: [], working: false },
  video: { jobs: [], working: false },
};

function enqueue(tipo, job) {
  const q = queues[tipo];
  q.jobs.push(job);
  if (!q.working) setImmediate(() => drain(tipo)); // dopo la risposta
}

async function drain(tipo) {
  const q = queues[tipo];
  if (q.working) return;
  q.working = true;
  while (q.jobs.length) {
    const job = q.jobs.shift();
    try {
      await job();
    } catch (e) {
      console.error("[media] lavorazione in coda non riuscita:", e?.message);
    }
  }
  q.working = false;
}

/* ==================== LAVORAZIONE ==================== */

// Comprime il file e, se serve, aggiorna la copia sul bucket. Gira DOPO la
// risposta: qui non c'è nessuno che aspetta.
async function refine(file, folder, { compress, toBucket }) {
  const tmp = path.join(path.dirname(file.path), `.min-${file.filename}`);
  try {
    let ridotto = null;
    if (compress) {
      if (mediaCompress.isImage(file.filename))
        ridotto = await mediaCompress.compressImageTo(file.path, tmp);
      else if (mediaCompress.isVideo(file.filename))
        ridotto = await mediaCompress.transcodeVideoTo(file.path, tmp);
    }

    if (ridotto) {
      const prima = sizeOf(file.path);
      fs.renameSync(tmp, file.path); // stesso nome: nessun link si rompe
      console.log(
        `[media] ${file.filename}: ${(prima / 1048576).toFixed(2)} → ` +
          `${(ridotto / 1048576).toFixed(2)} MB`
      );
      // Sul bucket c'è ancora la versione grande: la sostituisco.
      if (toBucket) await publish(file, folder);
    }
  } catch (e) {
    // Sul bucket resta la versione non compressa: pesa di più ma funziona.
    console.error("[media] compressione non riuscita:", file.filename, e?.message);
    try {
      fs.unlinkSync(tmp);
    } catch {
      /* non creato */
    }
  } finally {
    // In modalità bucket la copia locale ha esaurito il suo compito: il file
    // è già stato caricato e verificato prima della risposta.
    if (toBucket) {
      try {
        fs.unlinkSync(file.path);
      } catch {
        /* già sparito */
      }
    }
  }
}

/* ==================== INGRESSO ==================== */

// Prende in carico i file appena caricati.
//
// `folder` è il prefisso pubblico: "uploads" (allegati del form) oppure
// "uploads-ped" (media dei piani).
// `compress: false` per gli allegati dei clienti — loghi ed esecutivi vanno
// conservati esattamente come li hanno mandati.
// `strict: false` per i caricamenti in cui un problema col bucket non deve far
// fallire tutta la richiesta (il logo del form AI): in quel caso il file resta
// sul volume e la richiesta prosegue.
//
// Restituisce i file, con `filename`/`path`/`size` aggiornati se un formato è
// stato convertito.
async function receive(files, folder, { compress = true, strict = true } = {}) {
  const elenco = files || [];
  const toBucket = storage.mode() === "r2" && storage.isR2Configured();

  for (const file of elenco) {
    // 1. Conversione dei formati non visualizzabili: cambia il nome, quindi
    //    deve succedere prima che l'URL venga costruito.
    if (compress && RENAME_EXT.test(file.filename)) {
      try {
        const r = await mediaCompress.compressImage(file);
        if (r) {
          file.filename = r.filename;
          file.path = r.path;
          file.size = r.size;
        }
      } catch (e) {
        console.error("[media] conversione non riuscita:", file.filename, e?.message);
      }
    }

    // 2. Messa in salvo sul bucket, prima di rispondere.
    if (toBucket) {
      try {
        await publish(file, folder);
      } catch (e) {
        if (strict) throw e; // meglio un errore chiaro che un file perso
        console.error("[media] caricamento sul bucket non riuscito:", e?.message);
        continue; // resta sul volume: non lo cancello e non lo comprimo
      }
    }

    // 3. Compressione (e pulizia della copia locale) dopo la risposta.
    const tipo = mediaCompress.isVideo(file.filename) ? "video" : "image";
    const lavoro = { ...file }; // fotografia dei dati: il chiamante può mutare
    enqueue(tipo, () => refine(lavoro, folder, { compress, toBucket }));
  }

  return elenco;
}

// Quanti lavori sono ancora in coda: serve ai test e alla diagnosi.
const pending = () => queues.image.jobs.length + queues.video.jobs.length;

module.exports = { receive, publish, pending };
