// src/components/about-us/AboutUs.jsx
import { useEffect, useRef } from "react";
import "./AboutUs.css";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// Importa le immagini (non più necessario importare wall)
import storica1 from "../../assets/storica1.jpg";
import storica2 from "../../assets/storica2.jpg";
import storica3 from "../../assets/storica3.jpg";
import storica4 from "../../assets/storica4.jpg";
import storica5 from "../../assets/storica5.jpg";
import storica6 from "../../assets/storica6.jpg";
// import dad from "../../assets/dad.jpg";

gsap.registerPlugin(ScrollTrigger);

const AboutUs = () => {
  const imagesRef = useRef(null);
  const aboutRef = useRef(null);

  useEffect(() => {
    const imagesContainer = imagesRef.current;
    const about = aboutRef.current;

    // Calcola la larghezza totale da scorrere
    const totalScrollWidth = imagesContainer.scrollWidth - window.innerWidth + 20; // +20 per il padding

    // Crea l'animazione GSAP con ScrollTrigger per lo scorrimento delle immagini
    const scrollAnimation = gsap.to(imagesContainer, {
      x: () => -totalScrollWidth,
      ease: "none",
      scrollTrigger: {
        trigger: about,
        start: "10% 5%",
        end: "150vw",
        scrub: 2,
        // pin: true,
        // anticipatePin: 1,
        markers: false, // Imposta a true per il debug
      },
    });

    // Effetto Parallax per l'immagine nella sezione "wall" (background-image)
    const wallContent = about.parentElement.querySelector(".wall-content");
    if (wallContent) {
      gsap.to(wallContent, {
        backgroundPosition: "60% 80%", // Sposta l'immagine di sfondo lungo l'asse X
        ease: "none",
        scrollTrigger: {
          trigger: about,
          start: "130vw",
          end: "200vw",
          scrub: 2,
          markers: false, // Imposta a true per il debug
        },
      });
    }

    // Pulizia: distrugge l'istanza di ScrollTrigger
    return () => {
      if (scrollAnimation.scrollTrigger) {
        scrollAnimation.scrollTrigger.kill();
      }
      ScrollTrigger.getAll().forEach(trigger => trigger.kill());
    };
  }, []);

  return (
    <section className="aboutus-section">
      <div className="slider-section" ref={aboutRef}>
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
            <h1 className="aboutus-title">MAGARI LEGGILA<br />UN PO' DI STORIA</h1>
            <p className="aboutus-subtitle">se fai skip sei senza cuore</p>
          </div>
        </div>
      </div>

      <div className="storia">
        <div className="storia-content">
          <div className="storia-text">
            <h2>
              Dall'Inchiostro<br />al Digitale:<br />La nostra passione,<br /><span className="accent">le nostre radici</span>
            </h2>
            <p>
              Siamo nati e cresciuti tra le macchine da stampa della piccola bottega di nostro padre, Crescenzo. Da lui abbiamo ereditato non solo la passione per la comunicazione, ma anche il cuore di chi non si ferma mai davanti a una sfida. Dopo la sua scomparsa, abbiamo deciso di trasformare quella scintilla in un fuoco creativo, portando avanti la sua visione con innovazione e coraggio.
            </p>
          </div>
        </div>

        <div className="wall">
          <div className="wall-content">
            {/* Ora l'immagine è impostata come background-image tramite CSS */}
          </div>
        </div>

        <div className="marco-content">
          <div className="marco-text">
            {/* <h2>
              Dall'Inchiostro<br/>al Digitale:<br/>La nostra passione,<br/><span className="accent">le nostre radici</span>
            </h2> */}
            <p>
              Basic è il punto d'incontro tra tradizione e tecnologia. Il nostro team, giovane ma con esperienza da vendere, domina l'arte della comunicazione a 360 gradi, dal web alla stampa, fino alle app. Siamo professionisti con un pizzico di audacia, pronti a rivoluzionare il mercato con strategie digitali vincenti e design che fanno parlare di sé. Perché per noi, fare la differenza non è solo un lavoro, è uno stile di vita.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutUs;
