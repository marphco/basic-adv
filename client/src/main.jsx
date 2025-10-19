import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App  from './App.jsx'
import "./i18n";
import "./setupLangHeaders";

// --- iPad detector + viewport & body class, PRIMA del render ---
(function forceMobileOnIPad() {
  const ua = navigator.userAgent || "";
  const isiPadUA = /iPad/i.test(ua);
  const macTouch = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  const touchLike = isiPadUA || macTouch;

  // 1) Classe che useremo nel CSS per spegnere l’orizzontale
  if (touchLike) document.body.classList.add("mobile-like");

  // 2) Viewport stretta: fa scattare le @media (max-width:768px) anche su iPad
  const meta =
    document.querySelector('meta[name="viewport"]') ||
    (() => {
      const m = document.createElement("meta");
      m.setAttribute("name", "viewport");
      document.head.appendChild(m);
      return m;
    })();

  if (touchLike) {
    meta.setAttribute(
      "content",
      "width=768, initial-scale=1, maximum-scale=1, minimum-scale=1, viewport-fit=cover, user-scalable=no"
    );
  } else {
    meta.setAttribute("content", "width=device-width, initial-scale=1, viewport-fit=cover");
  }
})();


createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
