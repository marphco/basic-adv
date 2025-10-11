import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import "./CookieNotice.css";

const CookieNotice = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  // Controlliamo se l'utente ha dato il consenso
  useEffect(() => {
    const consent = localStorage.getItem("cookieConsent");
    if (!consent) {
      setIsVisible(true); // Mostra la notice se non c'è consenso
    }
  }, []);

  // Funzione per avviare l'animazione in uscita e poi nascondere la notice
  const hideNotice = () => {
    setIsExiting(true); // Avvia l'animazione in uscita
  };

  // Quando l'animazione in uscita è finita, nascondi definitivamente la notice
  const handleAnimationEnd = () => {
    if (isExiting) {
      setIsVisible(false);
      setIsExiting(false); // Reset dello stato di uscita
    }
  };

  // Funzione per salvare il consenso e nascondere la notice
  const acceptCookies = () => {
    localStorage.setItem("cookieConsent", "accepted");
    hideNotice();
  };

  // Gestione dello scroll: nascondi dopo 50px
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50 && isVisible && !isExiting) {
        hideNotice(); // Avvia l'animazione in uscita
      }
    };

    if (isVisible) {
      window.addEventListener("scroll", handleScroll);
    }

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [isVisible, isExiting]);

  // Funzione per accettare i cookie manualmente
  const handleAccept = () => {
    acceptCookies(); // Salva il consenso e avvia l'animazione in uscita
  };

  if (!isVisible) return null;

  return (
    <div
      className={`cookie-notice ${isExiting ? "exiting" : ""}`}
      onAnimationEnd={handleAnimationEnd}
    >
      <span>Usiamo cookie.</span>
      <Link to="/cookie-policy">COOKIE POLICY</Link>
      <span className="separator"> | </span>
      <button className="accept" onClick={handleAccept}>ACCETTA</button>
    </div>
  );
};

export default CookieNotice;