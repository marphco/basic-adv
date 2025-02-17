import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { gsap } from "gsap";
import PropTypes from "prop-types";
// Se non hai il file CSS, rimuovi o crea un file vuoto
import "./Portfolio.css";

const ProjectSectionMobile = ({ onClose, project, projectData }) => {
  const sectionRef = useRef(null);

  // Blocca lo scroll del body mentre la modale è aperta
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // Animazione di entrata dal basso
  useEffect(() => {
    if (sectionRef.current) {
      gsap.fromTo(
        sectionRef.current,
        { y: "100%" },
        { y: "0%", duration: 0.5, ease: "power3.out" }
      );
    }
  }, []);

  const handleClose = () => {
    if (sectionRef.current) {
      gsap.to(sectionRef.current, {
        y: "100%",
        duration: 0.5,
        ease: "power3.in",
        onComplete: onClose,
      });
    } else {
      onClose();
    }
  };

  const content = projectData[project] || {
    title: "Progetto non trovato",
    description: "Nessuna descrizione disponibile",
    images: [],
    link: null,
  };

  const modalJSX = (
    <div
      className="project-section-mobile-overlay"
      onClick={handleClose}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        zIndex: 9999,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        className="project-section-mobile"
        ref={sectionRef}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100vw",
          height: "100vh",
          overflowY: "auto",
        }}
      >
        <div className="project-section-mobile-header">
          <h2>{content.title}</h2>
          <p>{content.description}</p>
          {content.link && (
            <a
              href={content.link}
              target="_blank"
              rel="noopener noreferrer"
              className="project-link"
            >
              Visita il sito
            </a>
          )}
          <button onClick={handleClose} className="project-section-mobile-close">
            [CHIUDI]
          </button>
        </div>
        <div className="project-section-mobile-scroll">
          <div className="project-images-container">
            {content.images.map((imgSrc, index) => (
              <img
                key={index}
                src={imgSrc}
                alt={`${content.title} - img ${index + 1}`}
                className="project-image"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalJSX, document.getElementById("modal-root"));
};

ProjectSectionMobile.propTypes = {
  onClose: PropTypes.func.isRequired,
  project: PropTypes.string.isRequired,
  projectData: PropTypes.object.isRequired,
};

export default ProjectSectionMobile;
