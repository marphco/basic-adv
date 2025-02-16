// ScrollToTopOnRouteChange.jsx
import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export default function ScrollToTopOnRouteChange() {
  const { pathname } = useLocation();

  useEffect(() => {
    // Appena cambia la route, riportiamo lo scroll in cima.
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}