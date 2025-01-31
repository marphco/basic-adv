// src/components/about-us/AboutUsPortal.jsx
import React, { useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import PropTypes from "prop-types";
import AboutUsOverlayContent from "./AboutUsOverlayContent";

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

      document.body.style.overflow = "hidden";

      // Disabilita i trigger del resto del sito (scroller = window):
      ScrollTrigger.getAll().forEach((st) => {
        if (!st.vars.scroller) {
          st.disable();
        }
      });

      // Animazione entrata overlay
      if (overlayRef.current) {
        overlayRef.current.scrollLeft = 0;
      }
    } else {
      window.removeEventListener("keydown", handleEsc);

      document.body.style.overflow = "";

      // Riabilita i trigger del sito
      ScrollTrigger.getAll().forEach((st) => {
        if (!st.vars.scroller) {
          st.enable();
        }
      });
    }
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

  if (!isOpen) return null;
  if (!portalRef.current) return null;

  return ReactDOM.createPortal(
    <div className="aboutus-overlay" ref={overlayRef}>
      <button
        type="button"
        className="aboutus-overlay-close"
        onClick={handleClose}
      >
        &times;
      </button>
      {/* Passiamo isOpen e overlayRef al contenuto animato */}
      <AboutUsOverlayContent overlayRef={overlayRef} isOpen={isOpen} />
    </div>,
    portalRef.current
  );
}

AboutUsPortal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};
