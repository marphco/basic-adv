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

    if (isOpen) {
      window.addEventListener("keydown", handleEsc);

      const isMobile = window.innerWidth <= 768;
      if (isMobile) {
        // Salva la posizione attuale dello scroll
        scrollYRef.current = window.scrollY;
        // Blocca lo scroll del body applicando posizione fixed (senza forzare il reset)
        document.body.style.position = "fixed";
        document.body.style.top = `-${scrollYRef.current}px`;
        document.body.style.width = "100%";
      } else {
        document.body.style.overflow = "hidden";
      }

      // Disabilita gli ScrollTrigger del sito sottostante
      ScrollTrigger.getAll().forEach((st) => {
        if (!st.vars.scroller) st.disable();
      });

      // Animazione di apertura dell'overlay
      if (overlayRef.current) {
        gsap.fromTo(
          overlayRef.current,
          { x: "-100%" },
          { x: "0", duration: 0.5, ease: "power3.out" }
        );
        if (isMobile) {
          overlayRef.current.scrollTop = 0;
        } else {
          overlayRef.current.scrollLeft = 0;
        }
      }
    } else {
      window.removeEventListener("keydown", handleEsc);
      const isMobile = window.innerWidth <= 768;
      if (isMobile) {
        // Ripristina le proprietà del body e torna alla posizione salvata
        document.body.style.position = "";
        document.body.style.top = "";
        document.body.style.width = "";
        window.scrollTo(0, scrollYRef.current);
      } else {
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
