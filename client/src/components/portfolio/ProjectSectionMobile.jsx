// ProjectSectionMobilePage.jsx
import { useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
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
  const containerRef = useRef(null);
  const imagesRowRef = useRef(null);

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

  useEffect(() => {
    const imagesRow = imagesRowRef.current;
    if (!imagesRow) return;

    const images = imagesRow.querySelectorAll("img");
    const loadPromises = Array.from(images).map(
      (img) =>
        new Promise((resolve) => {
          if (img.complete) resolve();
          else {
            img.addEventListener("load", resolve);
            img.addEventListener("error", resolve);
          }
        })
    );

    Promise.all(loadPromises).then(() => {
      const viewportHeight = window.innerHeight;
      imagesRow.scrollTop = 896; // Inizia con immagine 4 visibile

      console.log(
        "Inizializzazione - scrollTop:",
        imagesRow.scrollTop,
        "viewportHeight:",
        viewportHeight
      );
    });
  }, []);

  return (
    <div
      ref={containerRef}
      className="project-section-mobile-page"
      style={{
        width: "100vw",
        minHeight: "100vh",
        overflowY: "auto",
        overflowX: "hidden",
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
          height: "30vh",
          padding: "20px",
          boxSizing: "border-box",
          zIndex: 10,
          overflowY: "auto",
        }}
      >
        <div className="project-text-container">
          <div className="project-text">
            <h2 className="project-title">{content.title}</h2>
            <p className="project-description">{content.description}</p>
            {content.link && (
              <button
              href={content.link}
              target="_blank"
              rel="noopener noreferrer"
              className="project-link"
            >
              Visita il sito
            </button>
            )}
          </div>
        </div>
      </div>
      <div
        ref={imagesRowRef}
        className="project-section-mobile-bottom"
        style={{
          marginTop: "60vh",
          overflowY: "auto",
          overflowX: "hidden",
          WebkitOverflowScrolling: "touch",
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
              height: "60vh",
              objectFit: "cover",
              margin: 0,
              padding: 0,
            }}
          />
        ))}
      </div>
    </div>
  );
}
