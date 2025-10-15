// ProjectSectionDesktop.jsx
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { gsap } from "gsap";
import PropTypes from "prop-types";
import projectData from "./projectData"; // Importa i dati centralizzati
import { useTranslation } from "react-i18next";
import "./Portfolio.css";

function ProjectSectionDesktop({ onClose, project }) {
  const overlayRef = useRef(null);
  const sectionRef = useRef(null);
  const leftColumnRef = useRef(null);
  const { t } = useTranslation(["common"]);

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
    // Previeni la propagazione dello scroll esterno (con cleanup)
    const stopProp = (e) => e.stopPropagation();
    overlayRef.current.addEventListener("wheel", stopProp, { passive: false });

    gsap.set(sectionRef.current, { y: "100%" });
    gsap.to(sectionRef.current, { y: "0%", duration: 0.5, ease: "power3.out" });
    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      overlayRef.current?.removeEventListener("wheel", stopProp);
    };
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

  const base = projectData[project] || { images: [], link: null };
  const title = t(
    `portfolio.projects.${project}.title`,
    t("portfolio.notFound")
  );
  const description = t(
    `portfolio.projects.${project}.description`,
    t("portfolio.noDescription")
  );
  const content = { ...base, title, description };

  // Duplica le immagini per ottenere il looping infinito
  const duplicatedImages = content.images.concat(content.images);

  // Funzione che attende il caricamento di tutte le immagini e imposta il looping
  // Funzione che attende il caricamento di tutte le immagini e imposta il looping
  useEffect(() => {
    const leftCol = leftColumnRef.current;
    if (!leftCol) return;

    const imgs = leftCol.querySelectorAll("img");
    const waitForImages = Array.from(imgs).map(
      (img) =>
        new Promise((resolve) => {
          if (img.complete) resolve();
          else {
            img.addEventListener("load", resolve, { once: true });
            img.addEventListener("error", resolve, { once: true });
          }
        })
    );

    const TOLERANCE = 1;
    let handleScroll;

    Promise.all(waitForImages).then(() => {
      // ricalcola sempre la metà (se cambiano dimensioni)
      const singleContentHeight = () => leftCol.scrollHeight / 2;

      if (leftCol.scrollTop === 0) leftCol.scrollTop = 1;

      handleScroll = () => {
        const half = singleContentHeight();
        if (leftCol.scrollTop < TOLERANCE) {
          leftCol.scrollTop = leftCol.scrollTop + half - TOLERANCE;
        } else if (leftCol.scrollTop > half - TOLERANCE) {
          leftCol.scrollTop = leftCol.scrollTop - half + TOLERANCE;
        }
      };

      leftCol.addEventListener("scroll", handleScroll);
    });

    return () => {
      if (handleScroll && leftCol) {
        leftCol.removeEventListener("scroll", handleScroll);
      }
    };
  }, [content.images.length]);

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
    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => container.removeEventListener("wheel", handleWheel);
  }, []);

  const openExternal = (url) =>
    window.open(url, "_blank", "noopener,noreferrer");

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
        role="dialog"
        aria-modal="true"
        aria-label={content.title}
      >
        <button
          type="button"
          className="project-section-close"
          onClick={handleClose}
        >
          [{t("navbar.close")}]
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
          <div className="project-left" ref={leftColumnRef}>
            {duplicatedImages.map((img, index) => (
              <img
                key={index}
                src={img}
                alt={`${content.title} - ${
                  (index % content.images.length) + 1
                }`}
              />
            ))}
          </div>
          {/* Colonna destra: testo e pulsante */}
          <div className="project-right">
            <h2>{content.title}</h2>
            <p>{content.description}</p>
            {content.link && (
              <button
                type="button"
                className="project-link"
                onClick={() => openExternal(content.link)}
              >
                {t("portfolio.visitSite")}
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
