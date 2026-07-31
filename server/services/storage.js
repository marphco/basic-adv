// Storage dei file caricati (allegati del form AI e media dei piani
// editoriali). Due modalità, scelte da MEDIA_STORAGE:
//
//   disk (predefinito) → volume Railway, esattamente come è sempre stato
//   r2                 → bucket S3-compatibile (Cloudflare R2)
//
// ⚠️ REGOLA DI SICUREZZA DELLA MIGRAZIONE: in LETTURA il disco viene sempre
// per primo. Il bucket è un ripiego, non un sostituto. Così, finché un file
// esiste sul volume, continua a essere servito da lì e nessun URL può
// rompersi — nemmeno a migrazione incompleta o interrotta a metà.
//
// In SCRITTURA decide MEDIA_STORAGE: con `disk` non viene toccato nulla di
// remoto, quindi il comportamento resta identico a oggi finché non si sceglie
// esplicitamente il contrario.
//
// Variabili: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET.
const fs = require("fs");
const path = require("path");

let S3 = null; // caricato solo se serve davvero
let cachedClient = null;

const cfg = () => ({
  mode: (process.env.MEDIA_STORAGE || "disk").toLowerCase() === "r2" ? "r2" : "disk",
  accountId: process.env.R2_ACCOUNT_ID || "",
  accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
  bucket: process.env.R2_BUCKET || "",
  // Endpoint alternativo: i bucket creati con "Specifica giurisdizione"
  // (es. Unione Europea) rispondono su <account>.eu.r2.cloudflarestorage.com
  // e non sull'indirizzo standard. Lasciando vuoto si usa quello standard.
  endpoint: process.env.R2_ENDPOINT || "",
});

const mode = () => cfg().mode;

// True solo se TUTTE le credenziali ci sono: senza, il bucket non viene
// nemmeno contattato e resta tutto su disco.
function isR2Configured() {
  const c = cfg();
  return !!(c.accountId && c.accessKeyId && c.secretAccessKey && c.bucket);
}

