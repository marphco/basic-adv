import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

const ProjectSection = ({ onClose, project }) => {
  const projectSectionRef = useRef(null);
  const overlayRef = useRef(null);

  useEffect(() => {
    // Mostra l'overlay (display: flex) e attiva la transizione dal basso a salire
    if (overlayRef.current) {
      overlayRef.current.style.display = 'flex';
    }
    const timer = requestAnimationFrame(() => {
      if (projectSectionRef.current) {
        projectSectionRef.current.classList.add('show'); 
      }
    });

    // Chiudi con ESC
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);

    return () => {
      document.removeEventListener('keydown', handleEsc);
      cancelAnimationFrame(timer);

      const dot = document.querySelector('.custom-cursor-dot');
      const circle = document.querySelector('.custom-cursor-circle');
      if (dot && circle) {
        dot.classList.remove('hovered', 'hidden', 'clicked');
        circle.classList.remove('hovered', 'hidden');
      }
    };
  }, [onClose]);

  useEffect(() => {
    const el = projectSectionRef.current;
    if (!el) return;

    const handleWheel = (e) => {
      // 1. Sempre stopPropagation, così l'evento non "risale" al container GSAP
      e.stopPropagation();

      const { scrollTop, scrollHeight, clientHeight } = el;
      const deltaY = e.deltaY;

      // 2. Se sei in cima e scrolli in su (deltaY < 0)...
      const scrollingUpAtTop = (scrollTop <= 0 && deltaY < 0);

      // 3. Oppure sei in fondo (scrollTop + clientHeight >= scrollHeight) e scrolli in giù (deltaY > 0)...
      const scrollingDownAtBottom = (scrollTop + clientHeight >= scrollHeight && deltaY > 0);

      if (scrollingUpAtTop || scrollingDownAtBottom) {
        // ...impediamo il default per non trasmettere l'inerzia
        e.preventDefault();
      }
      // Altrimenti lo scroll verticale procede normalmente all'interno della modale
    };

    // Aggiungiamo l'ascoltatore wheel con passive: false
    el.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      el.removeEventListener('wheel', handleWheel, { passive: false });
    };
  }, []);

  // Contenuto
  const projectContent = {
    'Progetto1': {
      title: 'Progetto 1',
      description: 'Descrizione del Progetto 1',
      images: ['path/to/image1.jpg','path/to/image2.jpg']
    },
    'Progetto2': {
      title: 'Progetto 2',
      description: 'Descrizione del Progetto 2',
      images: ['path/to/image2.jpg','path/to/image2.jpg']
    }
    // ... altri ...
  };
  const content = projectContent[project] || {
    title: 'Errore',
    description: 'Progetto non trovato',
    images: []
  };

  // JSX della modale
  const modalJSX = (
    <div 
      ref={overlayRef} 
      className="project-section-overlay"
      onClick={onClose} 
    >
      <div 
        ref={projectSectionRef}
        className="project-section"
        onClick={(e) => e.stopPropagation()} /* previene la chiusura se clicchi dentro */
      >
        <button className="project-section-close" onClick={onClose}>X</button>
        <h2>{content.title}</h2>
        <p>{content.description}</p>
        {content.images.map((image, index) => (
          <img
            key={index}
            src={image}
            alt={`${content.title} - img ${index + 1}`}
            style={{ maxWidth: '100%', marginBottom: '10px' }}
          />
        ))}
      </div>
    </div>
  );

  // Rende la modale in un portal (fuori dal container orizzontale)
  return createPortal(modalJSX, document.getElementById('modal-root'));
};

export default ProjectSection;
