// ProjectSectionMobilePage.jsx
import { useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { gsap } from "gsap";
import "./Portfolio.css";
import mockup1 from "../../assets/mockup1.jpg";
import mockup2 from "../../assets/mockup2.jpg";
import mockup3 from "../../assets/mockup3.jpg";
import mockup4 from "../../assets/mockup4.jpg";
import mockup5 from "../../assets/mockup5.jpg";
import mockup6 from "../../assets/mockup6.jpg";

const projectData = {
  Progetto1: {
    title: "Progetto 1",
    description: "Descrizione del Progetto 1",
    images: [mockup1, mockup2, mockup3, mockup4, mockup5, mockup6],
    link: "https://example.com/progetto1",
  },
  Progetto2: {
    title: "Progetto 2",
    description: "Descrizione del Progetto 2",
    images: [mockup1, mockup2, mockup3, mockup4, mockup5, mockup6],
    link: null,
  },
};

export default function ProjectSectionMobilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const imagesRowRef = useRef(null);

  const normalizedId = id.charAt(0).toUpperCase() + id.slice(1);
  const content = projectData[normalizedId] || {
    title: "Progetto non trovato",
    description: "Nessuna descrizione disponibile",
    images: [],
    link: null,
  };

  const duplicatedImages = content.images.concat(content.images);

  useEffect(() => {
    if (containerRef.current) {
      gsap.fromTo(
        containerRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.5, ease: "power3.out" }
      );
    }
  }, []);

  useEffect(() => {
    document.body.classList.add("freeze-scroll");
    return () => document.body.classList.remove("freeze-scroll");
  }, []);

  useEffect(() => {
    const row = imagesRowRef.current;
    if (!row) return;
    const imgs = row.querySelectorAll("img");
    const loadPromises = Array.from(imgs).map((img) =>
      new Promise((resolve) => {
        if (img.complete) resolve();
        else {
          img.addEventListener("load", resolve);
          img.addEventListener("error", resolve);
        }
      })
    );
    Promise.all(loadPromises).then(() => {
      row.scrollLeft = 1;
      const singleContentWidth = row.scrollWidth / 2;
      const TOLERANCE = 1;
      const handleScroll = () => {
        if (row.scrollLeft < TOLERANCE) {
          row.scrollLeft += singleContentWidth - TOLERANCE;
        } else if (row.scrollLeft >= singleContentWidth - TOLERANCE) {
          row.scrollLeft -= singleContentWidth + TOLERANCE;
        }
      };
      row.addEventListener("scroll", handleScroll);
      return () => row.removeEventListener("scroll", handleScroll);
    });
  }, [duplicatedImages]);

  const handleClose = () => {
    navigate(-1);
  };

  return (
    <div
      ref={containerRef}
      className="project-section-mobile-page"
      style={{
        width: "100vw",
        minHeight: "100vh", // Permette alla pagina di espandersi oltre 100vh
        overflowY: "auto", // Abilita lo scroll verticale
        overflowX: "hidden",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#fff",
      }}
    >
      <div
        className="project-section-mobile-top"
        style={{
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
        <button
          onClick={handleClose}
          className="project-section-mobile-close"
          style={{ marginTop: "20px" }}
        >
          [CHIUDI]
        </button>
      </div>
      <div
        className="project-section-mobile-bottom"
        ref={imagesRowRef}
        style={{
          height: "50vh",
          overflowX: "auto",
          overflowY: "hidden", // Solo scroll orizzontale per le immagini
          whiteSpace: "nowrap",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {duplicatedImages.map((img, index) => (
          <img
            key={index}
            src={img}
            alt={`${content.title} - ${(index % content.images.length) + 1}`}
            style={{ display: "inline-block", height: "100%", objectFit: "cover" }}
          />
        ))}
      </div>
    </div>
  );
}