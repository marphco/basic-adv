// src/components/about-us/AboutUsOverlayContent.jsx
import { useRef, useEffect, useState } from "react";
import PropTypes from "prop-types";
import { gsap } from "gsap";
import storica1 from "../../assets/storica1.jpg";
import storica2 from "../../assets/storica2.jpg";
import storica3 from "../../assets/storica3.jpg";
import storica4 from "../../assets/storica4.jpg";
import storica5 from "../../assets/storica5.jpg";
import storica6 from "../../assets/storica6.jpg";
import marcoImage from "../../assets/marco.jpg"; // Importa la foto di Marco
import "./AboutUs.css";

export default function AboutUsOverlayContent({ overlayRef, isOpen }) {
    const aboutRef = useRef(null);
    const imagesRef = useRef(null);
    const windowSectionRef = useRef(null);
  
    // Riferimenti per la timeline dello scroll orizzontale
    const tlRef = useRef(null);
    const totalWidthRef = useRef(0);
  
    useEffect(() => {
      if (!isOpen || !overlayRef.current) return;
      const container = overlayRef.current;
      const aboutSection = aboutRef.current;
      const imagesContainer = imagesRef.current;
      const wallContent = aboutSection.querySelector(".wall-content");
      gsap.set(aboutSection, { clearProps: "all", x: 0 });
      gsap.set(imagesContainer, { clearProps: "all", x: 0 });
      if (wallContent) {
        gsap.set(wallContent, { clearProps: "all" });
      }
      if (windowSectionRef.current) {
        gsap.set(windowSectionRef.current, { clearProps: "all", backgroundPosition: "50% center" });
      }
      const tl = gsap.timeline({ paused: true });
      tlRef.current = tl;
      totalWidthRef.current = aboutSection.scrollWidth - container.clientWidth;
      function buildTimeline() {
        tl.clear();
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
            { backgroundPosition: "90% center", ease: "none", duration: 1 },
            1
          );
        }
      }
      buildTimeline();
      container.scrollLeft = 0;
      tl.progress(0);
      function onWheel(e) {
        e.preventDefault();
        container.scrollLeft += e.deltaY;
        if (container.scrollLeft < 0) container.scrollLeft = 0;
        if (container.scrollLeft > totalWidthRef.current) {
          container.scrollLeft = totalWidthRef.current;
        }
        const prog = totalWidthRef.current ? container.scrollLeft / totalWidthRef.current : 0;
        tl.progress(prog);
      }
      container.addEventListener("wheel", onWheel, { passive: false });
      function handleResize() {
        const oldProg = totalWidthRef.current ? container.scrollLeft / totalWidthRef.current : 0;
        totalWidthRef.current = aboutSection.scrollWidth - container.clientWidth;
        buildTimeline();
        container.scrollLeft = totalWidthRef.current * oldProg;
        tl.progress(oldProg);
      }
      window.addEventListener("resize", handleResize);
      return () => {
        container.removeEventListener("wheel", onWheel, { passive: false });
        window.removeEventListener("resize", handleResize);
        tl.kill();
      };
    }, [isOpen, overlayRef]);
  
    /* --- NUOVA SEZIONE PER L'ACCORDION --- */
    const [activeAccordion, setActiveAccordion] = useState(null);
    const marcoPanelRef = useRef(null);
    const alessioPanelRef = useRef(null);
    const giorgiaPanelRef = useRef(null);
  
    // Impostiamo lo stato iniziale dei pannelli (chiusi, fuori dalla vista a destra)
    useEffect(() => {
      if (marcoPanelRef.current) gsap.set(marcoPanelRef.current, { xPercent: 100 });
      if (alessioPanelRef.current) gsap.set(alessioPanelRef.current, { xPercent: 100 });
      if (giorgiaPanelRef.current) gsap.set(giorgiaPanelRef.current, { xPercent: 100 });
    }, []);
  
    const openPanel = (name) => {
      let panel;
      if (name === "marco") panel = marcoPanelRef.current;
      else if (name === "alessio") panel = alessioPanelRef.current;
      else if (name === "giorgia") panel = giorgiaPanelRef.current;
      console.log("openPanel:", name, panel);
      if (panel) {
        gsap.to(panel, { xPercent: 0, duration: 0.5, ease: "power2.out" });
      }
    };
  
    const closePanel = (name) => {
      let panel;
      if (name === "marco") panel = marcoPanelRef.current;
      else if (name === "alessio") panel = alessioPanelRef.current;
      else if (name === "giorgia") panel = giorgiaPanelRef.current;
      console.log("closePanel:", name, panel);
      if (panel) {
        gsap.to(panel, { xPercent: 100, duration: 0.5, ease: "power2.in" });
      }
    };
  
    const toggleAccordion = (name) => {
        // Se il pannello cliccato è già attivo, non fare nulla
        if (activeAccordion === name) {
          return;
        }
        // Se esiste già un pannello attivo diverso, lo chiudiamo
        if (activeAccordion) {
          closePanel(activeAccordion);
        }
        // Apriamo il nuovo pannello e lo segnaliamo come attivo
        openPanel(name);
        setActiveAccordion(name);
      };
  
    return (
      <section className="aboutus-section" ref={aboutRef}>
        {/* === Sezione 1: Slider === */}
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
  
        {/* === Sezione 2: Storia === */}
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
                Siamo nati e cresciuti tra le macchine da stampa della piccola bottega di nostro padre, Crescenzo. Da lui abbiamo ereditato non solo la passione per la comunicazione, ma anche il cuore di chi non si ferma mai davanti a una sfida. Dopo la sua scomparsa, abbiamo deciso di trasformare quella scintilla in un fuoco creativo, portando avanti la sua visione con innovazione e coraggio.
              </p>
            </div>
          </div>
          <div className="wall">
            <div className="wall-content" />
          </div>
          <div className="storia-moderna">
            <div className="storia-moderna-text">
              <p>
                Basic è il punto d'incontro tra tradizione e tecnologia. Il nostro team, giovane ma con esperienza da vendere, domina l'arte della comunicazione a 360 gradi, dal web alla stampa, fino alle app. Siamo professionisti con un pizzico di audacia, pronti a rivoluzionare il mercato con strategie digitali vincenti e design che fanno parlare di sé. Perché per noi, fare la differenza non è solo un lavoro, è uno stile di vita.
              </p>
            </div>
          </div>
        </div>
  
        {/* === Sezione 3: Window === */}
        <div className="window">
          <div className="window-content" ref={windowSectionRef} />
        </div>
  
        {/* === Sezione 4: Accordion (la nuova colonna) === */}
        <div className="accordion-container">
          {/* I pulsanti occupano i primi 30vw */}
          <div className="accordion-buttons">
            <div className="accordion-button" onClick={() => toggleAccordion("marco")}>
              <span>MARCO</span>
            </div>
            <div className="accordion-button" onClick={() => toggleAccordion("alessio")}>
              <span>ALESSIO</span>
            </div>
            <div className="accordion-button" onClick={() => toggleAccordion("giorgia")}>
              <span>GIORGIA</span>
            </div>
          </div>
          {/* I pannelli appariranno nella parte destra: occupano 70vw */}
          <div className="accordion-panels">
            <div className="accordion-panel" ref={marcoPanelRef}>
              <div className="marco-content-inner">
                <div className="marco-left">
                  <div className="marco-text">
                    <p>
                      Un innovatore nel campo digitale, con una mente che vede oltre l'orizzonte, ha trasformato ogni progetto in una missione di scoperta, dove ogni pixel è un passo verso nuovi mondi. A New York, trova ispirazione, ma la sua visione è universale, creando con la precisione di un artigiano del futuro.
                    </p>
                  </div>
                  <div className="marco-title">
                    <h2>MARCO</h2>
                  </div>
                </div>
                <div className="marco-right">
                  <div className="foto-marco">
                    <img src={marcoImage} alt="Foto Marco" />
                  </div>
                </div>
              </div>
            </div>
            <div className="accordion-panel" ref={alessioPanelRef}>
              <div className="marco-content-inner">
                <div className="marco-left">
                  <div className="marco-text">
                    <p>
                      Contenuto di ALESSIO: qui inserisci il testo e le informazioni relative ad Alessio.
                    </p>
                  </div>
                  <div className="marco-title">
                    <h2>ALESSIO</h2>
                  </div>
                </div>
                <div className="marco-right">
                  <div className="foto-marco">
                    <img src={marcoImage} alt="Foto Alessio" />
                  </div>
                </div>
              </div>
            </div>
            <div className="accordion-panel" ref={giorgiaPanelRef}>
              <div className="marco-content-inner">
                <div className="marco-left">
                  <div className="marco-text">
                    <p>
                      Contenuto di GIORGIA: qui inserisci il testo e le informazioni relative a Giorgia.
                    </p>
                  </div>
                  <div className="marco-title">
                    <h2>GIORGIA</h2>
                  </div>
                </div>
                <div className="marco-right">
                  <div className="foto-marco">
                    <img src={marcoImage} alt="Foto Giorgia" />
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
  
  AboutUsOverlayContent.propTypes = {
    overlayRef: PropTypes.shape({
      current: PropTypes.instanceOf(Element),
    }).isRequired,
    isOpen: PropTypes.bool.isRequired,
  };