// hooks/useIsMobileFlag.js
import { useEffect, useState } from "react";
export default function useIsMobileFlag() {
  const read = () => document.body.classList.contains("mobile-like");
  const [val, setVal] = useState(read);
  useEffect(() => {
    const obs = new MutationObserver(() => setVal(read()));
    obs.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);
  return val;
}
