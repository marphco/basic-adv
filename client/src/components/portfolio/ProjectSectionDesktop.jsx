// ProjectSectionDesktop.jsx
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { gsap } from "gsap";
import PropTypes from "prop-types";
import projectData from "./projectData"; // Importa i dati centralizzati
import { useTranslation } from "react-i18next";
import "./Portfolio.css";

const SPEAKER_ON_SVG = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5L6 9H2v6h4l5 4V5z"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>`;
const SPEAKER_OFF_SVG = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5L6 9H2v6h4l5 4V5z"></path><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>`;

function ProjectSectionDesktop({ onClose, project }) {
  const overlayRef = useRef(null);
  const sectionRef = useRef(null);
  const leftColumnRef = useRef(null);
  const videoRefs = useRef([]);
  const isMutedRef = useRef(true);
  const { t } = useTranslation(["common"]);
  const [focusedAsset, setFocusedAsset] = useState(null); // { type, src }

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
      if (e.key === "Escape") {
        e.stopPropagation();
        e.stopImmediatePropagation();
        if (focusedAsset) closeFocus();
        else handleClose();
      }
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

  const base = projectData.find(p => p.id === project) || { images: [], link: null };
  const title = t(
    `portfolio.projects.${project}.title`,
    t("portfolio.notFound")
  );
  const description = t(
    `portfolio.projects.${project}.description`,
    t("portfolio.noDescription")
  );
  const content = { ...base, title, description };

  // Unisce video e immagini in un unico array di media
  const mediaItems = content.video 
    ? [{ type: "video", src: content.video }, ...content.images.map(img => ({ type: "image", src: img }))]
    : content.images.map(img => ({ type: "image", src: img }));

  // Duplica i media per ottenere il looping infinito
  const duplicatedMedia = mediaItems.concat(mediaItems);

  // Funzione che attende il caricamento di tutte le immagini e imposta il looping
  // Funzione che attende il caricamento di tutte le immagini e imposta il looping
  useEffect(() => {
    const leftCol = leftColumnRef.current;
    if (!leftCol) return;

    const mediaElements = leftCol.querySelectorAll("img, video");
    const waitForMedia = Array.from(mediaElements).map(
      (el) =>
        new Promise((resolve) => {
          if (el.tagName === "IMG") {
            if (el.complete) resolve();
            else {
              el.addEventListener("load", resolve, { once: true });
              el.addEventListener("error", resolve, { once: true });
            }
          } else if (el.tagName === "VIDEO") {
            if (el.readyState >= 1) resolve(); // Have metadata
            else {
              el.addEventListener("loadedmetadata", resolve, { once: true });
              el.addEventListener("error", resolve, { once: true });
            }
          }
        })
    );

    const TOLERANCE = 1;
    let handleScroll;

    Promise.all(waitForMedia).then(() => {
      // Usiamo una misura deterministica basata sul viewport per evitare errori di arrotondamento
      const getSingleContentHeight = () => mediaItems.length * window.innerHeight;
      
      if (leftCol.scrollTop === 0) leftCol.scrollTop = 1;

      handleScroll = () => {
        const half = getSingleContentHeight();
        const currentScroll = leftCol.scrollTop;

        if (currentScroll < TOLERANCE) {
          leftCol.scrollTop = currentScroll + half;
        } else if (currentScroll > half + TOLERANCE) {
          leftCol.scrollTop = currentScroll - half;
        }
      };

      leftCol.addEventListener("scroll", handleScroll);
    });

    // Sincronizzazione continua tramite requestAnimationFrame per zero scatti
    let rafId;
    const syncVideos = () => {
      const videos = Array.from(leftCol.querySelectorAll("video"));
      if (videos.length > 1) {
        const master = videos[0];
        videos.forEach((v, idx) => {
          // Forza il play continuo
          if (v.paused) v.play().catch(() => {});
          
          // Sincronizza il tempo solo se c'è un drift percettibile (> 0.1s)
          if (idx > 0) {
            const diff = Math.abs(v.currentTime - master.currentTime);
            if (diff > 0.1) {
              v.currentTime = master.currentTime;
            }
          }
        });
      }
      rafId = requestAnimationFrame(syncVideos);
    };
    rafId = requestAnimationFrame(syncVideos);

    return () => {
      if (handleScroll && leftCol) {
        leftCol.removeEventListener("scroll", handleScroll);
      }
      cancelAnimationFrame(rafId);
    };
  }, [mediaItems.length]);

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

  const handleAssetClick = (item) => {
    setFocusedAsset(item);
  };

  const closeFocus = () => {
    setFocusedAsset(null);
  };

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
        {!focusedAsset && (
          <button
            type="button"
            className="project-section-close"
            onClick={handleClose}
          >
            [{t("navbar.close")}]
          </button>
        )}
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
            {duplicatedMedia.map((item, index) => (
              <div 
                key={index} 
                className="project-media-item"
                data-cursor="view"
                onClick={() => handleAssetClick(item)}
              >
                {item.type === "video" ? (
                  <div className="project-video-container">
                    <video
                      ref={(el) => (videoRefs.current[index] = el)}
                      src={item.src}
                      autoPlay
                      loop
                      muted
                      playsInline
                    />
                    <button
                      type="button"
                      className="audio-toggle-v2 visible"
                      onClick={(e) => {
                        e.stopPropagation();
                        const newMuted = !isMutedRef.current;
                        isMutedRef.current = newMuted;
                        // Sincronizza tutti i video duplicati
                        videoRefs.current.forEach(v => {
                          if (v) v.muted = newMuted;
                        });
                        // Aggiorna l'icona (approccio DOM diretto per performance in scroll infinito)
                        document.querySelectorAll('.audio-toggle-v2').forEach(btn => {
                          btn.innerHTML = newMuted ? SPEAKER_OFF_SVG : SPEAKER_ON_SVG;
                        });
                      }}
                      dangerouslySetInnerHTML={{ __html: SPEAKER_OFF_SVG }}
                    />
                  </div>
                ) : (
                  <img
                    src={item.src}
                    alt={`${content.title} - ${index + 1}`}
                  />
                )}
              </div>
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
        
        {/* Focus Mode Overlay */}
        {focusedAsset && (
          <div className="focus-mode-overlay" onClick={closeFocus}>
            <button className="focus-close" onClick={closeFocus}>
              [{t("navbar.close")}]
            </button>
            <div className="focus-content">
              {focusedAsset.type === "video" ? (
                <video 
                  src={focusedAsset.src} 
                  autoPlay 
                  controls 
                  playsInline
                  className="focused-video"
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <img 
                  src={focusedAsset.src} 
                  alt="Focused View" 
                  className="focused-image" 
                  onClick={(e) => e.stopPropagation()}
                />
              )}
            </div>
          </div>
        )}
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
