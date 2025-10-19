// useTouchLike.js
import { useEffect, useState } from "react";

function detectTouchLike() {
  // vero su iPad anche con trackpad / “sito desktop”
  const anyCoarse = window.matchMedia?.("(any-pointer: coarse)")?.matches;
  const noHover  = window.matchMedia?.("(hover: none)")?.matches;
  const hasTouch = navigator.maxTouchPoints > 0;
  const isiPadUA = /iPad/i.test(navigator.userAgent || "");
  const macTouch = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return Boolean(anyCoarse || noHover || hasTouch || isiPadUA || macTouch);
}

export default function useTouchLike() {
  const [isTouchLike, setIsTouchLike] = useState(detectTouchLike);

  useEffect(() => {
    const onChange = () => setIsTouchLike(detectTouchLike());
    const mq1 = window.matchMedia("(any-pointer: coarse)");
    const mq2 = window.matchMedia("(hover: none)");
    mq1.addEventListener?.("change", onChange);
    mq2.addEventListener?.("change", onChange);
    window.addEventListener("orientationchange", onChange, { passive: true });
    window.addEventListener("resize", onChange, { passive: true });

    // prima interazione touch (alcuni Safari “sbloccano” dopo il primo tap)
    const onceTouch = () => { setIsTouchLike(true); window.removeEventListener("touchstart", onceTouch); };
    window.addEventListener("touchstart", onceTouch, { passive: true });

    return () => {
      mq1.removeEventListener?.("change", onChange);
      mq2.removeEventListener?.("change", onChange);
      window.removeEventListener("orientationchange", onChange);
      window.removeEventListener("resize", onChange);
      window.removeEventListener("touchstart", onceTouch);
    };
  }, []);

  return isTouchLike;
}
