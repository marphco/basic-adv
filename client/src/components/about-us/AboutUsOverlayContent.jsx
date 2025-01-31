import React, { useRef, useEffect } from "react";
import PropTypes from "prop-types";
import { gsap } from "gsap";

// Immagini e CSS come prima
import storica1 from "../../assets/storica1.jpg";
import storica2 from "../../assets/storica2.jpg";
import storica3 from "../../assets/storica3.jpg";
import storica4 from "../../assets/storica4.jpg";
import storica5 from "../../assets/storica5.jpg";
import storica6 from "../../assets/storica6.jpg";
import "./AboutUs.css";

export default function AboutUsOverlayContent({ overlayRef, isOpen }) {
  const imagesRef = useRef(null);
  const aboutRef = useRef(null);

  useEffect(() => {
    if (!isOpen || !overlayRef.current) return;

    const container = overlayRef.current;
    const aboutSection = aboutRef.current;
    const imagesContainer = imagesRef.current;

    // 1) Calcola la larghezza orizzontale da percorrere
    const totalScrollWidth =
      imagesContainer.scrollWidth - container.clientWidth;

    // 2) Crea una timeline GSAP per le animazioni
    //    - "x" dell'immagine va da 0 a -totalScrollWidth
    //    - paused: true, controlliamo la .progress() manualmente
    let tl = gsap.timeline({ paused: true });

    // Tween: le immagini scorrono da x=0 a x=-totalScrollWidth
    tl.to(imagesContainer, {
      x: -totalScrollWidth,
      ease: "none",
      duration: 1, // la timeline va da 0 a 1, useremo .progress() come un valore 0..1
    });

    // Se vuoi anche parallax su .wall-content, aggiungi un tween in parallelo
    // ad esempio:
    const wallContent = aboutSection.querySelector(".wall-content");
    if (wallContent) {
      tl.to(
        wallContent,
        {
          // ad esempio sposta backgroundPosition a "60% 80%"
          backgroundPosition: "60% 80%",
          ease: "none",
        },
        0 // avviene in parallelo al tween delle immagini
      );
    }

    // 3) Listener wheel: rotellina verticale => sposta scrollLeft orizzontale
    function onWheel(e) {
      e.preventDefault();
      // Aggiorna scrollLeft
      container.scrollLeft += e.deltaY; 
      // clamp scrollLeft fra 0 e totalScrollWidth
      if (container.scrollLeft < 0) container.scrollLeft = 0;
      if (container.scrollLeft > totalScrollWidth) {
        container.scrollLeft = totalScrollWidth;
      }

      // 4) Aggiorna la timeline in base a scrollLeft
      const progressVal = container.scrollLeft / totalScrollWidth;
      tl.progress(progressVal);
    }

    // 5) Azzera posizionamento all'inizio
    container.scrollLeft = 0;
    tl.progress(0);

    container.addEventListener("wheel", onWheel, { passive: false });

    // Cleanup
    return () => {
      container.removeEventListener("wheel", onWheel, { passive: false });
      tl.kill();
    };
  }, [isOpen, overlayRef]);

  return (
    <section className="aboutus-section" ref={aboutRef}>
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

      <div className="storia">
        <div className="storia-content">
          <div className="storia-text">
            <h2>
              Dall'Inchiostro
              <br />
              al Digitale:
              <br />
              La nostra passione,
              <br />
              <span className="accent">le nostre radici</span>
            </h2>
            <p>
              Siamo nati e cresciuti tra le macchine da stampa...
            </p>
          </div>
        </div>
        <div className="wall">
          <div className="wall-content" />
        </div>
        <div className="marco-content">
          <div className="marco-text">
            <p>
              Basic è il punto d'incontro...
            </p>
          </div>
        </div>
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
