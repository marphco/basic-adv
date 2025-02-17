// ProjectSectionDesktop.jsx
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { gsap } from 'gsap';
import PropTypes from 'prop-types';
import mockup1 from '../../assets/mockup1.jpg';
import mockup2 from '../../assets/mockup2.jpg';
import mockup3 from '../../assets/mockup3.jpg';
import mockup4 from '../../assets/mockup4.jpg';
import mockup5 from '../../assets/mockup5.jpg';
import mockup6 from '../../assets/mockup6.jpg';
import './Portfolio.css';

const projectData = {
  Progetto1: {
    title: 'Progetto 1',
    description: 'Descrizione del Progetto 1',
    images: [mockup1, mockup2, mockup3, mockup4, mockup5, mockup6],
    link: 'https://example.com',
  },
  Progetto2: {
    title: 'Progetto 2',
    description: 'Descrizione del Progetto 2',
    images: [mockup1, mockup2, mockup3, mockup4, mockup5, mockup6],
  },
  // ... altri progetti se necessario ...
};

function ProjectSectionDesktop({ onClose, project }) {
  const overlayRef = useRef(null);
  const sectionRef = useRef(null);
  const leftColumnRef = useRef(null);

  // Blocca lo scroll del body aggiungendo una classe (e non modifica il posizionamento)
  useEffect(() => {
    document.body.classList.add('freeze-scroll');
    return () => {
      document.body.classList.remove('freeze-scroll');
    };
  }, []);

  // Configura l’overlay full‑screen e anima l’entrata dal basso
  useEffect(() => {
    if (!overlayRef.current || !sectionRef.current) return;
    // Assicurati che l'overlay copra tutta la viewport
    Object.assign(overlayRef.current.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100vw',
      height: '100vh',
      zIndex: '9999',
      backgroundColor: 'rgba(0,0,0,0.5)',
    });
    // Impedisci che lo scroll del mouse fuori dall'overlay venga propagato
    overlayRef.current.addEventListener('wheel', (e) => e.stopPropagation(), { passive: false });

    gsap.set(sectionRef.current, { y: '100%' });
    gsap.to(sectionRef.current, { y: '0%', duration: 0.5, ease: 'power3.out' });
  }, []);

  // Aggiunge il listener per chiudere con ESC
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  const handleClose = () => {
    if (!sectionRef.current) {
      onClose();
      return;
    }
    gsap.to(sectionRef.current, {
      y: '100%',
      duration: 0.5,
      ease: 'power3.in',
      onComplete: onClose,
    });
  };

  const content = projectData[project] || {
    title: 'Errore',
    description: 'Progetto non trovato',
    images: [],
    link: null,
  };

  // Duplica le immagini per ottenere il looping infinito
  const duplicatedImages = content.images.concat(content.images);

  // Funzione che attende il caricamento di tutte le immagini
  const waitForImages = (container) => {
    const imgs = container.querySelectorAll('img');
    const promises = Array.from(imgs).map((img) =>
      new Promise((resolve) => {
        if (img.complete) {
          resolve();
        } else {
          img.addEventListener('load', resolve);
          img.addEventListener('error', resolve);
        }
      })
    );
    return Promise.all(promises);
  };

  // Attacca il listener per il looping infinito dopo che le immagini sono caricate
  useEffect(() => {
    const leftCol = leftColumnRef.current;
    if (!leftCol) return;
    waitForImages(leftCol).then(() => {
      leftCol.scrollTop = 0;
      const singleContentHeight = leftCol.scrollHeight / 2;
      const handleScroll = () => {
        if (leftCol.scrollTop >= singleContentHeight) {
          leftCol.scrollTop -= singleContentHeight;
        } else if (leftCol.scrollTop < 0) {
          leftCol.scrollTop += singleContentHeight;
        }
      };
      leftCol.addEventListener('scroll', handleScroll);
      return () => leftCol.removeEventListener('scroll', handleScroll);
    });
  }, [duplicatedImages]);

  const modalJSX = (
    <div
      ref={overlayRef}
      className="project-section-overlay"
      onClick={handleClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 9999,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        overflow: 'hidden',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <div
        ref={sectionRef}
        className="project-section"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100vw',
          height: '100vh',
          display: 'flex',
          flexDirection: 'row',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <button
          className="project-section-close"
          onClick={handleClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            zIndex: 10000,
            background: 'none',
            border: 'none',
            fontSize: '1rem',
            cursor: 'pointer',
          }}
        >
          [CHIUDI]
        </button>
        <div className="project-content" style={{ display: 'flex', width: '100%', height: '100%' }}>
          {/* Colonna sinistra: immagini con scroll infinito manuale */}
          <div
            className="project-left"
            ref={leftColumnRef}
            style={{
              width: '50vw',
              height: '100vh',
              overflowY: 'auto',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            {duplicatedImages.map((img, index) => (
              <img
                key={index}
                src={img}
                alt={`${content.title} - ${(index % content.images.length) + 1}`}
                style={{ width: '100%', display: 'block' }}
              />
            ))}
          </div>
          {/* Colonna destra: testo e pulsante */}
          <div
            className="project-right"
            style={{
              width: '50vw',
              height: '100vh',
              overflowY: 'auto',
              padding: '20px',
              boxSizing: 'border-box',
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
        </div>
      </div>
    </div>
  );

  return createPortal(modalJSX, document.getElementById('modal-root'));
}

ProjectSectionDesktop.propTypes = {
  onClose: PropTypes.func.isRequired,
  project: PropTypes.string.isRequired,
};

export default ProjectSectionDesktop;
