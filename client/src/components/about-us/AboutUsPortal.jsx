// src/components/about-us/AboutUsPortal.jsx
import { useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import PropTypes from "prop-types";
import AboutUs from "./AboutUs";

gsap.registerPlugin(ScrollTrigger);

export function AboutUsPortal({ isOpen, onClose }) {
  const portalRef = useRef(null);
  const overlayRef = useRef(null);
  // Usato per salvare la posizione dello scroll del body (mobile)
  const scrollYRef = useRef(0);

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
  
    const isMobile = window.innerWidth <= 768;
  
    if (isOpen) {
      window.addEventListener("keydown", handleEsc);
  
      // Blocca lo scroll del background su body e html
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
  
      // Disabilita gli ScrollTrigger del sito sottostante
      ScrollTrigger.getAll().forEach((st) => {
        if (!st.vars.scroller) st.disable();
      });
  
      if (overlayRef.current) {
        if (isMobile) {
          // Su mobile, imposta l'overlay immediatamente senza animazione,
          // e rimuovi eventuali trasformazioni residue
          gsap.set(overlayRef.current, { x: "0" });
          gsap.set(overlayRef.current, { clearProps: "transform" });
        } else {
          // Su desktop, usa l'animazione
          gsap.fromTo(
            overlayRef.current,
            { x: "-100%" },
            { x: "0", duration: 0.5, ease: "power3.out" }
          );
        }
        // Assicurati che lo scroll interno dell'overlay parta dall'inizio
        overlayRef.current.scrollTop = 0;
  
        // Intercetta gli eventi touch per evitare che si propaghino al background
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
  
      // Ripristina lo scroll del background
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
  
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
      {/* Contenuto scrollabile dell'overlay */}
      <AboutUs overlayRef={overlayRef} isOpen={isOpen} />
    </div>,
    portalRef.current
  );
}

AboutUsPortal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};
