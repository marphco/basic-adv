// src/components/about-us/AboutUsPortal.jsx
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

  // Crea il container del portal
  useEffect(() => {
    portalRef.current = document.createElement("div");
    document.body.appendChild(portalRef.current);
    return () => {
      clearAllBodyScrollLocks();
      if (portalRef.current) {
        document.body.removeChild(portalRef.current);
      }
    };
  }, []);

  // Blocca lo scroll del background e lascia sbloccato l’overlay
  useEffect(() => {
    if (isOpen && overlayRef.current) {
      disableBodyScroll(overlayRef.current, { reserveScrollBarGap: true });
    } else if (overlayRef.current) {
      enableBodyScroll(overlayRef.current);
    }
    return () => {
      if (overlayRef.current) {
        enableBodyScroll(overlayRef.current);
      }
    };
  }, [isOpen]);

  // Gestione del tasto Escape per chiudere
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleEsc);
    }
    return () => {
      window.removeEventListener("keydown", handleEsc);
    };
  }, [isOpen, onClose]);

  // Gestione dell'animazione di apertura/chiusura
  useEffect(() => {
    const isMobile = window.innerWidth <= 768;
    if (isOpen && overlayRef.current) {
      if (!isMobile) {
        gsap.fromTo(
          overlayRef.current,
          { x: "-100%" },
          { x: "0", duration: 0.5, ease: "power3.out" }
        );
      } else {
        // Su mobile rimuovo ogni trasformazione residua
        gsap.set(overlayRef.current, { clearProps: "transform" });
      }
      // Assicura che l’overlay parta dallo scroll in alto
      overlayRef.current.scrollTop = 0;
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

  if (!isOpen || !portalRef.current) return null;

  return ReactDOM.createPortal(
    <div
      className="aboutus-overlay"
      ref={overlayRef}
      tabIndex="-1"
      style={{ pointerEvents: "auto" }}
    >
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
