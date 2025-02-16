import { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import PropTypes from "prop-types";
import AboutUs from "./AboutUs";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export function AboutUsPortal({ isOpen, onClose }) {
  const portalRef = useRef(null);
  const overlayRef = useRef(null);
  // Stato per rilevare se siamo su mobile
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  // Salva lo scroll del body (solo per eventuali ripristini su mobile)
  const scrollYRef = useRef(0);

  // Aggiorna lo stato mobile al resize
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Crea il container del portale
  useEffect(() => {
    portalRef.current = document.createElement("div");
    document.body.appendChild(portalRef.current);
    return () => {
      if (portalRef.current) {
        document.body.removeChild(portalRef.current);
      }
    };
  }, []);

  // Gestione della chiusura con ESC e blocco dello scroll sul body
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") handleClose();
    };
  
    if (isOpen) {
      window.addEventListener("keydown", handleEsc);
      if (isMobile) {
        scrollYRef.current = window.scrollY;
        document.body.style.overflow = "hidden";
      }
      // Disabilita i trigger
      ScrollTrigger.getAll().forEach((st) => {
        if (!st.vars.scroller) st.disable();
      });
  
      // *** ANIMAZIONE ENTRATA DESKTOP ***
      if (!isMobile && overlayRef.current) {
        gsap.fromTo(
          overlayRef.current,
          { x: "-100%" },
          { x: 0, duration: 0.5, ease: "power3.out" }
        );
      }
    } else {
      window.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "";
      window.scrollTo(0, scrollYRef.current);
      ScrollTrigger.getAll().forEach((st) => {
        if (!st.vars.scroller) st.enable();
      });
      ScrollTrigger.refresh(true);
    }
  
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isOpen, isMobile]);

  const handleClose = () => {
    if (!isMobile && overlayRef.current) {
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

  // Versione Mobile: usa un wrapper scrollabile a schermo intero
  if (isMobile) {
    return ReactDOM.createPortal(
      <div
        className="aboutus-overlay-mobile"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          backgroundColor: "#fff",
          overflowY: "auto",
          WebkitOverflowScrolling: "touch",
          zIndex: 9999999,
        }}
      >
        <div
          className="aboutus-overlay-header"
          style={{
            position: "sticky",
            top: 0,
            backgroundColor: "#fff",
            padding: "10px",
          }}
        >
          <button
            onClick={handleClose}
            style={{
              fontSize: "16px",
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#161616",
            }}
          >
            [CHIUDI]
          </button>
        </div>
        {/* Il contenuto dell'overlay; qui non applichiamo animazioni GSAP */}
        <AboutUs isOpen={isOpen} />
      </div>,
      portalRef.current
    );
  }

  // Versione Desktop: overlay con animazione GSAP
  return ReactDOM.createPortal(
    <div
      className="aboutus-overlay"
      ref={overlayRef}
      tabIndex="-1"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        backgroundColor: "#fff",
        overflowX: "hidden",
        overflowY: "auto",
        WebkitOverflowScrolling: "touch",
        zIndex: 99999999,
      }}
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
