import { useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import PropTypes from "prop-types";
import { disableBodyScroll, enableBodyScroll, clearAllBodyScrollLocks } from 'body-scroll-lock';
import AboutUs from "./AboutUs";

gsap.registerPlugin(ScrollTrigger);

export function AboutUsPortal({ isOpen, onClose }) {
  const portalRef = useRef(null);
  const overlayRef = useRef(null);
  
  useEffect(() => {
    portalRef.current = document.createElement("div");
    document.body.appendChild(portalRef.current);
    return () => {
      clearAllBodyScrollLocks(); // Assicurati di pulire eventuali lock
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

    const isMobile = window.innerWidth <= 768;

    if (isOpen) {
      window.addEventListener("keydown", handleEsc);
      
      // Blocca lo scroll del background, ma lascia sbloccato overlayRef.current
      if (overlayRef.current) {
        disableBodyScroll(overlayRef.current);
      }

      // Disabilita gli ScrollTrigger del sito sottostante
      ScrollTrigger.getAll().forEach((st) => {
        if (!st.vars.scroller) st.disable();
      });

      if (overlayRef.current) {
        if (isMobile) {
          // Su mobile, evita l'animazione con trasformazioni (che potrebbero bloccare il touch)
          gsap.set(overlayRef.current, { x: "0" });
          gsap.set(overlayRef.current, { clearProps: "transform" });
        } else {
          gsap.fromTo(
            overlayRef.current,
            { x: "-100%" },
            { x: "0", duration: 0.5, ease: "power3.out" }
          );
        }
        // Imposta lo scroll iniziale dell'overlay
        overlayRef.current.scrollTop = 0;

        // Facoltativo: intercetta gli eventi touch sull'overlay (ma di solito body-scroll-lock gestisce già bene tutto)
        overlayRef.current.addEventListener(
          "touchmove",
          (e) => {
            e.stopPropagation();
          },
          { passive: false }
        );
      }
    } else {
      window.removeEventListener("keydown", handleEsc);
      
      // Rilascia il blocco dello scroll del background
      if (overlayRef.current) {
        enableBodyScroll(overlayRef.current);
      }
      
      // Riabilita gli ScrollTrigger
      ScrollTrigger.getAll().forEach((st) => {
        if (!st.vars.scroller) st.enable();
      });
      ScrollTrigger.refresh(true);
    }

    return () => {
      window.removeEventListener("keydown", handleEsc);
    };
  }, [isOpen]);

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

  if (!isOpen || !portalRef.current) return null;

  return ReactDOM.createPortal(
    <div className="aboutus-overlay" ref={overlayRef} tabIndex="-1">
      <div className="aboutus-overlay-header">
        <button
          type="button"
          className="aboutus-overlay-close"
          onClick={handleClose}
        >
          [CHIUDI]
        </button>
      </div>
      <AboutUs overlayRef={overlayRef} isOpen={isOpen} />
    </div>,
    portalRef.current
  );
}

AboutUsPortal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};
