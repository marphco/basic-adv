import { useState, useEffect, useRef, useLayoutEffect } from "react";
import { DndContext, useDraggable, closestCenter } from "@dnd-kit/core";
import "./Portfolio.css";
import folderIcon from "../../assets/folder.svg";
import appsIcon from "../../assets/apps.png";
import chromeIcon from "../../assets/chrome.png";
import figmaIcon from "../../assets/figma.png";
import illustratorIcon from "../../assets/illustrator.png";
import photoshopIcon from "../../assets/photoshop.png";
import mailIcon from "../../assets/mail.png";
import vscodeIcon from "../../assets/vscode.png";
import whatsappIcon from "../../assets/whatsapp.png";
import finderIcon from "../../assets/finder.png";
import trashIcon from "../../assets/trash.png";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import PropTypes from "prop-types";
import ProjectSectionDesktop from "./ProjectSectionDesktop";
import { useNavigate } from "react-router-dom";
import projectData from "./projectData";
import sonomaBg from "../../assets/sonoma3.png";
import { restrictToParentElement } from "@dnd-kit/modifiers";
import { useTranslation, Trans } from "react-i18next";

// ⬇️ usa i componenti locali nella stessa cartella
import MacMenuBar from "./MacMenuBar";
import Dock from "./Dock";

gsap.registerPlugin(ScrollTrigger);

// const useIsMobile = () => {
//   const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
//   useEffect(() => {
//     const onResize = () => setIsMobile(window.innerWidth < 768);
//     window.addEventListener("resize", onResize);
//     return () => window.removeEventListener("resize", onResize);
//   }, []);
//   return isMobile;
// };

const Folder = ({ id, left, top, isMobile, onOpenSection, label }) => {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id,
    disabled: isMobile,
  });

  const style = isMobile
    ? {}
    : {
        position: "absolute",
        left: `${left * 100}%`, // left e top ora sono frazioni [0..1]
        top: `${top * 100}%`,
        transform: transform
          ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
          : undefined,
      };

  const handleDoubleClick = (e) => {
    e.preventDefault();
    onOpenSection(id);
  };

  const handleClick = () => {
    if (isMobile) onOpenSection(id);
  };

  return (
    <div
      ref={setNodeRef}
      data-folder-id={id}
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
      <div className="folder-name">{label}</div>
    </div>
  );
};

Folder.propTypes = {
  id: PropTypes.string.isRequired,
  left: PropTypes.number.isRequired,
  top: PropTypes.number.isRequired,
  isMobile: PropTypes.bool.isRequired,
  onOpenSection: PropTypes.func.isRequired,
  label: PropTypes.string,
};

