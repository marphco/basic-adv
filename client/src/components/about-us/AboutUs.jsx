// AboutUs.jsx
import { useRef, useEffect, useState } from "react";
import PropTypes from "prop-types";
import { gsap } from "gsap";
import storica1 from "../../assets/storica1.jpg";
import storica2 from "../../assets/storica2.jpg";
import storica3 from "../../assets/storica3.jpg";
import storica4 from "../../assets/storica4.jpg";
import storica5 from "../../assets/storica5.jpg";
import storica6 from "../../assets/storica6.jpg";
import marcoImage from "../../assets/marco.jpg"; 
import alessioImage from "../../assets/alessio.jpg";
import giorgiaImage from "../../assets/giorgia.jpg";

import "./AboutUs.css";

export default function AboutUs({ overlayRef, isOpen }) {
  const aboutRef = useRef(null);
  const imagesRef = useRef(null);
  const windowSectionRef = useRef(null);

  // Per la timeline (usata solo su desktop)
  const tlRef = useRef(null);
  const totalWidthRef = useRef(0);

  useEffect(() => {
    if (!isOpen || !overlayRef.current) return;
    const container = overlayRef.current;
    const aboutSection = aboutRef.current;
    const imagesContainer = imagesRef.current;
    const wallContent = aboutSection.querySelector(".wall-content");
    const isMobile = window.innerWidth <= 768;

    // Pulizia iniziale: rimuovo eventuali trasformazioni residue
    gsap.set(aboutSection, { clearProps: "all", x: 0, y: 0 });
    gsap.set(imagesContainer, { clearProps: "all", x: 0, y: 0 });
    if (wallContent) {
      gsap.set(wallContent, { clearProps: "all" });
    }
    if (windowSectionRef.current) {
      gsap.set(windowSectionRef.current, { clearProps: "all" });
    }

    if (isMobile) {
      // Su mobile disabilito le animazioni
      // 1. Per le immagini: imposto x a 0 (nessun movimento)
      gsap.set(imagesContainer, { x: 0 });
      // 2. Per il wall (sfondo): imposto una posizione statica
      if (wallContent) {
        gsap.set(wallContent, { backgroundPosition: "center" });
      }
      // 3. Per la sezione "window": imposto una posizione statica
      if (windowSectionRef.current) {
        gsap.set(windowSectionRef.current, { backgroundPosition: "center" });
      }
      // Non creo la timeline e non imposto gestori di scroll per l'animazione.
      return; // Esco dall'useEffect
    } else {
      // Su desktop: creo la timeline per animare le immagini e gli altri elementi
      totalWidthRef.current = aboutSection.scrollWidth - container.clientWidth;
      const tl = gsap.timeline({ paused: true });
      tlRef.current = tl;
      tl.to(
        imagesContainer,
        { x: -container.clientWidth, ease: "none", duration: 1 },
        0
      );
      if (wallContent) {
        tl.to(
          wallContent,
          { backgroundPosition: "60% 80%", ease: "none", duration: 1 },
          0
        );
      }
      if (windowSectionRef.current) {
        tl.to(
          windowSectionRef.current,
          { backgroundPosition: "100% 50%", ease: "none", duration: 1 },
          1
        );
      }
      tl.progress(0);

      // Gestione dello scroll con il mouse (desktop)
      function onWheel(e) {
        e.preventDefault();
        container.scrollLeft += e.deltaY;
        if (container.scrollLeft < 0) container.scrollLeft = 0;
        if (container.scrollLeft > totalWidthRef.current) {
          container.scrollLeft = totalWidthRef.current;
        }
        const prog = totalWidthRef.current
          ? container.scrollLeft / totalWidthRef.current
          : 0;
        tl.progress(prog);
      }
      container.addEventListener("wheel", onWheel, { passive: false });

      function handleResize() {
        let oldProg = totalWidthRef.current
          ? container.scrollLeft / totalWidthRef.current
          : 0;
        totalWidthRef.current = aboutSection.scrollWidth - container.clientWidth;
        tl.progress(oldProg);
      }
      window.addEventListener("resize", handleResize);

      return () => {
        container.removeEventListener("wheel", onWheel);
        window.removeEventListener("resize", handleResize);
        tl.kill();
      };
    }
  }, [isOpen, overlayRef]);

  /* --- Sezione Accordion e altro codice rimane invariato --- */
  const [activeAccordion, setActiveAccordion] = useState("marco");
  const marcoPanelRef = useRef(null);
  const alessioPanelRef = useRef(null);
  const giorgiaPanelRef = useRef(null);

  useEffect(() => {
    if (marcoPanelRef.current)
      gsap.set(marcoPanelRef.current, {
        xPercent: activeAccordion === "marco" ? 0 : 100,
      });
    if (alessioPanelRef.current)
      gsap.set(alessioPanelRef.current, {
        xPercent: activeAccordion === "alessio" ? 0 : 100,
      });
    if (giorgiaPanelRef.current)
      gsap.set(giorgiaPanelRef.current, {
        xPercent: activeAccordion === "giorgia" ? 0 : 100,
      });
  }, []); // Impostazione iniziale

  const openPanel = (name) => {
    let panel;
    if (name === "marco") panel = marcoPanelRef.current;
    else if (name === "alessio") panel = alessioPanelRef.current;
    else if (name === "giorgia") panel = giorgiaPanelRef.current;
    if (panel) {
      gsap.to(panel, { xPercent: 0, duration: 0.5, ease: "power2.out" });
    }
  };

  const closePanel = (name) => {
    let panel;
    if (name === "marco") panel = marcoPanelRef.current;
    else if (name === "alessio") panel = alessioPanelRef.current;
    else if (name === "giorgia") panel = giorgiaPanelRef.current;
    if (panel) {
      gsap.to(panel, { xPercent: 100, duration: 0.5, ease: "power2.in" });
    }
  };

  const toggleAccordion = (name) => {
    if (activeAccordion === name) {
      return;
    }
    if (activeAccordion) {
      closePanel(activeAccordion);
    }
    openPanel(name);
    setActiveAccordion(name);
  };

  return (
    <section className="aboutus-section" ref={aboutRef}>
      {/* Sezione 1: Slider */}
      <div className="slider-section">
        <div className="aboutus-container">
          <div className="aboutus-images" ref={imagesRef}>
            <img src={storica1} alt="Momento Storico 1" />
            <img src={storica2} alt="Momento Storico 2" />
            <img src={storica3} alt="Momento Storico 3" />
            <img src={storica4} alt="Momento Storico 4" />
            <img src={storica5} alt="Momento Storico 5" />
            <img src={storica6} alt="Momento Storico 6" />
          </div>
          <div className="aboutus-title-container">
            <h1 className="aboutus-title">
              MAGARI LEGGILA
              <br />
              UN PO' DI STORIA
            </h1>
            <p className="aboutus-subtitle">se fai skip sei senza cuore</p>
          </div>
        </div>
      </div>

      {/* Sezione 2: Storia */}
      <div className="storia">
        <div className="storia-content">
          <div className="storia-text">
            <h2>
              Dall&apos;Inchiostro
              <br />
              al Digitale:
              <br />
              La nostra passione,
              <br />
              <span className="accent">le nostre radici</span>
            </h2>
            <p>
              Siamo nati e cresciuti tra le macchine da stampa della piccola
              bottega di nostro padre, Crescenzo...
            </p>
          </div>
        </div>
        <div className="wall">
          <div className="wall-content" />
        </div>
        <div
          className={`storia-moderna ${
            window.innerWidth <= 768 ? "mobile-hidden" : ""
          }`}
        >
          <div className="storia-moderna-text">
            <p>
              Basic è il punto d&apos;incontro tra tradizione e tecnologia...
            </p>
          </div>
        </div>
      </div>

      {/* Sezione 3: Window */}
      <div className="window">
        <div className="window-content" ref={windowSectionRef} />
        <div className="window-text">
          <p>
            Basic è il punto d&apos;incontro tra tradizione e tecnologia...
          </p>
        </div>
      </div>

      {/* Sezione 4: Accordion */}
      <div className="accordion-container">
        <div className="accordion-buttons">
          <button
            className={`accordion-button ${activeAccordion === "marco" ? "active" : ""}`}
            onClick={() => toggleAccordion("marco")}
          />
          <button
            className={`accordion-button ${activeAccordion === "alessio" ? "active" : ""}`}
            onClick={() => toggleAccordion("alessio")}
          />
          <button
            className={`accordion-button ${activeAccordion === "giorgia" ? "active" : ""}`}
            onClick={() => toggleAccordion("giorgia")}
          />
        </div>
        <div className="accordion-panels">
          <div className="accordion-panel" ref={marcoPanelRef}>
            <div className="content-inner">
              <div className="team-left">
                <div className="team-text">
                  <p>
                    Un innovatore nel campo digitale...
                  </p>
                </div>
                <div className="team-title">
                  <h2>MARCO</h2>
                </div>
              </div>
              <div className="team-right">
                <div className="foto-team">
                  <img src={marcoImage} alt="Foto Marco" />
                </div>
              </div>
            </div>
          </div>
          <div className="accordion-panel" ref={alessioPanelRef}>
            <div className="content-inner">
              <div className="team-left">
                <div className="team-text">
                  <p>
                    Un innovatore nel campo digitale...
                  </p>
                </div>
                <div className="team-title">
                  <h2>ALESSIO</h2>
                </div>
              </div>
              <div className="team-right">
                <div className="foto-team">
                  <img src={alessioImage} alt="Foto Alessio" />
                </div>
              </div>
            </div>
          </div>
          <div className="accordion-panel" ref={giorgiaPanelRef}>
            <div className="content-inner">
              <div className="team-left">
                <div className="team-text">
                  <p>
                    Un innovatore nel campo digitale...
                  </p>
                </div>
                <div className="team-title">
                  <h2>GIORGIA</h2>
                </div>
              </div>
              <div className="team-right">
                <div className="foto-team">
                  <img src={giorgiaImage} alt="Foto Giorgia" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Fine sezione accordion */}
    </section>
  );
}

AboutUs.propTypes = {
  overlayRef: PropTypes.shape({
    current: PropTypes.instanceOf(Element),
  }),
  isOpen: PropTypes.bool,
};
