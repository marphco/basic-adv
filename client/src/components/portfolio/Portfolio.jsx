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
import projectData from "./projectData"; // Importa i dati centralizzati
import sonomaBg from "../../assets/sonoma3.png";
import { restrictToParentElement } from "@dnd-kit/modifiers";
// import MacMenuBar from "./MacMenuBar";

gsap.registerPlugin(ScrollTrigger);

const MacMenuBar = () => {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30 * 1000);
    return () => clearInterval(id);
  }, []);

  const DAYS = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];
  const MONTHS = [
    "Gen",
    "Feb",
    "Mar",
    "Apr",
    "Mag",
    "Giu",
    "Lug",
    "Ago",
    "Set",
    "Ott",
    "Nov",
    "Dic",
  ];
  const pad2 = (n) => String(n).padStart(2, "0");
  const nbsp = "\u00A0"; // non-breaking space => non collassa

  const d = now.getDate(); // niente 0 iniziale
  const clock = `${DAYS[now.getDay()]} ${d} ${
    MONTHS[now.getMonth()]
  }${nbsp}${nbsp}${pad2(now.getHours())}:${pad2(now.getMinutes())}`;

  return (
    <div className="mac-menubar">
      <div className="menubar-left">
        <span className="apple"></span>
        <span className="menu-item active">Finder</span>
        <span className="menu-item">File</span>
        <span className="menu-item">Edit</span>
        <span className="menu-item">View</span>
        <span className="menu-item">Go</span>
        <span className="menu-item">Window</span>
        <span className="menu-item">Help</span>
      </div>
      <div className="menubar-right">
        <span className="status">{clock}</span>
      </div>
    </div>
  );
};

// --- Dock (mac-like) ---------------------------------------------------------

