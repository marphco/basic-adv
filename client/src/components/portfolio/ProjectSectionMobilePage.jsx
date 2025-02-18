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
    description: "Descrizione del Progetto 1.",
    images: [mockup1, mockup2, mockup3, mockup4, mockup5, mockup6],
    link: "https://example.com/progetto1",
  },
  Progetto2: {
    title: "Progetto 2",
    description: "Descrizione del Progetto 2.",
    images: [mockup1, mockup2, mockup3, mockup4, mockup5, mockup6],
    link: null,
  },
};

export default function ProjectSectionMobilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const containerRef = useRef(null);

  const normalizedId = id.charAt(0).toUpperCase() + id.slice(1);
  const content = projectData[normalizedId] || {
    title: "Progetto non trovato",
    description: "Nessuna descrizione disponibile",
    images: [],
    link: null,
  };

  useEffect(() => {
    if (containerRef.current) {
      gsap.fromTo(
        containerRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.5, ease: "power3.out" }
      );
    }
  }, []);

  const handleClose = () => {
    navigate(-1); // Torna indietro senza modificare lo scroll del body
  };

  return (
    <div
      ref={containerRef}
      className="project-section-mobile-page"
      style={{
        width: "100vw",
        minHeight: "350vh", // Altezza totale per ospitare 50vh fissa + 300vh immagini
        overflowY: "auto", // Scroll verticale per l’intera pagina
        overflowX: "hidden",
        backgroundColor: "#fff",
        position: "relative",
      }}
    >
      <div
        className="project-section-mobile-top"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "50vh", // Altezza fissa per la sezione superiore
          padding: "20px",
          boxSizing: "border-box",
          backgroundColor: "#fff",
          zIndex: 10,
          overflowY: "auto", // Scroll interno se il contenuto è lungo
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
          style={{ marginTop: "10px" }}
        >
          [CHIUDI]
        </button>
      </div>
      <div
        className="project-section-mobile-bottom"
        style={{
          marginTop: "50vh", // Spazio per la sezione fissa sopra
          height: "300vh", // Altezza totale delle sei immagini
          overflowY: "auto", // Scroll verticale per le immagini
          overflowX: "hidden",
        }}
      >
        {content.images.map((img, index) => (
          <img
            key={index}
            src={img}
            alt={`${content.title} - ${index + 1}`}
            style={{
              display: "block",
              width: "100vw",
              height: "50vh", // Ogni immagine occupa 50vh
              objectFit: "cover",
            }}
          />
        ))}
      </div>
    </div>
  );
}