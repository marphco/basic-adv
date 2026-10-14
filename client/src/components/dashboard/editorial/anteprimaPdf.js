// Prima pagina di un PDF come immagine, disegnata nel browser al momento del
// caricamento. Nel calendario un carosello di LinkedIn si riconosce così a
// colpo d'occhio, e sul server non entra nessuna libreria nuova.
//
// pdf.js si scarica solo quando serve, cioè quando si sceglie un PDF: chi
// carica foto e video non lo scarica nemmeno. Versione "legacy", che gira
// anche sui browser non recentissimi.
//
// Non solleva mai: se l'anteprima non riesce (PDF protetto, rovinato, browser
// strano) il PDF si carica lo stesso e al posto della prima pagina si vede
// l'icona del PDF.

// Larghezza dell'immagine: quella di un post, nitida anche a tutto schermo.
// Il tetto all'altezza evita tele enormi con le pagine molto lunghe.
const LARGHEZZA = 1080;
const ALTEZZA_MAX = 1600;

export const isPdf = (file) =>
  /^application\/pdf$/i.test(file?.type || "") || /\.pdf$/i.test(file?.name || "");

export async function primaPagina(file) {
  try {
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.min.mjs");
    const { default: worker } = await import(
      "pdfjs-dist/legacy/build/pdf.worker.min.mjs?url"
    );
    pdfjs.GlobalWorkerOptions.workerSrc = worker;

    const doc = await pdfjs.getDocument({
      data: new Uint8Array(await file.arrayBuffer()),
      // niente codice generato al volo dentro il PDF: serve solo a disegnare
      isEvalSupported: false,
    }).promise;

    try {
      const pagina = await doc.getPage(1);
      const base = pagina.getViewport({ scale: 1 });
      const scala = Math.min(LARGHEZZA / base.width, ALTEZZA_MAX / base.height);
      const vista = pagina.getViewport({ scale: scala });

      const tela = document.createElement("canvas");
      tela.width = Math.round(vista.width);
      tela.height = Math.round(vista.height);
      const ctx = tela.getContext("2d");
      // Le pagine "trasparenti" nei lettori PDF sono bianche: anche qui.
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, tela.width, tela.height);
      await pagina.render({ canvasContext: ctx, viewport: vista }).promise;

      const blob = await new Promise((ok) => tela.toBlob(ok, "image/jpeg", 0.85));
      if (!blob) return null;
      const nome = `${String(file.name || "documento").replace(/\.pdf$/i, "")}-anteprima.jpg`;
      return new File([blob], nome, { type: "image/jpeg" });
    } finally {
      doc.destroy();
    }
  } catch (e) {
    console.warn("[pdf] anteprima non riuscita:", e?.message);
    return null;
  }
}
