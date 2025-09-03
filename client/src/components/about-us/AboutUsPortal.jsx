import { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import PropTypes from "prop-types";
import AboutUs from "./AboutUs"; // Mobile
import AboutUsDesktop from "./AboutUsDesktop"; // Desktop
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export function AboutUsPortal({ isOpen, onClose }) {
  const portalRef = useRef(null);
  const overlayRef = useRef(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const scrollYRef = useRef(0);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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
      if (e.key === "Escape") handleClose();
    };

    if (isOpen) {
      window.addEventListener("keydown", handleEsc);

      if (isMobile) {
        scrollYRef.current = window.scrollY;
        document.body.style.overflow = "hidden";
      }

      // disabilita gli ScrollTrigger "globali"
      ScrollTrigger.getAll().forEach((st) => {
        if (!st.vars.scroller) st.disable();
      });

      // --- segnale alla navbar: about aperto su desktop ---
      if (!isMobile) {
        document.body.classList.add("aboutus-open");
      }

      // entrata overlay desktop
      if (!isMobile && overlayRef.current) {
        gsap.fromTo(
          overlayRef.current,
          { x: "-100%" },
          { x: 0, duration: 0.5, ease: "power3.out" }
        );
      }
    } else {
      window.removeEventListener("keydown", handleEsc);

      // rimuovi segnale alla navbar
      document.body.classList.remove("aboutus-open");

      document.body.style.overflow = "";
      window.scrollTo(0, scrollYRef.current);

      ScrollTrigger.getAll().forEach((st) => {
        if (!st.vars.scroller) st.enable();
      });
      ScrollTrigger.refresh(true);
    }

    return () => window.removeEventListener("keydown", handleEsc);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, isMobile]);

  const handleClose = () => {
    const finish = () => {
      // rimuovi subito la classe (evita ghost state)
      document.body.classList.remove("aboutus-open");
      onClose();
    };

    if (!isMobile && overlayRef.current) {
      gsap.to(overlayRef.current, {
        x: "-100%",
        duration: 0.5,
        ease: "power3.in",
        onComplete: finish,
      });
    } else {
      finish();
    }
  };

  if (!isOpen || !portalRef.current) return null;

  // Mobile
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
        <AboutUs isOpen={isOpen} />
      </div>,
      portalRef.current
    );
  }

  // Desktop
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
      <AboutUsDesktop overlayRef={overlayRef} isOpen={isOpen} />
    </div>,
    portalRef.current
  );
}

AboutUsPortal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};
