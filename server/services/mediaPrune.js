// Cancellazione dei file rimasti senza padrone.
//
// Quando un'immagine viene tolta da un post, o il post viene eliminato, il
// file continuerebbe a occupare spazio sul bucket per sempre senza che nessuno
// sappia più a chi apparteneva. Va tolto anche da lì.
//
// ⚠️ MA NON SUBITO E NON A OCCHI CHIUSI: con "Duplica mese" lo stesso file
// finisce dentro più post. Se lo cancellassimo perché UN post l'ha perso,
// romperemmo tutti gli altri che lo mostrano ancora. Quindi la regola è una
// sola: si cancella solo ciò che NESSUN post cita più.
const Post = require("../models/Post");
const PostVersion = require("../models/PostVersion");
const storage = require("./storage");
const { locate } = require("./mediaInventory");

// Tutti gli URL citati da un post: media del post, allegati delle note, e i
// poster dei video (che sono file a sé).
function urlsOf(post) {
  const out = [];
  const push = (m) => {
    if (m?.url) out.push(m.url);
    if (m?.thumbUrl) out.push(m.thumbUrl);
  };
  (post?.media || []).forEach(push);
  (post?.clientNotes || []).forEach((n) => (n?.media || []).forEach(push));
  return out;
}

// Qualcuno cita ancora questo file? Cerco sia tra i media dei post sia tra
// quelli delle note, e sia come immagine sia come anteprima.
//
// ⚠️ E anche nello STORICO DELLE VERSIONI. È la garanzia su cui si regge il
// ripristino: se una versione di tre mesi fa mostra quella foto, la foto non
// si tocca, altrimenti ripristinando si troverebbe un buco. Le versioni non
// si escludono mai — nemmeno quelle del post che stiamo modificando: è
// proprio la sua storia a doverla trattenere.
//
// Resta una sola via per cancellare davvero: il pannello Archivio, dove è una
// scelta esplicita di chi vuole liberare spazio.
async function ancoraUsato(url, esclusoPostId) {
  const condizioni = (prefisso) => [
    { [`${prefisso}media.url`]: url },
    { [`${prefisso}media.thumbUrl`]: url },
    { [`${prefisso}clientNotes.media.url`]: url },
    { [`${prefisso}clientNotes.media.thumbUrl`]: url },
  ];

  const filtro = { $or: condizioni("") };
  if (esclusoPostId) filtro._id = { $ne: esclusoPostId };
  if ((await Post.countDocuments(filtro)) > 0) return true;

  return (
    (await PostVersion.countDocuments({ $or: condizioni("snapshot.") })) > 0
  );
}

// Cancella dal bucket i file di `urls` che non sono più citati da nessuno.
// Non solleva mai: è pulizia, non deve poter far fallire il salvataggio di un
// post. Restituisce le chiavi effettivamente rimosse.
async function prune(urls, { esclusoPostId } = {}) {
  const rimosse = [];
  const visti = new Set();

  for (const url of urls || []) {
    const loc = locate(url);
    if (!loc) continue; // link esterno: non è roba nostra
    // Gli allegati del form non passano di qui, ma meglio essere espliciti:
    // sono file dei clienti e si cancellano solo con la loro richiesta.
    if (loc.folder !== "uploads-ped") continue;

    const key = `${loc.folder}/${loc.name}`;
    if (visti.has(key)) continue;
    visti.add(key);

    try {
      if (await ancoraUsato(url, esclusoPostId)) continue; // lo mostra qualcun altro
      await storage.deleteObject(key);
      rimosse.push(key);
    } catch (e) {
      console.error("[pulizia] file non rimosso dal bucket:", key, e?.message);
    }
  }

  if (rimosse.length)
    console.log(`[pulizia] rimossi dal bucket: ${rimosse.join(", ")}`);
  return rimosse;
}

// Differenza tra il prima e il dopo di un post: cosa non c'è più.
const removedUrls = (prima, dopo) => {
  const restano = new Set(urlsOf(dopo));
  return urlsOf(prima).filter((u) => !restano.has(u));
};

module.exports = { prune, urlsOf, removedUrls };
