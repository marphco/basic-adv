import { useEffect, useState } from "react";

function detectFormFactor() {
  if (typeof window === "undefined") return { isPhone:false, isTablet:false, isMobileLike:false };

  const nav = navigator || {};
  const ua  = (nav.userAgent || "").toLowerCase();

  // iPad affidabile anche in "desktop site" (iPadOS 13+)
  const isIPad =
    /\bipad\b/.test(ua) ||
    (nav.platform === "MacIntel" && nav.maxTouchPoints > 1);

  // iPhone / iPod
  const isIPhone = /\biphone\b|\bipod\b/.test(ua);

  // Android: phone vs tablet
  const isAndroid = /\bandroid\b/.test(ua);
  const isAndroidPhone  = isAndroid && /\bmobile\b/.test(ua);
  const isAndroidTablet = isAndroid && !/\bmobile\b/.test(ua);

  const isTablet = isIPad || isAndroidTablet;
  const isPhone  = isIPhone || isAndroidPhone;

  return { isPhone, isTablet, isMobileLike: isPhone || isTablet };
}

export default function useFormFactor() {
  const [ff, setFf] = useState(detectFormFactor);

  useEffect(() => {
    const update = () => setFf(detectFormFactor());
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, []);

  return ff; // { isPhone, isTablet, isMobileLike }
}
