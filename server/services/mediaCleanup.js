// Cancellazione in blocco, per liberare spazio quando il bucket si riempie.
//
// Due tipi di pulizia, molto diversi tra loro:
//
//   ORFANI  — file che nessun post cita più (post cancellati nel tempo).
//             Non si vedono da nessuna parte: cancellarli non toglie niente
//             a nessuno. È la pulizia gratis, senza conseguenze.
//
//   MESI    — i media di un cliente per un mese intero. Qui una conseguenza
//             c'è: quel piano perde le immagini. Per non lasciare post che
//             puntano a file inesistenti, i riferimenti vengono tolti ANCHE
//             dai post: restano didascalie, note e storico, spariscono le
//             foto. Meglio un piano senza immagini che un piano di immagini
//             rotte.
//
// ⚠️ Gli allegati del form (uploads/) non si toccano MAI da qui: sono file
// dei clienti e se ne va solo insieme alla loro richiesta.
const Post = require("../models/Post");
const storage = require("./storage");
const inventory = require("./mediaInventory");

const PREFISSO = "uploads-ped/";

const soloNostri = (keys) =>
  [...new Set(keys || [])].filter((k) => String(k).startsWith(PREFISSO));

// Cancella dal bucket un elenco di chiavi. Restituisce quante e quanto spazio.
async function cancellaChiavi(keys) {
  const out = { rimossi: 0, bytes: 0, errori: [] };
  for (const key of soloNostri(keys)) {
    try {
      const info = await storage.headObject(key);
      await storage.deleteObject(key);
      out.rimossi += 1;
      out.bytes += info?.size || 0;
    } catch (e) {
      out.errori.push(`${key}: ${e?.message || e}`);
    }
  }
  out.errori = out.errori.slice(0, 10);
  return out;
}

// Toglie dai post i riferimenti alle chiavi cancellate, così non restano
// immagini rotte in giro.
async function staccaDaiPost(keys) {
  const nomi = new Set(soloNostri(keys).map((k) => k.slice(PREFISSO.length)));
  if (!nomi.size) return 0;

  const daRipulire = (arr) =>
    (arr || []).filter((m) => {
      const a = inventory.locate(m?.url);
      const b = inventory.locate(m?.thumbUrl);
      // Se sparisce solo l'anteprima il media resta (senza poster); se
      // sparisce il file vero, il media non ha più senso.
      if (a && nomi.has(a.name)) return false;
      if (!a && b && nomi.has(b.name)) return false;
      return true;
    });

  const posts = await Post.find({
    $or: [
      { "media.url": { $regex: PREFISSO } },
      { "clientNotes.media.url": { $regex: PREFISSO } },
    ],
  });

  let toccati = 0;
  for (const p of posts) {
    const primaN = (p.media || []).length;
    p.media = daRipulire(p.media);
    let cambiato = p.media.length !== primaN;
    (p.clientNotes || []).forEach((n) => {
      const q = (n.media || []).length;
      n.media = daRipulire(n.media);
      if (n.media.length !== q) cambiato = true;
    });
    if (cambiato) {
      p.updatedAt = new Date();
      await p.save();
      toccati += 1;
    }
  }
  return toccati;
}

/* ==================== OPERAZIONI ==================== */

// Butta via tutto ciò che nessuno cita più. Nessun post viene toccato:
// per definizione non c'è niente da staccare.
async function svuotaOrfani({ dryRun = false } = {}) {
  const inv = await inventory.build();
  const keys = inv.orfani.map((o) => o.key);
  if (dryRun)
    return {
      dryRun: true,
      rimossi: keys.length,
      bytes: inv.totali.bytesOrfani,
      postToccati: 0,
    };
  const r = await cancellaChiavi(keys);
  return { ...r, postToccati: 0 };
}

// Cancella i media di uno o più (cliente, mese). I post restano, senza foto.
async function svuotaMesi(mesi = [], { dryRun = false } = {}) {
  if (!Array.isArray(mesi) || !mesi.length)
    throw new Error("Nessun mese selezionato.");

  const inv = await inventory.build();
  const scelti = new Set(
    mesi.map((m) => `${m.clientId}|${Number(m.year)}|${Number(m.month)}`)
  );
  const files = inv.files.filter((f) =>
    scelti.has(`${f.clientId}|${f.year}|${f.month}`)
  );
  const keys = files.map((f) => f.key);

  if (dryRun)
    return {
      dryRun: true,
      rimossi: keys.length,
      bytes: files.reduce((n, f) => n + (f.bytes || 0), 0),
      postToccati: new Set(files.map((f) => f.postId)).size,
    };

  // Prima si staccano dai post, poi si cancellano: se qualcosa va storto a
  // metà strada è meglio avere file orfani (recuperabili con un giro di
  // pulizia) che post che puntano nel vuoto.
  const postToccati = await staccaDaiPost(keys);
  const r = await cancellaChiavi(keys);
  return { ...r, postToccati };
}

// Cancella singoli file scelti a mano dalla vista "chi pesa di più".
async function svuotaFile(keys = [], { dryRun = false } = {}) {
  const nostre = soloNostri(keys);
  if (!nostre.length) throw new Error("Nessun file selezionato.");
  if (dryRun) return { dryRun: true, rimossi: nostre.length, bytes: 0, postToccati: 0 };
  const postToccati = await staccaDaiPost(nostre);
  const r = await cancellaChiavi(nostre);
  return { ...r, postToccati };
}

module.exports = { svuotaOrfani, svuotaMesi, svuotaFile };