function client() {
  if (!isR2Configured()) return null;
  if (cachedClient) return cachedClient;
  const c = cfg();
  if (!S3) S3 = require("@aws-sdk/client-s3");
  cachedClient = new S3.S3Client({
    region: "auto", // R2 non usa regioni
    endpoint: c.endpoint || `https://${c.accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: c.accessKeyId, secretAccessKey: c.secretAccessKey },
  });
  return cachedClient;
}

/* ============================ CHIAVI ============================ */

// La chiave nel bucket ricalca il percorso pubblico, senza lo slash iniziale:
//   /uploads-ped/ped-123.jpg  →  uploads-ped/ped-123.jpg
//   /uploads/logo-x.pdf       →  uploads/logo-x.pdf
// Così un file è rintracciabile da entrambe le parti senza tabelle di
// conversione, e il prefisso dice subito a quale sistema appartiene.
const keyFor = (folder, filename) => `${folder}/${path.basename(filename)}`;

// Solo il nome file: nessun percorso, niente risalite con "..".
const safeName = (filename) => path.basename(String(filename || ""));

/* ============================ SCRITTURA ============================ */

// Carica un file locale sul bucket. Non cancella l'originale: la cancellazione
// è una decisione separata, presa solo a migrazione verificata.
//
// `metadata` sono etichette libere che restano attaccate all'oggetto e
// tornano indietro con headObject. Servono alla migrazione per riconoscere
// ciò che ha già copiato: dopo la compressione il file sul bucket non pesa
// più come quello sul disco, quindi il confronto delle dimensioni non basta
// più e serve un riferimento all'originale.
async function putFile({ localPath, key, contentType, metadata }) {
  const c = cfg();
  if (!isR2Configured()) throw new Error("Bucket non configurato");
  if (!S3) S3 = require("@aws-sdk/client-s3");
  await client().send(
    new S3.PutObjectCommand({
      Bucket: c.bucket,
      Key: key,
      Body: fs.createReadStream(localPath),
      ContentType: contentType || "application/octet-stream",
      ContentLength: fs.statSync(localPath).size,
      Metadata: metadata || undefined,
    })
  );
  return key;
}

/* ============================ LETTURA ============================ */

// Metadati di un oggetto, o null se non c'è (404 compreso: non è un errore,
// è la risposta "sul bucket non c'è").
async function headObject(key) {
  const c = cfg();
  if (!isR2Configured()) return null;
  if (!S3) S3 = require("@aws-sdk/client-s3");
  try {
    const r = await client().send(
      new S3.HeadObjectCommand({ Bucket: c.bucket, Key: key })
    );
    return {
      key,
      size: r.ContentLength,
      contentType: r.ContentType,
      lastModified: r.LastModified,
      metadata: r.Metadata || {},
    };
  } catch (e) {
    if (e?.$metadata?.httpStatusCode === 404 || e?.name === "NotFound") return null;
    throw e;
  }
}

// Contenuto di un oggetto. `range` (es. "bytes=0-1023") viene passato tale e
// quale: serve allo streaming dei video, che senza richieste parziali non
// permettono di spostarsi nella timeline.
async function getObject(key, range) {
  const c = cfg();
  if (!isR2Configured()) return null;
  if (!S3) S3 = require("@aws-sdk/client-s3");
  try {
    const r = await client().send(
      new S3.GetObjectCommand({ Bucket: c.bucket, Key: key, Range: range || undefined })
    );
    return {
      body: r.Body,
      contentType: r.ContentType,
      contentLength: r.ContentLength,
      contentRange: r.ContentRange,
      lastModified: r.LastModified,
      etag: r.ETag,
    };
  } catch (e) {
    if (e?.$metadata?.httpStatusCode === 404 || e?.name === "NoSuchKey") return null;
    throw e;
  }
}

/* ============================ ELENCO / CANCELLAZIONE ============================ */

// Tutti gli oggetti con un prefisso (paginazione inclusa).
async function listObjects(prefix = "") {
  const c = cfg();
  if (!isR2Configured()) return [];
  if (!S3) S3 = require("@aws-sdk/client-s3");
  const out = [];
  let token;
  do {
    const r = await client().send(
      new S3.ListObjectsV2Command({
        Bucket: c.bucket,
        Prefix: prefix,
        ContinuationToken: token,
      })
    );
    (r.Contents || []).forEach((o) =>
      out.push({ key: o.Key, size: o.Size, lastModified: o.LastModified })
    );
    token = r.IsTruncated ? r.NextContinuationToken : undefined;
  } while (token);
  return out;
}

async function deleteObject(key) {
  const c = cfg();
  if (!isR2Configured()) return false;
  if (!S3) S3 = require("@aws-sdk/client-s3");
  await client().send(new S3.DeleteObjectCommand({ Bucket: c.bucket, Key: key }));
  return true;
}

// Spazio occupato, per il controllo della soglia.
async function usage(prefix = "") {
  const objects = await listObjects(prefix);
  return {
    files: objects.length,
    bytes: objects.reduce((n, o) => n + (o.size || 0), 0),
  };
}

// Lo stesso conto, ma diviso per provenienza: i media dei piani editoriali e
// gli allegati arrivati dalle richieste del sito. Sono due cose che si
// gestiscono in modo diverso — i primi si possono alleggerire e cancellare, i
// secondi sono file dei clienti — quindi vederli separati serve davvero.
// Una sola lettura del bucket, non due.
async function usageByFolder() {
  const vuoto = () => ({ files: 0, bytes: 0 });
  const out = { ped: vuoto(), richieste: vuoto(), totale: vuoto() };
  for (const o of await listObjects("")) {
    const dove = o.key.startsWith("uploads-ped/")
      ? out.ped
      : o.key.startsWith("uploads/")
      ? out.richieste
      : null;
    out.totale.files += 1;
    out.totale.bytes += o.size || 0;
    if (!dove) continue;
    dove.files += 1;
    dove.bytes += o.size || 0;
  }
  return out;
}

module.exports = {
  mode,
  isR2Configured,
  keyFor,
  safeName,
  putFile,
  headObject,
  getObject,
  listObjects,
  deleteObject,
  usage,
  usageByFolder,
};