const Dock = ({ icons }) => {
  const ref = useRef(null);
  const rafRef = useRef(null);

  // scala "corrente" e "target" per ogni icona
  const setupScales = () => {
    const items = ref.current?.querySelectorAll(".dock-item") ?? [];
    items.forEach((it) => {
      it.dataset.scale = it.dataset.scale ?? "1";
      it.dataset.target = it.dataset.target ?? "1";
    });
  };

  // animazione smooth verso il target (lerp)
  const animate = () => {
    const items = ref.current?.querySelectorAll(".dock-item") ?? [];
    items.forEach((it) => {
      const cur = parseFloat(it.dataset.scale || "1");
      const tgt = parseFloat(it.dataset.target || "1");
      const next = cur + (tgt - cur) * 0.18; // fattore di smorzamento
      it.dataset.scale = next.toFixed(3);
      // NB: uso una var CSS per il "bounce" (vedi CSS); qui controllo solo la scala
      it.style.transform = `translateY(var(--ty)) scale(${next.toFixed(
        3
      )}) scaleX(var(--sx,1)) scaleY(var(--sy,1))`;
    });
    rafRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    setupScales();
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // magnifica rispetto alla distanza dal mouse
  const handleMove = (e) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;

    // Leggi valori correnti (possono cambiare quando la dock è scalata)
    const MAX = parseFloat(el.style.getPropertyValue("--dock-max")) || 1.7;
    const RADIUS =
      parseFloat(el.style.getPropertyValue("--dock-radius")) || 120;

    el.querySelectorAll(".dock-item").forEach((item) => {
      const r = item.getBoundingClientRect();
      const cx = r.left - rect.left + r.width / 2;
      const d = Math.abs(cx - x);
      const t = Math.max(0, 1 - d / RADIUS);
      const target = 1 + (MAX - 1) * (t * t);
      item.dataset.target = target.toFixed(3);
    });
  };

  const fitDock = () => {
    const el = ref.current;
    if (!el) return;

    // il frame è la banda che centra la dock
    const frame = el.parentElement; // .dock-strip
    if (!frame) return;

    // reset scala per misurare la larghezza naturale
    el.style.setProperty("--dock-scale", "1");

    const natural = el.scrollWidth; // larghezza reale della dock (bubble)
    const frameWidth =
      frame.clientWidth -
      parseFloat(getComputedStyle(frame).paddingLeft || "0") -
      parseFloat(getComputedStyle(frame).paddingRight || "0");

    let s = natural > frameWidth ? frameWidth / natural : 1;
    s = Math.max(0.72, Math.min(1, s)); // clamp: non scendere troppo

    el.style.setProperty("--dock-scale", s.toFixed(3));

    // Quando la dock è compressa, riduci un po' magnification e raggio
    const maxMagBase = 1.7;
    const maxMag = maxMagBase - (1 - s) * 0.45; // ~1.25 quando molto compressa
    const radius = Math.max(80, 120 * s); // non meno di 80px

    el.style.setProperty("--dock-max", maxMag.toFixed(2));
    el.style.setProperty("--dock-radius", radius.toFixed(0));
  };

  useLayoutEffect(() => {
    fitDock();
    const onR = () => fitDock();
    window.addEventListener("resize", onR);
    return () => window.removeEventListener("resize", onR);
  }, [icons.length]); // se cambi numero di icone, rifà il fit

  const reset = () => {
    const el = ref.current;
    if (!el) return;
    el.querySelectorAll(".dock-item").forEach((item) => {
      item.dataset.target = "1";
    });
  };

  // stato "attive" (pallino bianco)
  const [activeIds, setActiveIds] = useState(
    () => new Set(icons.filter((i) => i.active).map((i) => i.id))
  );
  const toggleActive = (id) =>
    setActiveIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  return (
    <div
      className="dock"
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={reset}
      role="toolbar"
      aria-label="Applicazioni"
    >
      {icons.map((it) =>
        it.type === "separator" ? (
          <div key="dock-sep" className="dock-sep" aria-hidden />
        ) : (
          <button
            key={it.id}
            className="dock-item"
            data-id={it.id}
            title={it.label}
            onClick={(e) => {
              e.preventDefault();

              const btn = e.currentTarget;

              // riavvia l'animazione anche se è già in corso
              btn.classList.remove("bounce");
              // force reflow per ri-trigger
              btn.offsetWidth;
              btn.classList.add("bounce");

              // rimuovi la classe SOLO a fine animazione
              btn.addEventListener(
                "animationend",
                () => btn.classList.remove("bounce"),
                { once: true }
              );

              toggleActive(it.id);
              it.onClick?.();
            }}
          >
            <img src={it.src} alt="" />
            {activeIds.has(it.id) && <span className="dock-dot" />}
          </button>
        )
      )}
    </div>
  );
};

Dock.propTypes = {
  icons: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string,
      label: PropTypes.string,
      src: PropTypes.string,
      active: PropTypes.bool,
      onClick: PropTypes.func,
      type: PropTypes.string, // "separator" per il separatore
    })
  ).isRequired,
};

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
        ...(transform
          ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
          : {}),
      };

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
      <div className="folder-name">{id}</div>
    </div>
  );
};

Folder.propTypes = {
  id: PropTypes.string.isRequired,
  left: PropTypes.number.isRequired,
  top: PropTypes.number.isRequired,
  isMobile: PropTypes.bool.isRequired,
  onOpenSection: PropTypes.func.isRequired,
};

