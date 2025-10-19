import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

function hasScrollableParent(el) {
  let n = el;
  while (n && n !== document.body) {
    if (n.hasAttribute?.("data-allow-native-scroll")) return true;
    const s = getComputedStyle(n);
    const canY = (s.overflowY === "auto" || s.overflowY === "scroll") && n.scrollHeight > n.clientHeight;
    if (canY) return true;
    n = n.parentElement;
  }
  return false;
}

function isDiscreteWheelEvent(e, lastTimeRef) {
  if (e.ctrlKey || e.metaKey) return false;
  const now = e.timeStamp || performance.now();
  const dt = now - (lastTimeRef.current || 0);
  lastTimeRef.current = now;
  const ay = Math.abs(e.deltaY);
  const ax = Math.abs(e.deltaX);
  const bigImpulse = ay >= 40 || ax >= 40;
  const sparse = dt > 30;
  const roundish = (v) => v % 30 === 0 || v % 60 === 0 || v % 120 === 0;
  const rounded = roundish(ay) || roundish(ax);
  return bigImpulse && (sparse || rounded);
}

export default function useSmoothWheel({
  enabled = true,
  multiplier = 0.28,
  duration = 0.45,
  ease = "power3.out",
} = {}) {
  const targetScrollRef = useRef(0);
  const tweenRef = useRef(null);
  const lastTimeRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    const resetTarget = () => {
      targetScrollRef.current = window.scrollY || window.pageYOffset || 0;
    };
    resetTarget();

    const onWheel = (e) => {
      // lascia stare scroll interni
      if (hasScrollableParent(e.target)) return;
      // solo “rotelle a scatto”
      if (!isDiscreteWheelEvent(e, lastTimeRef)) return;

      // blocchiamo il nativo: gestiamo noi
      e.preventDefault();

      // limite max dinamico che tiene conto dei pin
      const maxY = ScrollTrigger.maxScroll(window);
      const current = window.scrollY || window.pageYOffset || 0;

      // se c'è un pin attivo, niente tween (evita conflitti): solo scroll ridotto immediato
      const pinActive = ScrollTrigger.getAll().some((st) => st.isActive && !!st.pin);

      if (pinActive) {
        const next = Math.max(0, Math.min(current + e.deltaY * multiplier, maxY));
        window.scrollTo(0, next);
        targetScrollRef.current = next; // riallinea il target per quando usciremo dal pin
        // ScrollTrigger aggiorna da solo con scrub, ma per sicurezza:
        ScrollTrigger.update();
        return;
      }

      // fuori dai pin: tween morbido
      const next =
        (targetScrollRef.current || current) + (e.deltaY || e.wheelDeltaY || 0) * multiplier;
      const clamped = Math.max(0, Math.min(next, maxY));
      targetScrollRef.current = clamped;

      if (tweenRef.current) tweenRef.current.kill();
      tweenRef.current = gsap.to(window, {
        scrollTo: clamped,
        duration,
        ease,
        overwrite: "auto",
        // quando finisce, riallinea al valore reale (nel caso il layout sia cambiato)
        onComplete: () => (targetScrollRef.current = window.scrollY || window.pageYOffset || 0),
      });
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("resize", resetTarget);
    // quando ST fa refresh (pin/spacer cambiano dimensioni) riallinea target
    const onRefresh = () => resetTarget();
    ScrollTrigger.addEventListener("refresh", onRefresh);

    return () => {
      window.removeEventListener("wheel", onWheel, { passive: false });
      window.removeEventListener("resize", resetTarget);
      ScrollTrigger.removeEventListener("refresh", onRefresh);
      tweenRef.current?.kill();
      tweenRef.current = null;
    };
  }, [enabled, multiplier, duration, ease]);
}
