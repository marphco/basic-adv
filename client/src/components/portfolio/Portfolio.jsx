import { useState, useEffect, useCallback, useRef } from "react";
import { DndContext, useDraggable, closestCenter } from "@dnd-kit/core";
// import { arrayMove } from "@dnd-kit/sortable";
import "./Portfolio.css";
import folderIcon from "../../assets/folder.svg";
import ProjectSection from "./ProjectSection"; // Importa il nuovo componente
import PropTypes from "prop-types"; // Importa PropTypes

const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return isMobile;
};

const Folder = ({ id, left, top, isMobile, onOpenSection }) => {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: id,
    disabled: isMobile,
  });

  const style = isMobile
    ? {}
    : {
        ...(transform
          ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
          : {}),
        left: left,
        top: top,
        position: "absolute",
      };

  const lastClickTimeRef = useRef(0); // Usa un ref invece dello stato
  const doubleClickTime = 300;

  // Singolo handleClick, con logica diversa se mobile o desktop
  const handleClick = useCallback(
    (event) => {
      if (isMobile) {
        // Mobile: apri la sezione subito
        onOpenSection(id);
      } else {
        // Desktop: rileva doppio clic
        const currentTime = Date.now();
        const delta = currentTime - lastClickTimeRef.current;

        if (delta < doubleClickTime) {
          event.preventDefault();
          onOpenSection(id);
        }

        if (delta >= doubleClickTime) {
          lastClickTimeRef.current = currentTime;
        }
      }
    },
    [isMobile, onOpenSection, id]
  );

  // Solo su Desktop attachiamo i listener di drag + doppio clic
  const modifiedListeners = !isMobile
    ? {
        ...listeners,
        onPointerDown: (event) => {
          // Se clic sinistro, verifichiamo doppio clic
          if (event.button === 0 && !event.defaultPrevented) {
            handleClick(event);
          }
          listeners.onPointerDown(event);
        },
      }
    : {};

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      // se mobile → onClick apre sezione. se desktop → usiamo i pointerDown
      {...(isMobile ? { onClick: handleClick } : modifiedListeners)}
      className={`folder ${isMobile ? "mobile" : ""}`}
    >
      <img
        src={folderIcon}
        alt="Folder Icon"
        width="50"
        height="50"
        className="folder-icon"
      />
      <div className="folder-name">{id}</div>
    </div>
  );
};

// Definizione delle PropTypes per il componente Folder
Folder.propTypes = {
  id: PropTypes.string.isRequired,
  left: PropTypes.number.isRequired,
  top: PropTypes.number.isRequired,
  isMobile: PropTypes.bool.isRequired,
  onOpenSection: PropTypes.func.isRequired,
};

function Portfolio({ scrollTween = null }) { // Imposta scrollTween con default a null
  const isMobile = useIsMobile();

  const [folders, setFolders] = useState([
    { id: "Progetto1", left: 300, top: 100 },
    { id: "Progetto2", left: 500, top: 100 },
    // ... altri progetti ...
  ]);

  // Stato per la modalità
  // Cambiamo il nome dello stato da modalIsOpen a sectionIsOpen
  const [sectionIsOpen, setSectionIsOpen] = useState(false);
  const [currentProject, setCurrentProject] = useState(null);

  // Salveremo il progress in una ref (o in state)
  const savedProgressRef = useRef(0);

  // Funzione per aprire la sezione
  const openSection = (projectId) => {
    document.body.classList.add("project-section-open");

    if (scrollTween?.scrollTrigger) {
      // Salviamo la posizione corrente (progress) di ScrollTrigger
      savedProgressRef.current = scrollTween.scrollTrigger.progress;
      // Disabilitiamo senza resettare
      scrollTween.scrollTrigger.disable(false, false);
    }

    setCurrentProject(projectId);
    setSectionIsOpen(true);
  };

  const closeSection = () => {
    document.body.classList.remove("project-section-open");

    if (scrollTween?.scrollTrigger) {
      // Riabilitiamo senza resettare
      scrollTween.scrollTrigger.enable(false, false);
      // Impostiamo progress all'esatto valore in cui era prima
      scrollTween.scrollTrigger.progress = savedProgressRef.current;
      // Aggiorniamo forzando un refresh interno
      scrollTween.scrollTrigger.update();
    }

    setCurrentProject(null);
    setSectionIsOpen(false);
  };

  function handleDragEnd(event) {
    if (isMobile) return;
    const { active, delta } = event;
    setFolders((prevFolders) =>
      prevFolders.map((folder) =>
        folder.id === active.id
          ? {
              ...folder,
              left: folder.left + delta.x,
              top: folder.top + delta.y,
            }
          : folder
      )
    );
  }

  return (
    <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className={`portfolio-section ${isMobile ? "mobile" : ""}`}>
        {folders.map((folder) => (
          <Folder
            key={folder.id}
            id={folder.id}
            left={folder.left}
            top={folder.top}
            isMobile={isMobile}
            onOpenSection={openSection} // Rinominato da onOpenModal a onOpenSection
          />
        ))}
        {sectionIsOpen && (
          <ProjectSection onClose={closeSection} project={currentProject} />
        )}
      </div>
    </DndContext>
  );
}

// Definizione delle PropTypes per il componente Portfolio
Portfolio.propTypes = {
  scrollTween: PropTypes.object, // Tipizza meglio se possibile (es. PropTypes.shape({...}))
};

export default Portfolio;
