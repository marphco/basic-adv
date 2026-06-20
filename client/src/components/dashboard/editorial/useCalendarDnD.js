import { useRef, useState } from "react";

// Drag & drop dei post sul calendario, unificato mouse + touch tramite Pointer
// Events. I listener di move/up sono su `window` con identità STABILE (creati una
// sola volta), così non risentono dei re-render né della event-delegation di
// React: è il motivo per cui questa versione è affidabile (niente "1 volta su 3").
//
// - Mouse/penna: il trascinamento parte appena si supera una piccola soglia.
// - Touch: parte con PRESSIONE PROLUNGATA (long-press); prima del long-press un
//   movimento del dito = scroll normale (gesto annullato). Una volta attivo lo
//   scroll è bloccato (touchmove non passivo) finché si rilascia.
//
// Le celle di destinazione hanno gli attributi data-dropcell / data-day / data-page;
// la cella sotto il puntatore è trovata con elementsFromPoint (salta eventuali
// overlay sopra, es. il cursore custom o il ghost).

const MOVE_THRESHOLD = 6; // px per avviare il drag col mouse
const TOUCH_HOLD_MS = 280; // pressione prolungata per avviare il drag al tocco
const TOUCH_TOLERANCE = 12; // movimento tollerato durante l'attesa (oltre = scroll)

export default function useCalendarDnD(onMove) {
  const [dragPost, setDragPost] = useState(null); // post in trascinamento (per il ghost)
  const [overKey, setOverKey] = useState(null); // cella evidenziata
  const ghostRef = useRef(null);
  const g = useRef(null); // gesto in corso (mutabile)
  const moved = useRef(false); // un drag è avvenuto → sopprime il click successivo
  const onMoveRef = useRef(onMove);
  onMoveRef.current = onMove;

  // Tutte le funzioni del gesto sono create UNA volta e tenute stabili: leggono
  // g.current / onMoveRef.current, quindi add/removeEventListener combaciano sempre.
  const api = useRef(null);
  if (!api.current) {
    const positionGhost = (x, y) => {
      const el = ghostRef.current;
      if (el) el.style.transform = `translate(${x + 14}px, ${y + 14}px)`;
    };

    const findCell = (x, y) => {
      const els = document.elementsFromPoint(x, y) || [];
      for (const el of els) {
        const cell = el.closest && el.closest("[data-dropcell]");
        if (cell) {
          const day = Number(cell.getAttribute("data-day"));
          if (day)
            return {
              day,
              pageId: cell.getAttribute("data-page") || null,
              key: cell.getAttribute("data-dropcell"),
            };
        }
      }
      return null;
    };

    const activate = () => {
      const gg = g.current;
      if (!gg || gg.active) return;
      gg.active = true;
      moved.current = true;
      setDragPost(gg.post);
      const cell = findCell(gg.lastX, gg.lastY);
      setOverKey(cell ? cell.key : null);
      requestAnimationFrame(() => positionGhost(gg.lastX, gg.lastY));
    };

    const onPointerMove = (e) => {
      const gg = g.current;
      if (!gg) return;
      gg.lastX = e.clientX;
      gg.lastY = e.clientY;
      if (!gg.active) {
        const dist = Math.hypot(e.clientX - gg.x, e.clientY - gg.y);
        if (gg.touch) {
          if (dist > TOUCH_TOLERANCE) endGesture(); // si sta scrollando → annulla
        } else if (dist > MOVE_THRESHOLD) {
          activate();
        }
        return;
      }
      e.preventDefault(); // niente selezione testo durante il drag col mouse
      positionGhost(e.clientX, e.clientY);
      const cell = findCell(e.clientX, e.clientY);
      const key = cell ? cell.key : null;
      setOverKey((p) => (p === key ? p : key));
    };

    const onPointerUp = (e) => {
      const gg = g.current;
      if (gg && gg.active) {
        const cell = findCell(e.clientX, e.clientY);
        if (cell) onMoveRef.current(gg.post, cell.day, cell.pageId);
      }
      endGesture();
    };

    const onTouchMove = (e) => {
      if (g.current && g.current.active) e.preventDefault(); // blocca lo scroll durante il drag
    };

    const endGesture = () => {
      const gg = g.current;
      if (gg && gg.timer) clearTimeout(gg.timer);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
      window.removeEventListener("touchmove", onTouchMove);
      g.current = null;
      setDragPost(null);
      setOverKey(null);
    };

    const start = (post) => (e) => {
      if (e.button != null && e.button > 0) return; // solo tasto sx / tocco
      g.current = {
        post,
        x: e.clientX,
        y: e.clientY,
        lastX: e.clientX,
        lastY: e.clientY,
        touch: e.pointerType === "touch",
        active: false,
        timer: null,
      };
      moved.current = false;
      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp);
      window.addEventListener("pointercancel", onPointerUp);
      window.addEventListener("touchmove", onTouchMove, { passive: false });
      if (g.current.touch) g.current.timer = setTimeout(activate, TOUCH_HOLD_MS);
    };

    api.current = { start };
  }

  // Props da spargere su ogni post trascinabile (solo l'avvio; move/up sono su window).
  const handlers = (post) => ({ onPointerDown: api.current.start(post) });

  // Avvolge l'onClick del chip: se è appena avvenuto un drag, ignora il click.
  const guardClick = (fn) => () => {
    if (moved.current) {
      moved.current = false;
      return;
    }
    fn();
  };

  return { handlers, guardClick, overKey, dragPost, ghostRef };
}
