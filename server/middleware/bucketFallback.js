// Serve dal bucket i file che NON si trovano (più) sul volume.
//
// Va montato SEMPRE DOPO `express.static`: finché un file esiste su disco lo
// serve express.static esattamente come prima — questo middleware non viene
// nemmeno raggiunto. Diventa utile solo per i file che stanno soltanto sul
// bucket, cioè dopo la migrazione. Se il bucket non è configurato, o se
// l'oggetto non c'è, passa oltre e la richiesta finisce nel 404 di sempre.
//
// Gli URL pubblici non cambiano: /uploads/<file> e /uploads-ped/<file>
// restano quelli, cambia solo da dove arrivano i byte.
const storage = require("../services/storage");

function bucketFallback(folder) {
  return async (req, res, next) => {
    if (req.method !== "GET" && req.method !== "HEAD") return next();
    if (!storage.isR2Configured()) return next();

    let name = "";
    try {
      name = storage.safeName(decodeURIComponent(req.path.replace(/^\/+/, "")));
    } catch {
      return next(); // percorso non decodificabile: non è roba nostra
    }
    if (!name) return next();

    try {
      const obj = await storage.getObject(
        storage.keyFor(folder, name),
        req.headers.range
      );
      if (!obj) return next();

      if (obj.contentType) res.setHeader("Content-Type", obj.contentType);
      if (obj.contentLength != null)
        res.setHeader("Content-Length", obj.contentLength);
      if (obj.etag) res.setHeader("ETag", obj.etag);
      if (obj.lastModified)
        res.setHeader("Last-Modified", new Date(obj.lastModified).toUTCString());
      // I nomi dei file sono già unici (timestamp + random): il contenuto di un
      // URL non cambia mai, quindi la cache può essere lunga.
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      // Richieste parziali: senza, nei video non si può spostare la timeline.
      res.setHeader("Accept-Ranges", "bytes");
      if (obj.contentRange) {
        res.status(206);
        res.setHeader("Content-Range", obj.contentRange);
      }

      if (req.method === "HEAD") return res.end();
      obj.body.on("error", () => res.destroy());
      obj.body.pipe(res);
    } catch (e) {
      console.error("[storage] lettura dal bucket fallita:", e?.message);
      next();
    }
  };
}

module.exports = bucketFallback;
