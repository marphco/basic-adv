// Portfolio.jsx
import { useState, useEffect, useCallback, useRef, useLayoutEffect } from "react";
import { DndContext, useDraggable, closestCenter } from "@dnd-kit/core";
import "./Portfolio.css";
import folderIcon from "../../assets/folder.svg";
import ProjectSection from "./ProjectSection"; // Importa il componente ProjectSection
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import PropTypes from "prop-types"; // Importa PropTypes
import ProjectSectionDesktop from "./ProjectSectionDesktop";
import ProjectSectionMobile from "./ProjectSectionMobile";

gsap.registerPlugin(ScrollTrigger);

// Hook per determinare se è mobile
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
    id,
    disabled: isMobile,
  });

  const style = isMobile
    ? {}
    : {
        left: left,
        top: top,
        position: "absolute",
        ...(transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : {}),
      };

  // Su desktop usiamo onDoubleClick, mentre su mobile onClick
  const handleDoubleClick = (e) => {
    e.preventDefault();
    onOpenSection(id);
  };

  const handleClick = () => {
    if (isMobile) {
      onOpenSection(id);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...(isMobile
        ? { onClick: handleClick }
        : { onDoubleClick: handleDoubleClick, ...listeners })}
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

const Portfolio = ({ scrollTween = null }) => {
  const isMobile = useIsMobile();

  const [folders, setFolders] = useState([
    { id: "Progetto1", left: 300, top: 100 },
    { id: "Progetto2", left: 500, top: 100 },
    // ... altri progetti ...
  ]);

  // Stato per la modalità e per la sezione progetto
  const [sectionIsOpen, setSectionIsOpen] = useState(false);
  const [currentProject, setCurrentProject] = useState(null);

  // Dati dei progetti
  const projectData = {
    Progetto1: {
      title: "Progetto 1",
      description: "Descrizione del Progetto 1",
      images: [
        "/assets/mockup1.jpg",
        "/assets/mockup2.jpg",
        "/assets/mockup3.jpg",
        "/assets/mockup4.jpg",
        "/assets/mockup5.jpg",
        "/assets/mockup6.jpg",
      ],
      link: "https://example.com/progetto1",
    },
    Progetto2: {
      title: "Progetto 2",
      description: "Descrizione del Progetto 2",
      images: [
        "/assets/mockup1.jpg",
        "/assets/mockup2.jpg",
        "/assets/mockup3.jpg",
        "/assets/mockup4.jpg",
        "/assets/mockup5.jpg",
        "/assets/mockup6.jpg",
      ],
      link: null,
    },
    // ... altri progetti ...
  };

  const savedProgressRef = useRef(0);

  const openSection = (projectId) => {
    document.body.classList.add("project-section-open");

    if (scrollTween?.scrollTrigger) {
      savedProgressRef.current = scrollTween.scrollTrigger.progress;
      scrollTween.scrollTrigger.disable(false, false);
    }

    setCurrentProject(projectId);
    setSectionIsOpen(true);
  };

  const closeSection = () => {
    document.body.classList.remove("project-section-open");

    if (scrollTween?.scrollTrigger) {
      scrollTween.scrollTrigger.enable(false, false);
      scrollTween.scrollTrigger.progress = savedProgressRef.current;
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

  const portfolioRef = useRef(null);

  useLayoutEffect(() => {
    const portfolioElem = portfolioRef.current;
    const portfolioText = portfolioElem?.querySelector(".portfolio-text");

    let ctx = gsap.context(() => {
      if (isMobile) {
        gsap.set(portfolioText, { x: '90vw' });
        gsap.to(portfolioText, {
          x: -200,
          ease: 'none',
          scrollTrigger: {
            trigger: portfolioText,
            start: 'top 100%',
            end: 'top 20%',
            scrub: true,
            invalidateOnRefresh: true,
          },
        });
      } else {
        gsap.to(portfolioText, {
          yPercent: 30,
          ease: "none",
          scrollTrigger: {
            trigger: portfolioElem,
            start: "center top",
            end: "bottom top",
            scrub: 2,
            invalidateOnRefresh: true,
          },
        });
      }
    }, portfolioRef);

    return () => ctx.revert();
  }, [isMobile]);

  return (
    <div className="portfolio-section" ref={portfolioRef}>
      <div className="portfolio">
        <div className="portfolio-text">
          Abbiamo riordinato il desktop solo per te.
        </div>
      </div>

      {!isMobile && (
        <div className="intro-portfolio">
          <p>
            Puoi giocare a spostare le cartelle. Serve a qualcosa? No.
            Però non dimenticare di dare un'occhiata al contenuto.
          </p>
        </div>
      )}

      {isMobile && (
        <div className="intro-mobile">
          <p>
            Non hai scuse, dai un'occhiata al contenuto delle cartelle.
          </p>
        </div>
      )}

      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className={`portfolio-content ${isMobile ? "mobile" : ""}`}>
          {folders.map((folder) => (
            <Folder
              key={folder.id}
              id={folder.id}
              left={folder.left}
              top={folder.top}
              isMobile={isMobile}
              onOpenSection={openSection}
            />
          ))}

          {sectionIsOpen && (
            isMobile ? (
              <ProjectSectionMobile 
                onClose={closeSection}
                project={currentProject}
                projectData={projectData}
              />
            ) : (
              <ProjectSectionDesktop 
                onClose={closeSection}
                project={currentProject}
                projectData={projectData}
              />
            )
          )}
        </div>
      </DndContext>
    </div>
  );
};

Portfolio.propTypes = {
  scrollTween: PropTypes.object,
};

export default Portfolio;