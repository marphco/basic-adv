import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function usePageView() {
  const location = useLocation();

  useEffect(() => {
    // se gtag non esiste o manca l'ID, non fare nulla
    if (!window.gtag || !import.meta.env.VITE_GA_ID) return;

    // invia l'evento solo dopo che l’utente ha accettato i cookie analitici
    const consent = localStorage.getItem('ga-consent'); // o altro flag dal tuo CookieNotice
    if (consent !== 'granted') return;

    window.gtag('event', 'page_view', {
      page_title: document.title,
      page_location: window.location.href,
      page_path: location.pathname + location.search,
    });
  }, [location]);
}
