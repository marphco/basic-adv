import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { gsap } from "gsap";
import PropTypes from "prop-types";
import "./Portfolio.css";

const ProjectSectionMobile = ({ onClose, project, projectData }) => {
  const containerRef = useRef(null);       // Contenitore principale della pagina
  const sectionRef = useRef(null);         // Contenitore che include entrambe le righe
  const imagesRowRef = useRef(null);       // Riferimento alla riga delle immagini

  // Blocca lo scroll del body usando la classe "freeze-scroll"
  useEffect(() => {
    document.body.classList.add("freeze-scroll");
    return () => {
      document.body.classList.remove("freeze-scroll");
    };
  }, []);

  // Configura il container come full screen e anima l'entrata dal basso
  useEffect(() => {
    if (!containerRef.current || !sectionRef.current) return;
    Object.assign(containerRef.current.style, {
      position: "fixed",
      top: "0",
      left: "0",
      width: "100vw",
      height: "100vh",
      zIndex: "9999",
      backgroundColor: "rgba(0,0,0,0.5)",
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
    });
    // Impedisci la propagazione dello scroll esterno
    containerRef.current.addEventListener("wheel", (e) => e.stopPropagation(), { passive: false });

    gsap.set(sectionRef.current, { y: "100%" });
    gsap.to(sectionRef.current, { y: "0%", duration: 0.5, ease: "power3.out" });
  }, []);

  // Aggiunge la chiusura con ESC
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  const handleClose = () => {
    if (!sectionRef.current) {
      onClose();
      return;
    }
    gsap.to(sectionRef.current, {
      y: "100%",
      duration: 0.5,
      ease: "power3.in",
      onComplete: onClose,
    });
  };

  const content = projectData[project] || {
    title: "Progetto non trovato",
    description: "Nessuna descrizione disponibile",
    images: [],
    link: null,
  };

  // Duplica le immagini per ottenere il looping infinito orizzontale
  const duplicatedImages = content.images.concat(content.images);

  // Imposta il looping infinito dopo il caricamento delle immagini
  useEffect(() => {
    const imagesRow = imagesRowRef.current;
    if (!imagesRow) return;
    const imgs = imagesRow.querySelectorAll("img");
    const promises = Array.from(imgs).map(
      (img) =>
        new Promise((resolve) => {
          if (img.complete) resolve();
          else {
            img.addEventListener("load", resolve);
            img.addEventListener("error", resolve);
          }
        })
    );
    Promise.all(promises).then(() => {
      imagesRow.scrollLeft = 1;
      const singleContentWidth = imagesRow.scrollWidth / 2;
      const TOLERANCE = 1;
      const handleScroll = () => {
        if (imagesRow.scrollLeft < TOLERANCE) {
          imagesRow.scrollLeft = imagesRow.scrollLeft + singleContentWidth - TOLERANCE;
        } else if (imagesRow.scrollLeft >= singleContentWidth - TOLERANCE) {
          imagesRow.scrollLeft = imagesRow.scrollLeft - singleContentWidth + TOLERANCE;
        }
      };
      imagesRow.addEventListener("scroll", handleScroll);
      return () => imagesRow.removeEventListener("scroll", handleScroll);
    });
  }, [duplicatedImages]);

  // Converte lo scroll verticale in scroll orizzontale per l'intera sezione (in modo che, anche se l'utente tocca la parte superiore o inferiore, si scrolli solo la riga immagini)
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const handleWheel = (e) => {
      // Controlla se il target dell'evento non è già l'area immagini (in questo caso, non fare doppio scroll)
      if (!imagesRowRef.current.contains(e.target)) {
        e.preventDefault();
        if (imagesRowRef.current) {
          imagesRowRef.current.scrollLeft += e.deltaY;
        }
      }
    };
    section.addEventListener("wheel", handleWheel, { passive: false });
    return () => section.removeEventListener("wheel", handleWheel);
  }, []);

  return createPortal(
    <div ref={containerRef}>
      <div
        ref={sectionRef}
        className="project-section-mobile"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100vw",
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          position: "relative",
        }}
      >
        <button
          onClick={handleClose}
          className="project-section-mobile-close"
          style={{
            position: "absolute",
            top: "20px",
            right: "20px",
            zIndex: 10000,
            background: "none",
            border: "none",
            fontSize: "1rem",
            cursor: "pointer",
          }}
        >
          [CHIUDI]
        </button>
        {/* Top row: contiene titolo, descrizione e pulsante */}
        <div
          className="project-section-mobile-top"
          style={{
            height: "50vh",
            overflowY: "auto",
            padding: "20px",
            boxSizing: "border-box",
          }}
        >
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
        </div>
        {/* Bottom row: contiene le immagini con scroll infinito orizzontale */}
        <div
          className="project-section-mobile-bottom"
          ref={imagesRowRef}
          style={{
            height: "50vh",
            overflowX: "auto",
            whiteSpace: "nowrap",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {duplicatedImages.map((img, index) => (
            <img
              key={index}
              src={img}
              alt={`${content.title} - ${(index % content.images.length) + 1}`}
              style={{ display: "inline-block", height: "100%" }}
            />
          ))}
        </div>
      </div>
    </div>,
    document.getElementById("modal-root")
  );
};

ProjectSectionMobile.propTypes = {
  onClose: PropTypes.func.isRequired,
  project: PropTypes.string.isRequired,
  projectData: PropTypes.object.isRequired,
};

export default ProjectSectionMobile;
