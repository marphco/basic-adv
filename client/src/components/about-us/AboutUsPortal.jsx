import { useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import PropTypes from "prop-types";
import { disableBodyScroll, enableBodyScroll, clearAllBodyScrollLocks } from "body-scroll-lock";
import AboutUs from "./AboutUs";

gsap.registerPlugin(ScrollTrigger);

export function AboutUsPortal({ isOpen, onClose }) {
  const portalRef = useRef(null);
  const overlayRef = useRef(null);

  useEffect(() => {
    portalRef.current = document.createElement("div");
    document.body.appendChild(portalRef.current);
    return () => {
      if (portalRef.current) {
        document.body.removeChild(portalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };

    if (isOpen) {
      window.addEventListener("keydown", handleEsc);
      document.body.style.overflow = "hidden"; // Blocca lo scroll del body

      // Su mobile, disabilita lo scroll del body sul container overlay
      if (window.innerWidth <= 768 && overlayRef.current) {
        disableBodyScroll(overlayRef.current);
        // Aggiungiamo un ulteriore controllo per bloccare lo scroll del sito principale
        document.body.style.position = 'fixed';
        document.body.style.top = `-${window.scrollY}px`;
        document.body.style.width = '100%'; // Evita che il body si allarghi quando diventa fixed
      }

      // Disabilita gli ScrollTrigger del resto del sito
      ScrollTrigger.getAll().forEach((st) => {
        if (!st.vars.scroller) {
          st.disable();
        }
      });

      // Animazione entrata overlay
      if (overlayRef.current) {
        gsap.fromTo(
          overlayRef.current,
          { x: "-100%" },
          { x: "0", duration: 0.5, ease: "power3.out" }
        );
        // Resetta lo scroll dell'overlay su mobile
        if (window.innerWidth <= 768) {
          overlayRef.current.scrollTop = 0;
        } else {
          overlayRef.current.scrollLeft = 0;
        }
      }
    } else {
      window.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = ""; // Riabilita lo scroll del body

      // Su mobile, riabilita lo scroll del body
      if (window.innerWidth <= 768 && overlayRef.current) {
        enableBodyScroll(overlayRef.current);
        // Rimuoviamo il blocco dello scroll del sito principale
        const scrollY = document.body.style.top;
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = ''; // Ripristina la larghezza del body
        window.scrollTo(0, parseInt(scrollY || '0') * -1);
      }

      // Riabilita gli ScrollTrigger del resto del sito
      ScrollTrigger.getAll().forEach((st) => {
        if (!st.vars.scroller) {
          st.enable();
        }
      });
    }
    return () => {
      window.removeEventListener("keydown", handleEsc);
      if (window.innerWidth <= 768 && overlayRef.current) {
        enableBodyScroll(overlayRef.current);
      }
      clearAllBodyScrollLocks();
    };
  }, [isOpen, onClose]);

  const handleClose = () => {
    if (overlayRef.current) {
      gsap.to(overlayRef.current, {
        x: "-100%",
        duration: 0.5,
        ease: "power3.in",
        onComplete: onClose,
      });
    } else {
      onClose();
    }
  };

  if (!isOpen) return null;
  if (!portalRef.current) return null;

  return ReactDOM.createPortal(
    <div className="aboutus-overlay" ref={overlayRef}>
      <div className="aboutus-overlay-header">
        <button
          type="button"
          className="aboutus-overlay-close"
          onClick={handleClose}
        >
          [CHIUDI]
        </button>
      </div>
      {/* Il contenuto scrollabile */}
      <AboutUs overlayRef={overlayRef} isOpen={isOpen} />
    </div>,
    portalRef.current
  );
}

AboutUsPortal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};