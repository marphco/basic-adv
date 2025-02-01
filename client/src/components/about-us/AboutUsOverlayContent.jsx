// src/components/about-us/AboutUsOverlayContent.jsx
import React, { useRef, useEffect } from "react";
import PropTypes from "prop-types";
import { gsap } from "gsap";
import storica1 from "../../assets/storica1.jpg";
import storica2 from "../../assets/storica2.jpg";
import storica3 from "../../assets/storica3.jpg";
import storica4 from "../../assets/storica4.jpg";
import storica5 from "../../assets/storica5.jpg";
import storica6 from "../../assets/storica6.jpg";
import "./AboutUs.css";

export default function AboutUsOverlayContent({ overlayRef, isOpen }) {
  const aboutRef = useRef(null);
  const imagesRef = useRef(null);
  const windowSectionRef = useRef(null); // ref per la nuova sezione "window"

  // Riferimenti per la timeline e per il totale scorrevole (in pixel)
  const tlRef = useRef(null);
  const totalWidthRef = useRef(0);

  useEffect(() => {
    if (!isOpen || !overlayRef.current) return;

    const container = overlayRef.current;       // Overlay (scroller)
    const aboutSection = aboutRef.current;        // L'intera sezione (ora 300vw: slider, storia, window)
    const imagesContainer = imagesRef.current;    // Container delle immagini (slider)

    // *** Ripristina eventuali trasformazioni residue ***
    gsap.set(aboutSection, { clearProps: "all", x: 0 });
    gsap.set(imagesContainer, { clearProps: "all", x: 0 });
    const wallContent = aboutSection.querySelector(".wall-content");
    if (wallContent) {
      gsap.set(wallContent, { clearProps: "all" });
    }
    if (windowSectionRef.current) {
      gsap.set(windowSectionRef.current, { clearProps: "all", backgroundPosition: "50% center" });
    }

    // Crea una timeline GSAP paused
    const tl = gsap.timeline({ paused: true });
    tlRef.current = tl;

    // La sezione complessiva è di 300vw, e il container (overlay) è 100vw;
    // il totale scorribile è quindi (300vw - 100vw) = 200vw.
    totalWidthRef.current = container.clientWidth * 2;

    // Funzione per impostare la timeline in modo che:
    // - Segmento 1 (progress 0-0.5): anima lo slider (le immagini) e applica il parallax su .wall-content
    // - Segmento 2 (progress 0.5-1): anima la nuova sezione window, applicandone il parallax orizzontale
    function buildTimeline() {
      tl.clear();
      // Segmento 1: anima le immagini.
      // Qui spostiamo il container delle immagini di un importo pari a container.clientWidth (circa 100vw)
      tl.to(imagesContainer, {
        x: -container.clientWidth,
        ease: "none",
        duration: 1,
      }, 0);
      // Parallax su .wall-content nello stesso segmento
      if (wallContent) {
        tl.to(wallContent, {
          backgroundPosition: "60% 80%", // effetto identico a quello attuale per wall
          ease: "none",
          duration: 1,
        }, 0);
      }
      // Segmento 2: anima la nuova sezione window.
      // L'effetto parallax orizzontale: cambiamo il backgroundPosition lungo l'asse X, mantenendo Y invariato.
      if (windowSectionRef.current) {
        tl.to(windowSectionRef.current, {
          // Partiamo da "50% center" (impostato nel reset) e arriviamo a "60% center"
          backgroundPosition: "90% center",
          ease: "none",
          duration: 1,
        }, 1); // parte all'inizio del secondo segmento (progress circa 0.5)
      }
    }

    // Costruisci la timeline
    buildTimeline();

    // Inizializza la posizione: scrollLeft = 0, timeline progress = 0
    container.scrollLeft = 0;
    tl.progress(0);

    // Listener per la rotellina: converte lo scroll verticale in scroll orizzontale
    function onWheel(e) {
      e.preventDefault();
      container.scrollLeft += e.deltaY;
      if (container.scrollLeft < 0) container.scrollLeft = 0;
      if (container.scrollLeft > totalWidthRef.current) {
        container.scrollLeft = totalWidthRef.current;
      }
      const prog = totalWidthRef.current ? (container.scrollLeft / totalWidthRef.current) : 0;
      tl.progress(prog);
    }
    container.addEventListener("wheel", onWheel, { passive: false });

    // Listener per il resize: conserva il progresso relativo
    function handleResize() {
      const oldProg = totalWidthRef.current ? (container.scrollLeft / totalWidthRef.current) : 0;
      // Ricalcola il totale scrollabile basato sul nuovo container (sempre 200vw in pixel, ovvero 2*clientWidth)
      totalWidthRef.current = container.clientWidth * 2;
      buildTimeline();
      const newScrollLeft = totalWidthRef.current * oldProg;
      container.scrollLeft = newScrollLeft;
      tl.progress(oldProg);
    }
    window.addEventListener("resize", handleResize);

    return () => {
      container.removeEventListener("wheel", onWheel, { passive: false });
      window.removeEventListener("resize", handleResize);
      tl.kill();
    };
  }, [isOpen, overlayRef]);

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
              MAGARI LEGGILA<br />UN PO' DI STORIA
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
              Dall'Inchiostro<br />al Digitale:<br />La nostra passione,<br /><span className="accent">le nostre radici</span>
            </h2>
            <p>Siamo nati e cresciuti tra le macchine da stampa della piccola bottega di nostro padre, Crescenzo. Da lui abbiamo ereditato non solo la passione per la comunicazione, ma anche il cuore di chi non si ferma mai davanti a una sfida. Dopo la sua scomparsa, abbiamo deciso di trasformare quella scintilla in un fuoco creativo, portando avanti la sua visione con innovazione e coraggio.</p>
          </div>
        </div>
        <div className="wall">
          <div className="wall-content" />
        </div>
        <div className="marco-content">
          <div className="marco-text">
            <p>Basic è il punto d'incontro tra tradizione e tecnologia. Il nostro team, giovane ma con esperienza da vendere, domina l'arte della comunicazione a 360 gradi, dal web alla stampa, fino alle app. Siamo professionisti con un pizzico di audacia, pronti a rivoluzionare il mercato con strategie digitali vincenti e design che fanno parlare di sé. Perché per noi, fare la differenza non è solo un lavoro, è uno stile di vita.</p>
          </div>
        </div>
      </div>

      {/* Sezione 3: Window */}
      <div className="window">
        <div className="window-content" ref={windowSectionRef} />
      </div>
    </section>
  );
}

AboutUsOverlayContent.propTypes = {
  overlayRef: PropTypes.shape({
    current: PropTypes.instanceOf(Element),
  }).isRequired,
  isOpen: PropTypes.bool.isRequired,
};
