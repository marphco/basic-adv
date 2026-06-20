import { useEffect, useState } from "react";
import { subscribe, removeToast, resolveConfirm } from "./uiNotify";
import "./uiNotify.css";

// Renderizza i toast + la modale di conferma. Va montato una volta per pagina
// (dashboard e vista pubblica).
export default function UiHost() {
  const [s, setS] = useState({ toasts: [], confirm: null });
  useEffect(() => subscribe(setS), []);

  useEffect(() => {
    if (!s.confirm) return;
    const onKey = (e) => {
      if (e.key === "Escape") resolveConfirm(false);
      if (e.key === "Enter") resolveConfirm(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [s.confirm]);

  return (
    <>
      <div className="ui-toasts">
        {s.toasts.map((t) => (
          <button
            key={t.id}
            className={`ui-toast ui-toast--${t.type}`}
            onClick={() => removeToast(t.id)}
          >
            {t.message}
          </button>
        ))}
      </div>

      {s.confirm && (
        <div className="ui-confirm-overlay" onClick={() => resolveConfirm(false)}>
          <div className="ui-confirm" onClick={(e) => e.stopPropagation()}>
            {s.confirm.title && <h3>{s.confirm.title}</h3>}
            <p>{s.confirm.message}</p>
            <div className="ui-confirm-actions">
              <button
                className="ui-btn ui-btn--ghost"
                onClick={() => resolveConfirm(false)}
              >
                Annulla
              </button>
              <button
                className={`ui-btn ${
                  s.confirm.danger ? "ui-btn--danger" : "ui-btn--primary"
                }`}
                onClick={() => resolveConfirm(true)}
              >
                {s.confirm.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
