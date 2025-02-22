// ProjectSectionDesktop.jsx
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { gsap } from "gsap";
import PropTypes from "prop-types";
import projectData from "./projectData"; // Importa i dati centralizzati
import "./Portfolio.css";

function ProjectSectionDesktop({ onClose, project }) {
  const overlayRef = useRef(null);
  const sectionRef = useRef(null);
  const leftColumnRef = useRef(null);

  // Blocca lo scroll del sito usando una classe CSS
  useEffect(() => {
    document.body.classList.add("freeze-scroll");
    return () => {
      document.body.classList.remove("freeze-scroll");
    };
  }, []);

  // Configura l’overlay full‑screen e anima l’entrata dal basso
  useEffect(() => {
    if (!overlayRef.current || !sectionRef.current) return;
    // Previeni la propagazione dello scroll esterno
    overlayRef.current.addEventListener("wheel", (e) => e.stopPropagation(), {
      passive: false,
    });

    gsap.set(sectionRef.current, { y: "100%" });
    gsap.to(sectionRef.current, { y: "0%", duration: 0.5, ease: "power3.out" });
  }, []);

  // Chiusura con ESC
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
    title: "Errore",
    description: "Progetto non trovato",
    images: [],
    link: null,
  };

  // Duplica le immagini per ottenere il looping infinito
  const duplicatedImages = content.images.concat(content.images);

  // Funzione che attende il caricamento di tutte le immagini e imposta il looping
  useEffect(() => {
    const leftCol = leftColumnRef.current;
    if (!leftCol) return;
  
    // Attendi il caricamento di tutte le immagini
    const imgs = leftCol.querySelectorAll("img");
    const waitForImages = Array.from(imgs).map(
      (img) =>
        new Promise((resolve) => {
          if (img.complete) {
            resolve();
          } else {
            img.addEventListener("load", resolve);
            img.addEventListener("error", resolve);
          }
        })
    );
    Promise.all(waitForImages).then(() => {
      // Dopo che tutte le immagini sono state caricate, calcola l'altezza della prima copia
      const singleContentHeight = leftCol.scrollHeight / 2;
      // Imposta lo scroll iniziale (opzionale)
      leftCol.scrollTop = 1; // imposta a 1 px per evitare 0 esatto
  
      const TOLERANCE = 1; // Puoi regolare questo valore se necessario
  
      const handleScroll = () => {
        if (leftCol.scrollTop < TOLERANCE) {
          // Se l'utente ha scrollato troppo in alto, riporta alla fine della prima copia
          leftCol.scrollTop = leftCol.scrollTop + singleContentHeight - TOLERANCE;
        } else if (leftCol.scrollTop > singleContentHeight - TOLERANCE) {
          // Se l'utente ha scrollato troppo in basso, riportalo all'inizio della prima copia
          leftCol.scrollTop = leftCol.scrollTop - singleContentHeight + TOLERANCE;
        }
      };
  
      leftCol.addEventListener("scroll", handleScroll);
      // Pulizia del listener quando il componente viene smontato
      return () => leftCol.removeEventListener("scroll", handleScroll);
    });
  }, [duplicatedImages]);

  useEffect(() => {
    const container = overlayRef.current;
    if (!container) return;
    // Funzione per intercettare lo scroll sull'intero overlay
    const handleWheel = (e) => {
      // Blocca il comportamento predefinito e la propagazione
      e.preventDefault();
      e.stopPropagation();
      // Applica lo scroll alla colonna delle immagini
      if (leftColumnRef.current) {
        leftColumnRef.current.scrollTop += e.deltaY;
      }
    };
    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, []);

  const modalJSX = (
    <div
      ref={overlayRef}
      className="project-section-overlay"
      onClick={handleClose}
    >
      <div
        ref={sectionRef}
        className="project-section"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="project-section-close"
          onClick={handleClose}
        >
          [CHIUDI]
        </button>
        <div
          className="project-content"
          onWheel={(e) => {
            // Impedisci lo scroll predefinito sull'overlay
            e.preventDefault();
            // Applica lo scroll alla colonna sinistra
            if (leftColumnRef.current) {
              leftColumnRef.current.scrollTop += e.deltaY;
            }
          }}
        >
          {/* Colonna sinistra: immagini con scroll infinito */}
          <div
            className="project-left"
            ref={leftColumnRef}
          >
            {duplicatedImages.map((img, index) => (
              <img
                key={index}
                src={img}
                alt={`${content.title} - ${(index % content.images.length) + 1}`}
              />
            ))}
          </div>
          {/* Colonna destra: testo e pulsante */}
          <div
            className="project-right"
          >
            <h2>{content.title}</h2>
            <p>{content.description}</p>
            {content.link && (
              <button
                href={content.link}
                target="_blank"
                rel="noopener noreferrer"
                className="project-link"
              >
                Visita il sito
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalJSX, document.getElementById("modal-root"));
}

ProjectSectionDesktop.propTypes = {
  onClose: PropTypes.func.isRequired,
  project: PropTypes.string.isRequired,
};

export default ProjectSectionDesktop;