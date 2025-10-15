import { useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import "./Portfolio.css";
import projectData from "./projectData";
import { useTranslation } from "react-i18next";

gsap.registerPlugin(ScrollTrigger);

export default function ProjectSectionMobilePage() {
  const { id } = useParams();
  const containerRef = useRef(null);
  const imagesRowRef = useRef(null);
  const topSectionRef = useRef(null);
  const { t } = useTranslation(["common"]);

  const normalizedId = id.charAt(0).toUpperCase() + id.slice(1);

  // dati non tradotti (immagini/link)
  const base = projectData[normalizedId] || { images: [], link: null };

  // testi tradotti con fallback
  const title = t(
    `portfolio.projects.${normalizedId}.title`,
    t("portfolio.notFound")
  );
  const description = t(
    `portfolio.projects.${normalizedId}.description`,
    t("portfolio.noDescription")
  );

  const content = { ...base, title, description };

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
    const topSection = topSectionRef.current;
    if (!imagesRow || !topSection) return;

    const anim = gsap.to(topSection, {
      x: "-100vw",
      opacity: 0,
      ease: "power2.out",
      scrollTrigger: {
        trigger: imagesRow,
        start: "top center",
        end: "+=500",
        scrub: 1,
        markers: false,
      },
    });

    return () => {
      anim.scrollTrigger && anim.scrollTrigger.kill();
      anim.kill();
    };
  }, [id]);

  const openExternal = (url) =>
    window.open(url, "_blank", "noopener,noreferrer");

  useEffect(() => {
    return () => {
      // sicurezza extra: rimuovi eventuali trig rimasti
      gsap.utils.toArray(ScrollTrigger.getAll()).forEach((st) => st.kill());
    };
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
                type="button"
                className="project-link"
                onClick={() => openExternal(content.link)}
              >
                {t("portfolio.visitSite")}
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
