// AboutUsOverlay.jsx
import { useEffect, useRef } from "react";
import "./AboutUsOverlay.css";
import AboutUsContent from "./AboutUsContent";
import PropTypes from "prop-types";
import { gsap } from "gsap";

const AboutUsOverlay = ({ isOpen, onClose }) => {
  const overlayRef = useRef(null);
  const modalRef = useRef(null);

  useEffect(() => {
    const handleEsc = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener("keydown", handleEsc);
      // Animazione di entrata overlay
      gsap.fromTo(
        modalRef.current,
        { y: "100%" },
        { y: "0%", duration: 0.5, ease: "power3.out" }
      );
    } else {
      window.removeEventListener("keydown", handleEsc);
    }

    return () => {
      window.removeEventListener("keydown", handleEsc);
    };
  }, [isOpen, onClose]);

  const handleClose = () => {
    // Animazione di uscita overlay
    gsap.to(modalRef.current, {
      y: "100%",
      duration: 0.5,
      ease: "power3.in",
      onComplete: onClose,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="aboutus-overlay" ref={overlayRef}>
      <div className="aboutus-modal" ref={modalRef}>
        <button 
          className="close-button" 
          onClick={handleClose} 
          aria-label="Chiudi About Us"
        >
          &times;
        </button>
        <AboutUsContent />
      </div>
    </div>
  );
};

AboutUsOverlay.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default AboutUsOverlay;