const Portfolio = ({ scrollTween = null, isMobile = false }) => {
  // const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { t } = useTranslation(["common"]);

  const contentRef = useRef(null);
  const portfolioRef = useRef(null);

  const [folders, setFolders] = useState([
    { id: "Progetto1", x: 0.37, y: 0.08 },
    { id: "Progetto2", x: 0.57, y: 0.08 },
    { id: "Progetto3", x: 0.37, y: 0.26 },
    { id: "Progetto4", x: 0.57, y: 0.26 },
    { id: "Progetto5", x: 0.37, y: 0.44 },
    { id: "Progetto6", x: 0.57, y: 0.44 },
    { id: "Progetto7", x: 0.37, y: 0.62 },
    { id: "Progetto8", x: 0.57, y: 0.62 },
  ]);

  const [sectionIsOpen, setSectionIsOpen] = useState(false);
  const [currentProject, setCurrentProject] = useState(null);
  const savedProgressRef = useRef(0);

  const openSection = (projectId) => {
    if (isMobile) {
      try {
        const y = window.scrollY || window.pageYOffset || 0;
        sessionStorage.setItem("basic:returnY", String(y));
        // eslint-disable-next-line no-empty
      } catch {}
      navigate(`/project/${projectId.toLowerCase()}`);
    } else {
      document.body.classList.add("project-section-open");
      if (scrollTween?.scrollTrigger) {
        savedProgressRef.current = scrollTween.scrollTrigger.progress;
        scrollTween.scrollTrigger.disable(false, false);
      }
      setCurrentProject(projectId);
      setSectionIsOpen(true);
    }
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
    const container = contentRef.current;
    if (!container) return;

    const W = container.clientWidth;
    const H = container.clientHeight;

    setFolders((prev) =>
      prev.map((folder) => {
        if (folder.id !== active.id) return folder;

        // delta in percentuale
        let nx = folder.x + delta.x / W;
        let ny = folder.y + delta.y / H;

        // clamp ai bordi tenendo conto della dimensione icona
        const el = container.querySelector(`[data-folder-id="${active.id}"]`);
        const fw = (el?.offsetWidth ?? 80) / W;
        const fh = (el?.offsetHeight ?? 80) / H;

        nx = Math.min(Math.max(0, nx), 1 - fw);
        ny = Math.min(Math.max(0, ny), 1 - fh);

        return { ...folder, x: nx, y: ny };
      })
    );
  }

  useLayoutEffect(() => {
    const portfolioElem = portfolioRef.current;
    const portfolioText = portfolioElem?.querySelector(".portfolio-text");
    let ctx = gsap.context(() => {
      if (isMobile) {
        gsap.set(portfolioText, { x: "90vw", willChange: "transform" });
        gsap.to(portfolioText, {
          x: -200,
          ease: "none",
          force3D: true, // ✅ compositing
          scrollTrigger: {
            trigger: portfolioText,
            start: "top 100%",
            end: "top 20%",
            scrub: true,
            invalidateOnRefresh: true,
            refreshPriority: 1, // ✅ calcola dopo Services
          },
        });
      } else {
        // (ramo desktop INVARIATO)
        gsap.set(portfolioText, { willChange: "transform" });
        gsap.to(portfolioText, {
          yPercent: 90,
          ease: "none",
          scrollTrigger: {
            trigger: portfolioElem,
            containerAnimation: scrollTween,
            start: "left center",
            end: "right center",
            scrub: 2,
            invalidateOnRefresh: true,
          },
        });
      }
    }, portfolioRef);
    return () => ctx.revert();
  }, [isMobile, scrollTween]);

  // Stato Dock: app aperte e app "in focus"
  const [dockApps, setDockApps] = useState(() => [
    {
      id: "finder",
      label: t("portfolio.dock.finder"),
      src: finderIcon,
      active: true,
    },
    {
      id: "apps",
      label: t("portfolio.dock.apps"),
      src: appsIcon,
      active: false,
    },
    {
      id: "whatsapp",
      label: t("portfolio.dock.whatsapp"),
      src: whatsappIcon,
      active: false,
    },
    {
      id: "chrome",
      label: t("portfolio.dock.chrome"),
      src: chromeIcon,
      active: false,
    },
    {
      id: "figma",
      label: t("portfolio.dock.figma"),
      src: figmaIcon,
      active: false,
    },
    {
      id: "vscode",
      label: t("portfolio.dock.vscode"),
      src: vscodeIcon,
      active: false,
    },
    {
      id: "illustrator",
      label: t("portfolio.dock.illustrator"),
      src: illustratorIcon,
      active: false,
    },
    {
      id: "photoshop",
      label: t("portfolio.dock.photoshop"),
      src: photoshopIcon,
      active: false,
    },
    { type: "separator" },
    {
      id: "mail",
      label: t("portfolio.dock.mail"),
      src: mailIcon,
      active: false,
    },
    {
      id: "trash",
      label: t("portfolio.dock.trash"),
      src: trashIcon,
      active: false,
    },
  ]);
  const [focusedId, setFocusedId] = useState("finder");

  // Se cambi lingua, rigenera le label mantenendo stato open/focus
  useEffect(() => {
    setDockApps((prev) =>
      prev.map((it) =>
        it.type === "separator"
          ? it
          : {
              ...it,
              label: t(`portfolio.dock.${it.id}`),
            }
      )
    );
  }, [t]);

  const handleToggleApp = (id) => {
    setDockApps((prev) => {
      // Finder non si chiude mai: resta attivo e prende focus
      if (id === "finder") {
        setFocusedId("finder");
        return prev.map((it) =>
          it.id === "finder" ? { ...it, active: true } : it
        );
      }

      const next = prev.map((it) =>
        it.id === id ? { ...it, active: !it.active } : it
      );
      const clicked = next.find((it) => it.id === id);

      if (clicked?.active) {
        // attivata => prende focus
        setFocusedId(id);
      } else {
        // disattivata: se era in focus, scegli nuovo focus
        if (focusedId === id) {
          const finderActive = next.find((it) => it.id === "finder")?.active;
          const another = next.find((it) => it.active && it.id !== "finder");
          setFocusedId(finderActive ? "finder" : another?.id || "finder");
        }
      }
      return next;
    });
  };

  const activeAppLabel = dockApps.find((a) => a.id === focusedId)?.label;

  return (
    <div className="portfolio-section" ref={portfolioRef}>
      {/* Barra verticale arancio a sinistra (10vw) */}
      <div className="portfolio">
        <div className="portfolio-text">{t("portfolio.banner")}</div>
      </div>

      {/* Pannello "desktop" a destra (90vw) */}
      <div className="desktop-pane">
        <div
          className="desktop-wallpaper"
          style={{ backgroundImage: `url(${sonomaBg})` }}
          aria-hidden
        />

        <MacMenuBar activeAppId={focusedId} activeAppLabel={activeAppLabel} />

        {!isMobile ? (
          <div className="intro-portfolio">
            <p>
              <Trans
                i18nKey="portfolio.introDesktop"
                components={{ hl: <span className="intro-accent" /> }}
              />
            </p>
          </div>
        ) : (
          <div className="intro-mobile">
            <p>
              {t("portfolio.introMobile.pre")}
              <span>{t("portfolio.introMobile.cta")}</span>
            </p>
          </div>
        )}

        <DndContext
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
          modifiers={[restrictToParentElement]}
        >
          <div
            ref={contentRef}
            className={`portfolio-content ${isMobile ? "mobile" : ""}`}
          >
            {folders.map((folder) => (
              <Folder
                key={folder.id}
                id={folder.id}
                left={folder.x}
                top={folder.y}
                isMobile={isMobile}
                onOpenSection={openSection}
                label={t(`portfolio.folders.${folder.id}`, folder.id)} // 👈 label tradotta
              />
            ))}
            {sectionIsOpen && !isMobile && (
              <ProjectSectionDesktop
                onClose={closeSection}
                project={currentProject}
                projectData={projectData}
              />
            )}
          </div>
        </DndContext>

        <div className="dock-strip">
          <Dock icons={dockApps} onToggleActive={handleToggleApp} />
        </div>
      </div>
    </div>
  );
};

Portfolio.propTypes = {
  scrollTween: PropTypes.object,
  isMobile: PropTypes.bool.isRequired,
};

export default Portfolio;
