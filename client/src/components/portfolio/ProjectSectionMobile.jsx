import { useEffect, useRef, useLayoutEffect } from "react";
import { useParams } from "react-router-dom";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import "./Portfolio.css";
import projectData from "./projectData";
import { useTranslation } from "react-i18next";

gsap.registerPlugin(ScrollTrigger);

const SPEAKER_ON_SVG = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5L6 9H2v6h4l5 4V5z"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>`;
const SPEAKER_OFF_SVG = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5L6 9H2v6h4l5 4V5z"></path><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>`;

export default function ProjectSectionMobilePage() {
  const { id } = useParams();
  const containerRef = useRef(null);
  const imagesRowRef = useRef(null);
  const topSectionRef = useRef(null);
  const videoRef = useRef(null);
  const isMutedRef = useRef(true);
  const { t } = useTranslation(["common"]);

  // dati non tradotti (immagini/link)
  const base = projectData.find(p => p.id === id) || { images: [], link: null };

  // testi tradotti con fallback
  const title = t(
    `portfolio.projects.${id}.title`,
    t("portfolio.notFound")
  );
  const description = t(
    `portfolio.projects.${id}.description`,
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

  // ✅ FIX: Reset scroll to top and refresh ScrollTrigger on mount
  // Use useLayoutEffect to catch the render before paint
  useLayoutEffect(() => {
    // Force immediate scroll reset
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    ScrollTrigger.clearScrollMemory();
    
    const timer = setTimeout(() => {
      window.scrollTo(0, 0);
      ScrollTrigger.refresh(true);
    }, 100);

    return () => clearTimeout(timer);
  }, [id]);

  useEffect(() => {
    const imagesRow = imagesRowRef.current;
    const topSection = topSectionRef.current;
    if (!imagesRow || !topSection) return;

    // Force explicit start state to prevent offset
    const anim = gsap.fromTo(topSection, 
      { x: 0, opacity: 1 },
      {
        x: "-100vw",
        opacity: 0,
        ease: "power2.out",
        scrollTrigger: {
          trigger: imagesRow,
          start: "top center",
          end: "+=500",
          scrub: 1,
          markers: false,
          invalidateOnRefresh: true,
        },
      }
    );

    return () => {
      if (anim.scrollTrigger) anim.scrollTrigger.kill();
      anim.kill();
      // Reset precisely on exit
      gsap.set(topSection, { clearProps: "all" });
    };
  }, [id]);

  const openExternal = (url) =>
    window.open(url, "_blank", "noopener,noreferrer");

  useEffect(() => {
    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      const root = containerRef.current; // il tuo wrapper della pagina progetto
      ScrollTrigger.getAll().forEach((st) => {
        const trg = st.trigger || st.pin;
        if (root && trg && root.contains(trg)) {
          st.kill();
        }
      });
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
        {content.video && (
          <div className="project-video-container">
            <video
              ref={videoRef}
              src={content.video}
              autoPlay
              loop
              muted
              playsInline
            />
            <button
              type="button"
              className="audio-toggle-v2 visible"
              onClick={(e) => {
                e.stopPropagation();
                if (videoRef.current) {
                  const newMuted = !isMutedRef.current;
                  isMutedRef.current = newMuted;
                  videoRef.current.muted = newMuted;
                  // Update icon via DOM for consistency
                  e.currentTarget.innerHTML = newMuted ? SPEAKER_OFF_SVG : SPEAKER_ON_SVG;
                }
              }}
              dangerouslySetInnerHTML={{ __html: SPEAKER_OFF_SVG }}
            />
          </div>
        )}
        {(content.images || []).map((img, index) => (
          <img key={index} src={img} alt={`${content.title || ''} - ${index + 1}`} />
        ))}
      </div>
    </div>
  );
}
