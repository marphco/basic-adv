// Recupero di un cliente eliminato per sbaglio, con tutti i suoi post.
//
// Quando un cliente viene eliminato spariscono il cliente e i suoi post, ma
// NON lo storico delle versioni dei post (PostVersion), né gli invii, le
// aperture e le approvazioni del piano, e nemmeno i file (foto, video, PDF):
// lo storico li tiene. Da lì si ricostruisce tutto:
//  - il cliente con lo STESSO identificativo, così storico invii, aperture,
//    approvazioni e link già mandati tornano a funzionare da soli;
//  - le pagine con gli stessi identificativi usati dai post (i nomi non sono
//    salvati da nessuna parte: si rimettono dalla scheda);
//  - ogni post com'era all'ultimo salvataggio, con lo stesso identificativo
//    (così anche il suo storico delle versioni resta attaccato).
//
// Non tocca niente di ciò che esiste: se il cliente c'è già non fa nulla, e
// un post che esiste già non viene sovrascritto.
//
// Query semplici apposta (niente aggregazioni): si usa di rado, su qualche
// migliaio di versioni al massimo.

const mongoose = require("mongoose");
const Client = require("../models/Client");
const Post = require("../models/Post");
const User = require("../models/User");
const PostVersion = require("../models/PostVersion");
const PlanNotification = require("../models/PlanNotification");

const id = (x) => String(x || "");
const STATI = Post.schema.path("status").enumValues;
const PUBBLICAZIONE = Post.schema.path("publishStatus").enumValues;

// L'ultima versione di ogni post di un cliente.
async function ultimeVersioni(clientId) {
  const versioni = await PostVersion.find({ clientId })
    .sort({ at: -1 })
    .select("postId at byId snapshot")
    .lean();
  const ultime = new Map();
  for (const v of versioni) if (!ultime.has(id(v.postId))) ultime.set(id(v.postId), v);
  return [...ultime.values()];
}

// Gli indirizzi a cui è stato mandato il piano l'ultima volta.
async function ultimiDestinatari(clientId) {
  const n = await PlanNotification.findOne({ clientId, kind: "client" })
    .sort({ at: -1 })
    .select("recipients")
    .lean();
  return [...new Set((n?.recipients || []).map((r) => String(r.email || "").trim()).filter(Boolean))];
}

// Clienti che non esistono più ma hanno post recuperabili.
async function elencoEliminati() {
  const ids = (await PostVersion.distinct("clientId")).map(id);
  if (!ids.length) return [];
  const esistenti = new Set(
    (await Client.find({ _id: { $in: ids } }).select("_id").lean()).map((c) => id(c._id))
  );
  const mancanti = ids.filter((x) => !esistenti.has(x));

  const out = [];
  for (const clientId of mancanti) {
    const ultime = await ultimeVersioni(clientId);
    // i post che esistono ancora non contano (non c'è niente da recuperare)
    const vivi = new Set(
      (await Post.find({ _id: { $in: ultime.map((v) => v.postId) } }).select("_id").lean()).map((p) => id(p._id))
    );
    const posts = ultime.filter((v) => !vivi.has(id(v.postId)));
    if (!posts.length) continue;

    const mesi = [...new Set(posts.map((v) => `${v.snapshot.year}-${String(v.snapshot.month).padStart(2, "0")}`))].sort();
    // per ogni pagina una didascalia d'esempio: aiuta a riconoscerla
    const pagine = [];
    for (const v of posts) {
      const pid = id(v.snapshot.pageId);
      if (pid && !pagine.some((p) => p.id === pid))
        pagine.push({ id: pid, esempio: String(v.snapshot.caption || "").slice(0, 80) });
    }
    out.push({
      clientId,
      post: posts.length,
      mesi,
      pagine,
      emails: await ultimiDestinatari(clientId),
      ultimaModifica: posts.reduce((mx, v) => (v.at > mx ? v.at : mx), posts[0].at),
    });
  }
  return out.sort((a, b) => new Date(b.ultimaModifica) - new Date(a.ultimaModifica));
}

// Ricostruisce il cliente e i suoi post. `nome` lo sceglie chi recupera.
async function ripristina(clientId, { nome, user }) {
  if (!mongoose.isValidObjectId(clientId)) throw new Error("Cliente non valido");
  if (await Client.exists({ _id: clientId }))
    return { gia: true, clienti: 0, post: 0 };

  const ultime = await ultimeVersioni(clientId);
  const vivi = new Set(
    (await Post.find({ _id: { $in: ultime.map((v) => v.postId) } }).select("_id").lean()).map((p) => id(p._id))
  );
  const daRifare = ultime.filter((v) => !vivi.has(id(v.postId)) && v.snapshot?.pageId);
  if (!daRifare.length) throw new Error("Niente da recuperare per questo cliente");

  const pagine = [];
  for (const v of daRifare) {
    const pid = id(v.snapshot.pageId);
    if (!pagine.includes(pid)) pagine.push(pid);
  }
  const emails = await ultimiDestinatari(clientId);

  await Client.create({
    _id: clientId,
    name: String(nome || "").trim() || "Cliente recuperato",
    emails,
    email: emails[0] || "",
    // i nomi delle pagine non sono salvati altrove: si rimettono dalla scheda
    pages: pagine.map((pid, i) => ({ _id: pid, name: `Pagina ${i + 1}`, channels: ["other"] })),
    createdBy: user?._id,
  });
  // chi recupera ne diventa operatore (la scheda ne vuole almeno uno)
  if (user?._id)
    await User.updateOne({ _id: user._id }, { $addToSet: { assignedClients: clientId } });

  const docs = daRifare.map((v) => {
    const s = v.snapshot;
    return {
      _id: v.postId,
      clientId,
      pageId: s.pageId,
      year: s.year,
      month: s.month,
      day: s.day,
      caption: s.caption || "",
      category: s.category || "",
      media: s.media || [],
      sponsored: !!s.sponsored,
      // valori fuori elenco (versioni vecchie) → quelli predefiniti, non un
      // post perso
      ...(STATI.includes(s.status) ? { status: s.status } : {}),
      ...(PUBBLICAZIONE.includes(s.publishStatus) ? { publishStatus: s.publishStatus } : {}),
      clientNotes: s.clientNotes || [],
      createdBy: v.byId,
    };
  });
  // ordered:false → un post rovinato non blocca gli altri
  let creati = 0;
  try {
    creati = (await Post.insertMany(docs, { ordered: false })).length;
  } catch (e) {
    creati = e?.insertedDocs?.length ?? e?.result?.insertedCount ?? 0;
    console.error("[recupero] alcuni post non recuperati:", e?.message);
  }
  return { gia: false, clienti: 1, post: creati, totale: docs.length, pagine: pagine.length };
}

module.exports = { elencoEliminati, ripristina };
