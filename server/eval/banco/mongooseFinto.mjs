// Un finto "mongoose" per far girare il backend RL VERO senza database.
//
// Il backend RL (repo marphco/rl-question-generator, backend/server.js)
// importa mongoose e legge le domande votate con find(). Qui find() legge
// invece la fotografia congelata dal controllo del serbatoio, con le stesse
// regole di Mongo per le query che il backend usa davvero: uguaglianza su
// campi annidati ("state.service"), $or, $exists, sort per data, limit.
//
// Le scritture NON esistono: save() e findOneAndUpdate() lanciano un errore.
// Così il banco non può toccare i dati nemmeno per sbaglio.
//
// Viene caricato al posto di quello vero da aggancio.mjs.
import fs from "node:fs";

const FILE = process.env.BANCO_FOTOGRAFIA;
if (!FILE || !fs.existsSync(FILE)) {
  console.error("[finto mongoose] fotografia non trovata: BANCO_FOTOGRAFIA=" + FILE);
  process.exit(1);
}
// Come le restituisce Mongo con lean(): le date sono Date, non testo.
const RIGHE = JSON.parse(fs.readFileSync(FILE, "utf8")).righe.map((r) => ({
  ...r,
  ...(r.timestamp ? { timestamp: new Date(r.timestamp) } : {}),
}));

// La raccolta del training (eval/training/raccolta.json): i voti nuovi,
// di Marco e dell'AI, separati dal database vero. Il banco li aggiunge alla
// fotografia per vedere cosa cambia quando il backend li usa come esempi.
const RACCOLTA = process.env.BANCO_RACCOLTA;
if (RACCOLTA && fs.existsSync(RACCOLTA))
  for (const r of JSON.parse(fs.readFileSync(RACCOLTA, "utf8")).righe)
    RIGHE.push({ ...r, ...(r.timestamp ? { timestamp: new Date(r.timestamp) } : {}) });

const valoreDi = (doc, percorso) =>
  percorso.split(".").reduce((v, k) => (v == null ? undefined : v[k]), doc);

function corrisponde(doc, filtro = {}) {
  return Object.entries(filtro).every(([k, atteso]) => {
    if (k === "$or") return atteso.some((f) => corrisponde(doc, f));
    const v = valoreDi(doc, k);
    if (atteso && typeof atteso === "object" && !(atteso instanceof Date)) {
      return Object.entries(atteso).every(([op, arg]) => {
        if (op === "$exists") return (v !== undefined) === Boolean(arg);
        throw new Error(`[finto mongoose] operatore non previsto: ${op}`);
      });
    }
    return v === atteso;
  });
}

// In Mongo un campo mancante vale meno di qualunque data: in ordine
// decrescente finisce in fondo.
const numero = (v) => (v instanceof Date ? v.getTime() : v == null ? -Infinity : Number(v));

class Query {
  constructor(righe) {
    this.righe = righe;
  }
  sort(spec) {
    const [[campo, verso]] = Object.entries(spec);
    this.righe = [...this.righe].sort((a, b) => (numero(valoreDi(a, campo)) - numero(valoreDi(b, campo))) * verso);
    return this;
  }
  limit(n) {
    this.righe = this.righe.slice(0, n);
    return this;
  }
  lean() {
    return this;
  }
  then(ok, ko) {
    return Promise.resolve(this.righe.map((r) => structuredClone(r))).then(ok, ko);
  }
}

const vietato = (cosa) => () => {
  throw new Error(`[finto mongoose] ${cosa}: nel banco di prova non si scrive`);
};

class Schema {
  static Types = { Mixed: "Mixed" };
  index() {}
}

function model() {
  function Modello() {}
  Modello.prototype.save = vietato("save");
  Modello.find = (filtro) => new Query(RIGHE.filter((r) => corrisponde(r, filtro)));
  Modello.findOneAndUpdate = vietato("findOneAndUpdate");
  Modello.updateOne = vietato("updateOne");
  Modello.insertMany = vietato("insertMany");
  Modello.deleteMany = vietato("deleteMany");
  return Modello;
}

const mongoose = { Schema, model, connect: async () => mongoose };
export default mongoose;
export { corrisponde };
