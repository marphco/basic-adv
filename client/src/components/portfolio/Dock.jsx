import { useEffect, useLayoutEffect, useRef, memo } from "react";
import PropTypes from "prop-types";

function Dock({ icons, onToggleActive, className = "" }) {
  const ref = useRef(null);
  const rafRef = useRef(null);

  const setupScales = () => {
    ref.current?.querySelectorAll(".dock-item")?.forEach((it) => {
      if (!it.dataset.scale)  it.dataset.scale  = "1";
      if (!it.dataset.target) it.dataset.target = "1";
    });
  };

  const animate = () => {
    ref.current?.querySelectorAll(".dock-item")?.forEach((it) => {
      const cur = parseFloat(it.dataset.scale || "1");
      const tgt = parseFloat(it.dataset.target || "1");
      const next = cur + (tgt - cur) * 0.18;
      it.dataset.scale = next.toFixed(3);
      it.style.transform = `translateY(var(--ty)) scale(${next.toFixed(3)}) scaleX(var(--sx,1)) scaleY(var(--sy,1))`;
    });
    rafRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    setupScales();
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fitDock = () => {
    const el = ref.current, frame = el?.parentElement;
    if (!el || !frame) return;
    el.style.setProperty("--dock-scale", "1");
    const natural = el.scrollWidth;
    const cs = getComputedStyle(frame);
    const frameW = frame.clientWidth - parseFloat(cs.paddingLeft||"0") - parseFloat(cs.paddingRight||"0");
    let s = natural > frameW ? frameW / natural : 1;
    s = Math.max(0.72, Math.min(1, s));
    el.style.setProperty("--dock-scale", s.toFixed(3));
    const maxMag = 1.7 - (1 - s) * 0.45;
    const radius = Math.max(80, 120 * s);
    el.style.setProperty("--dock-max", maxMag.toFixed(2));
    el.style.setProperty("--dock-radius", radius.toFixed(0));
  };

  useLayoutEffect(() => {
    fitDock();
    const onR = () => fitDock();
    window.addEventListener("resize", onR);
    return () => window.removeEventListener("resize", onR);
  }, [icons.length]);

  const handleMove = (e) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const MAX = parseFloat(el.style.getPropertyValue("--dock-max")) || 1.7;
    const RADIUS = parseFloat(el.style.getPropertyValue("--dock-radius")) || 120;
    el.querySelectorAll(".dock-item").forEach((item) => {
      const r = item.getBoundingClientRect();
      const cx = r.left - rect.left + r.width / 2;
      const d = Math.abs(cx - x);
      const t = Math.max(0, 1 - d / RADIUS);
      const target = 1 + (MAX - 1) * (t * t);
      item.dataset.target = target.toFixed(3);
    });
  };

  const reset = () => {
    ref.current?.querySelectorAll(".dock-item")?.forEach((it) => (it.dataset.target = "1"));
  };

  return (
    <div
      className={`dock ${className}`}
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={reset}
      role="toolbar"
      aria-label="Applicazioni"
    >
      {icons.map((it, idx) =>
        it.type === "separator" ? (
          <div key={`sep-${idx}`} className="dock-sep" aria-hidden />
        ) : (
          <button
            key={it.id}
            className="dock-item"
            data-id={it.id}
            title={it.label}
            onClick={(e) => {
              e.preventDefault();
              const btn = e.currentTarget;
              btn.classList.remove("bounce"); btn.offsetWidth; btn.classList.add("bounce");
              btn.addEventListener("animationend", () => btn.classList.remove("bounce"), { once: true });
              onToggleActive?.(it.id);
              it.onClick?.();
            }}
          >
            <img src={it.src} alt="" />
            {it.active && <span className="dock-dot" />}
          </button>
        )
      )}
    </div>
  );
}

Dock.propTypes = {
  icons: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string,
      label: PropTypes.string,
      src: PropTypes.string,
      active: PropTypes.bool,
      onClick: PropTypes.func,
      type: PropTypes.string,
    })
  ).isRequired,
  onToggleActive: PropTypes.func,
  className: PropTypes.string,
};

export default memo(Dock);
