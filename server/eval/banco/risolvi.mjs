// Il gancio di risoluzione dei moduli usato da aggancio.mjs.
const FINTO = new URL("./mongooseFinto.mjs", import.meta.url).href;

export async function resolve(specificatore, contesto, prossimo) {
  if (specificatore === "mongoose") return { url: FINTO, shortCircuit: true };
  return prossimo(specificatore, contesto);
}
