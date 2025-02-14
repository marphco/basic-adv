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
  
      if (isMobile) {
        // Salva la posizione attuale dello scroll e blocca il body usando overflow hidden
        scrollYRef.current = window.scrollY;
        document.body.style.overflow = "hidden";
      } else {
        // Per desktop (se vuoi bloccare lo scroll del body)
        // document.body.style.overflow = "hidden";
      }
  
      // Disabilita gli ScrollTrigger del sito sottostante
      ScrollTrigger.getAll().forEach((st) => {
        if (!st.vars.scroller) st.disable();
      });
  
      // Gestione dell'animazione dell'overlay
      if (overlayRef.current) {
        if (isMobile) {
          // Su mobile, imposta direttamente x a 0 (senza animazione) per evitare problemi di transform
          gsap.set(overlayRef.current, { x: "0" });
        } else {
          // Su desktop usa l'animazione con translateX
          gsap.fromTo(
            overlayRef.current,
            { x: "-100%" },
            { x: "0", duration: 0.5, ease: "power3.out" }
          );
        }
        // Imposta lo scroll iniziale dell'overlay
        if (isMobile) {
          overlayRef.current.scrollTop = 0;
        } else {
          overlayRef.current.scrollLeft = 0;
        }
      }
    } else {
      window.removeEventListener("keydown", handleEsc);
  
      if (isMobile) {
        // Ripristina lo scroll del body e torna alla posizione salvata
        document.body.style.overflow = "";
        window.scrollTo(0, scrollYRef.current);
      } else {
        // Per desktop (se hai usato overflow hidden)
        document.body.style.overflow = "";
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
