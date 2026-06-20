import { useEffect } from "react";

// Forza noindex/nofollow sulle pagine PRIVATE (login, dashboard, piani
// editoriali, condivisione cliente) e ripristina il valore originale quando si
// lascia la pagina, così le pagine vetrina restano regolarmente indicizzabili.
// Commuta il meta robots già presente in index.html invece di aggiungerne un
// secondo (niente tag in conflitto).
export default function useNoindex() {
  useEffect(() => {
    let meta = document.querySelector('meta[name="robots"]');
    let created = false;
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "robots");
      document.head.appendChild(meta);
      created = true;
    }
    const prev = meta.getAttribute("content");
    meta.setAttribute("content", "noindex, nofollow");
    return () => {
      if (created) meta.remove();
      else meta.setAttribute("content", prev ?? "index, follow");
    };
  }, []);
}
