import { useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import "./Portfolio.css";
import projectData from "./projectData";

gsap.registerPlugin(ScrollTrigger);

export default function ProjectSectionMobilePage() {
  const { id } = useParams();
  const containerRef = useRef(null);
  const imagesRowRef = useRef(null);
  const topSectionRef = useRef(null);

  const normalizedId = id.charAt(0).toUpperCase() + id.slice(1);
  const content = projectData[normalizedId] || {
    title: "Progetto non trovato",
    description: "Nessuna descrizione disponibile",
    images: [],
    link: null,
  };

  useEffect(() => {
    const m = document.createElement("meta");
    m.name = "robots";
    m.content = "noindex, follow";
    document.head.appendChild(m);

    const c = document.createElement("link");
    c.rel = "canonical";
    c.href = "https://www.basicadv.com/#portfolio";
    document.head.appendChild(c);

    return () => {
      document.head.removeChild(m);
      document.head.removeChild(c);
    };
  }, []);

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
      imagesRow.scrollTop = 896; // Inizia con immagine 4 visibile
      // console.log("Immagini caricate, scrollTop:", imagesRow.scrollTop);
    });
  }, []);

  useEffect(() => {
    const imagesRow = imagesRowRef.current;
    const topSection = topSectionRef.current;
    if (!imagesRow || !topSection) return;

    gsap.to(topSection, {
      x: "-100vw", // Sposta a sinistra fuori dallo schermo
      opacity: 0, // Scompare
      ease: "power2.easeOut",
      scrollTrigger: {
        trigger: imagesRow, // L'animazione è legata allo scroll di imagesRow
        start: "top center", // Inizia quando il top di imagesRow è al centro dello schermo
        end: "+=500", // Finisce dopo 500px di scroll
        scrub: 1, // Scrub fluido con un leggero ritardo (1 secondo)
        markers: false, // Lascia i marker per debug
      },
    });
  }, []);

  return (
    <div ref={containerRef} className="project-section-mobile-page">
      <div ref={topSectionRef} className="project-section-mobile-top">
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
      <div ref={imagesRowRef} className="project-section-mobile-bottom">
        {content.images.map((img, index) => (
          <img key={index} src={img} alt={`${content.title} - ${index + 1}`} />
        ))}
      </div>
    </div>
  );
}
