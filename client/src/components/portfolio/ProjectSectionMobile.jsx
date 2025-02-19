// ProjectSectionMobilePage.jsx
import { useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { gsap } from "gsap";
import "./Portfolio.css";
import projectData from "./projectData"; // Importa i dati centralizzati

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
    >
      <div
        className="project-section-mobile-top"
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
      >
        {content.images.map((img, index) => (
          <img
            key={index}
            src={img}
            alt={`${content.title} - ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}