const Portfolio = ({ scrollTween = null }) => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  // dentro Portfolio()
  const contentRef = useRef(null);

  const [folders, setFolders] = useState([
    { id: "Progetto1", left: 300, top: 150 },
    { id: "Progetto2", left: 500, top: 150 },
    { id: "Progetto3", left: 300, top: 300 },
    { id: "Progetto4", left: 500, top: 300 },
    { id: "Progetto5", left: 300, top: 450 },
    { id: "Progetto6", left: 500, top: 450 },
    { id: "Progetto7", left: 300, top: 600 },
    { id: "Progetto8", left: 500, top: 600 },
  ]);

  const [sectionIsOpen, setSectionIsOpen] = useState(false);
  const [currentProject, setCurrentProject] = useState(null);

  const savedProgressRef = useRef(0);

  const openSection = (projectId) => {
    if (isMobile) {
      // 👇 Salva la posizione attuale per ripristinarla al ritorno su "/"
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
  const container = contentRef.current; // limiti = .portfolio-content

  setFolders((prev) =>
    prev.map((folder) => {
      if (folder.id !== active.id) return folder;

      let nextLeft = folder.left + delta.x;
      let nextTop  = folder.top  + delta.y;

      if (container) {
        // misura il box reale della folder
        const el =
          container.querySelector(`[data-folder-id="${active.id}"]`);
        const fw = el?.offsetWidth  ?? 80;
        const fh = el?.offsetHeight ?? 80;

        const maxLeft = Math.max(0, container.clientWidth  - fw);
        const maxTop  = Math.max(0, container.clientHeight - fh);

        // clamp
        nextLeft = Math.min(Math.max(0, nextLeft), maxLeft);
        nextTop  = Math.min(Math.max(0, nextTop),  maxTop);
      }

      return { ...folder, left: nextLeft, top: nextTop };
    })
  );
}


  const portfolioRef = useRef(null);

  useLayoutEffect(() => {
    const portfolioElem = portfolioRef.current;
    const portfolioText = portfolioElem?.querySelector(".portfolio-text");
    let ctx = gsap.context(() => {
      if (isMobile) {
        gsap.set(portfolioText, { x: "90vw" });
        gsap.to(portfolioText, {
          x: -200,
          ease: "none",
          scrollTrigger: {
            trigger: portfolioText,
            start: "top 100%",
            end: "top 20%",
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

  const dockIcons = [
    // sinistra
    { id: "finder", label: "Finder", src: finderIcon, active: true },
    { id: "apps", label: "Apps", src: appsIcon },
    { id: "whatsapp", label: "WhatsApp", src: whatsappIcon },
    { id: "chrome", label: "Chrome", src: chromeIcon },
    { id: "figma", label: "Figma", src: figmaIcon },
    { id: "vscode", label: "VS Code", src: vscodeIcon },
    { id: "illustrator", label: "Illustrator", src: illustratorIcon },
    { id: "photoshop", label: "Photoshop", src: photoshopIcon },

    // separatore unico
    { type: "separator" },

    // destra (SOLO 2)
    { id: "mail", label: "Mail", src: mailIcon },
    { id: "trash", label: "Trash", src: trashIcon },
  ];

  return (
    <div className="portfolio-section" ref={portfolioRef}>
      {/* Barra verticale arancio a sinistra (10vw) */}
      <div className="portfolio">
        <div className="portfolio-text">
          abbiamo riordinato il desktop solo per te.
        </div>
      </div>

      {/* Pannello "desktop" a destra (90vw) */}
      <div className="desktop-pane">
        <div
          className="desktop-wallpaper"
          style={{ backgroundImage: `url(${sonomaBg})` }}
          aria-hidden
        />

        <MacMenuBar />

        {!isMobile ? (
          <div className="intro-portfolio">
            <p>
              Puoi giocare a spostare le cartelle. Serve a qualcosa? No. Però
              poi guarda cosa c&apos;è dentro.
            </p>
          </div>
        ) : (
          <div className="intro-mobile">
            <p>
              Non hai scuse, dai un&apos;occhiata al contenuto delle cartelle.
            </p>
          </div>
        )}

        <DndContext
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
          modifiers={[restrictToParentElement]} // ⬅️ blocca dentro al parent
        >
          <div
            ref={contentRef}
            className={`portfolio-content ${isMobile ? "mobile" : ""}`}
          >
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
          <Dock icons={dockIcons} />
        </div>
      </div>
    </div>
  );
};

Portfolio.propTypes = {
  scrollTween: PropTypes.object,
};

export default Portfolio;
