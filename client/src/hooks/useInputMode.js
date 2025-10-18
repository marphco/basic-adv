import { useEffect, useState } from "react";

/** Rileva se il dispositivo è "touch-first" (pointer: coarse o maxTouchPoints>0). */
export default function useInputMode() {
  const get = () => ({
    isCoarse: window.matchMedia?.("(pointer: coarse)")?.matches ?? false,
    isHover: window.matchMedia?.("(hover: hover)")?.matches ?? false,
    touchPoints: navigator.maxTouchPoints || 0,
  });

  const [state, setState] = useState(get);

  useEffect(() => {
    const mqCoarse = window.matchMedia("(pointer: coarse)");
    const mqHover = window.matchMedia("(hover: hover)");

    const update = () => setState(get());
    mqCoarse?.addEventListener?.("change", update);
    mqHover?.addEventListener?.("change", update);
    window.addEventListener("orientationchange", update);
    window.addEventListener("resize", update);

    return () => {
      mqCoarse?.removeEventListener?.("change", update);
      mqHover?.removeEventListener?.("change", update);
      window.removeEventListener("orientationchange", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  const isTouch = state.isCoarse || state.touchPoints > 0; // copre iPadOS
  const isFinePointer = !state.isCoarse && state.isHover;

  return { isTouch, isFinePointer };
}
