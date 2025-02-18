// Project1Page.jsx
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { gsap } from "gsap";
import "./Portfolio.css";
import mockup1 from "../../assets/mockup1.jpg";
import mockup2 from "../../assets/mockup2.jpg";
import mockup3 from "../../assets/mockup3.jpg";
import mockup4 from "../../assets/mockup4.jpg";
import mockup5 from "../../assets/mockup5.jpg";
import mockup6 from "../../assets/mockup6.jpg";

const projectData = {
  title: "Progetto 1",
  description: "Descrizione del Progetto 1",
  images: [mockup1, mockup2, mockup3, mockup4, mockup5, mockup6],
  link: "https://example.com/progetto1",
};

export default function Project1Page() {
  const containerRef = useRef(null);
  const imagesRowRef = useRef(null);
  const navigate = useNavigate();

  // Duplica le immagini per il looping infinito
  const duplicatedImages = projectData.images.concat(projectData.images);

  // Effetto fade-in per l'intera pagina
  useEffect(() => {
    if (containerRef.current) {
      gsap.fromTo(
        containerRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.5, ease: "power3.out" }
      );
    }
  }, []);

  // Dopo il caricamento di tutte le immagini, imposta lo scrollLeft iniziale (per evitare 0)
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
    });
  }, [duplicatedImages]);

  // Handler per convertire lo scroll verticale in scroll orizzontale
  const onWheelHandler = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (imagesRowRef.current) {
      imagesRowRef.current.scrollLeft += e.deltaY;
    }
  };

  // Aggiunge l'evento wheel sul container delle immagini
  useEffect(() => {
    const row = imagesRowRef.current;
    if (!row) return;
    row.addEventListener("wheel", onWheelHandler, { passive: false });
    return () => row.removeEventListener("wheel", onWheelHandler);
  }, []);

  // Handler per chiudere la pagina e tornare indietro
  const handleClose = () => {
    navigate(-1);
  };

  return (
    <div
      ref={containerRef}
      className="project-section-mobile-page"
      style={{
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Riga superiore: Titolo, descrizione, link e [CHIUDI] */}
      <div
        className="project-section-mobile-top"
        style={{
          height: "50vh",
          overflowY: "auto",
          padding: "20px",
          boxSizing: "border-box",
        }}
      >
        <h2>{projectData.title}</h2>
        <p>{projectData.description}</p>
        {projectData.link && (
          <a
            href={projectData.link}
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
      {/* Riga inferiore: Contenitore delle immagini con scroll orizzontale */}
      <div
        className="project-section-mobile-bottom"
        ref={imagesRowRef}
        style={{
          height: "50vh",
          overflowX: "scroll",
          whiteSpace: "nowrap",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {duplicatedImages.map((img, index) => (
          <img
            key={index}
            src={img}
            alt={`${projectData.title} - ${(index % projectData.images.length) + 1}`}
            style={{ display: "inline-block", height: "100%" }}
          />
        ))}
      </div>
    </div>
  );
}
