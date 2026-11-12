// Scaricare foto, video e PDF di un post, anche dal telefono.
//
// L'attributo `download` dei link non vale quando il file sta su un altro
// dominio (i media sono sul server, la dashboard no): il browser apriva il file
// in una scheda nuova, e da lì un video non si salva. Quindi:
//  - iPhone/iPad: il file si prepara e si passa al menu di condivisione, che
//    offre "Salva video" / "Salva immagine" → finisce nella galleria Foto;
//  - Android e computer: si chiede al server il file come allegato
//    (`?scarica=1`) e il browser lo scarica e basta, senza schede.

// Solo i nostri file sanno rispondere a `?scarica=1`.
const nostro = (url) => /\/uploads-ped\/[^/?#]+$/i.test(String(url || ""));

export const urlScarica = (url) =>
  nostro(url) ? `${url}?scarica=1` : url;

export const suIos = () =>
  typeof navigator !== "undefined" &&
  (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));

// Il file intero, pronto da condividere. null se non si riesce.
export async function preparaFile(url) {
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    const blob = await r.blob();
    const nome = decodeURIComponent(String(url).split(/[?#]/)[0].split("/").pop() || "media");
    const file = new File([blob], nome, { type: blob.type || "application/octet-stream" });
    return navigator.canShare?.({ files: [file] }) ? file : null;
  } catch {
    return null;
  }
}

// Apre il menu di condivisione. "ok" | "annullato" | "serve-un-tocco"
// (Safari vuole un tocco recente: se la preparazione è durata troppo, il file
// resta pronto e basta toccare di nuovo) | "errore".
export async function condividi(file) {
  try {
    await navigator.share({ files: [file] });
    return "ok";
  } catch (e) {
    if (e?.name === "AbortError") return "annullato";
    if (e?.name === "NotAllowedError") return "serve-un-tocco";
    return "errore";
  }
}
