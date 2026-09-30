// Si carica con `node --import` prima del backend RL: fa sì che il suo
// `import mongoose from "mongoose"` riceva mongooseFinto.mjs. Il codice del
// backend resta quello della repo, senza una riga cambiata.
import { register } from "node:module";

register("./risolvi.mjs", import.meta.url);
