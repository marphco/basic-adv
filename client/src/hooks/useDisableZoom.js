import { useEffect } from "react";

export default function useDisableZoom({ enable = true } = {}) {
  useEffect(() => {
    if (!enable) return;

    // 1) Blocca gesture pinch su iOS (gesturestart/gesturechange/gestureend sono non-standard ma presenti)
    const preventGesture = (e) => { e.preventDefault(); };
    document.addEventListener("gesturestart", preventGesture, { passive: false });
    document.addEventListener("gesturechange", preventGesture, { passive: false });
    document.addEventListener("gestureend", preventGesture, { passive: false });

    // 2) Evita doppio-tap-zoom (iOS vecchi): due tap entro 300ms
    let lastTouchEnd = 0;
    const onTouchEnd = (e) => {
      const now = Date.now();
      if (now - lastTouchEnd <= 300) {
        e.preventDefault();
      }
      lastTouchEnd = now;
    };
    document.addEventListener("touchend", onTouchEnd, { passive: false });

    // 3) (Opzionale) blocca Ctrl+wheel zoom su device “ibridi”
    const onWheel = (e) => {
      if (e.ctrlKey) e.preventDefault();
    };
    window.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      document.removeEventListener("gesturestart", preventGesture, { passive: false });
      document.removeEventListener("gesturechange", preventGesture, { passive: false });
      document.removeEventListener("gestureend", preventGesture, { passive: false });
      document.removeEventListener("touchend", onTouchEnd, { passive: false });
      window.removeEventListener("wheel", onWheel, { passive: false });
    };
  }, [enable]);
}
