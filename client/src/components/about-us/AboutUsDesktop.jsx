import { useRef, useEffect, useState } from "react";
import PropTypes from "prop-types";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
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

gsap.registerPlugin(ScrollTrigger);

export default function AboutUsDesktop({ overlayRef, isOpen }) {
  const aboutRef = useRef(null);
  const imagesRef = useRef(null);
  const wallRef = useRef(null);
  const windowSectionRef = useRef(null);
  const marcoPanelRef = useRef(null);
  const alessioPanelRef = useRef(null);
  const giorgiaPanelRef = useRef(null);

  useEffect(() => {
    if (!isOpen || !overlayRef.current) return;

    const container = overlayRef.current;
    const aboutSection = aboutRef.current;
    const imagesContainer = imagesRef.current;
    const wallContent = wallRef.current;
    const windowContent = windowSectionRef.current;

    // Aggiungi un controllo per evitare errori nel caso in cui i riferimenti siano nulli
    if (!aboutSection || !imagesContainer || !wallContent || !windowContent)
      return;

    // Reset degli stili iniziali
    gsap.set(aboutSection, { clearProps: "all", x: 0, y: 0 });
    gsap.set(imagesContainer, { clearProps: "all", x: 0, y: 0 });
    gsap.set(wallContent, { clearProps: "all" });
    gsap.set(windowContent, { clearProps: "all" });

    const tl = gsap.timeline({ paused: true });
    const totalWidth = aboutSection.scrollWidth - container.clientWidth;
    tl.to(
      imagesContainer,
      { x: -container.clientWidth, ease: "none", duration: 1 },
      0
    )
      .to(
        wallContent,
        { backgroundPosition: "60% 80%", ease: "none", duration: 1 },
        0
      )
      .to(
        windowContent,
        { backgroundPosition: "100% 50%", ease: "none", duration: 1 },
        1
      );

    container.scrollLeft = 0;
    tl.progress(0);

    function onWheel(e) {
      e.preventDefault();
      container.scrollLeft += e.deltaY;
      if (container.scrollLeft < 0) container.scrollLeft = 0;
      if (container.scrollLeft > totalWidth) container.scrollLeft = totalWidth;
      const prog = totalWidth ? container.scrollLeft / totalWidth : 0;
      tl.progress(prog);
    }

    container.addEventListener("wheel", onWheel, { passive: false });

    function handleResize() {
      const oldProg = totalWidth ? container.scrollLeft / totalWidth : 0;
      const newTotal = aboutSection.scrollWidth - container.clientWidth;
      tl.clear();
      tl.to(
        imagesContainer,
        { x: -container.clientWidth, ease: "none", duration: 1 },
        0
      )
        .to(
          wallContent,
          { backgroundPosition: "60% 80%", ease: "none", duration: 1 },
          0
        )
        .to(
          windowContent,
          { backgroundPosition: "100% 50%", ease: "none", duration: 1 },
          1
        );
      container.scrollLeft = newTotal * oldProg;
      tl.progress(oldProg);
    }

    window.addEventListener("resize", handleResize);

    return () => {
      container.removeEventListener("wheel", onWheel);
      window.removeEventListener("resize", handleResize);
      tl.kill();
    };
  }, [isOpen, overlayRef]);

  const [activeAccordion, setActiveAccordion] = useState("marco");

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Impostazione iniziale, Marco sarà quello attivo

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
    if (activeAccordion === name) return;
    if (activeAccordion) {
      closePanel(activeAccordion);
    }
    openPanel(name);
    setActiveAccordion(name);
  };

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
              MAGARI LEGGI
              <br />
              UN PO&apos; DI STORIA
            </h1>
            <p className="aboutus-subtitle">Se skippi, niente rancore (quasi).</p>
          </div>
        </div>
      </div>
      <div className="storia">
        <div className="storia-content">
          <div className="storia-text">
            <h2>
              Dall&apos;inchiostro
              <br />
              al digitale:
              <br />
              la nostra passione,
              <br />
              <span className="accent">le nostre radici</span>
            </h2>
            <p>
              Siamo cresciuti tra le macchine da stampa della bottega di nostro
              padre, Crescenzo. Da lui abbiamo ereditato la passione per la
              comunicazione e la testardaggine di chi non si ferma davanti a una
              sfida. Dopo la sua scomparsa abbiamo trasformato quella scintilla
              in un fuoco creativo, portando avanti la sua visione con
              innovazione e coraggio.
            </p>
          </div>
        </div>
        <div className="wall">
          <div className="wall-content" ref={wallRef} />
        </div>
        <div className="storia-moderna">
          <div className="storia-moderna-text">
            <p>
              Siamo l&apos;incontro tra tradizione e tecnologia. Un team giovane
              con esperienza da vendere: dal web alla stampa, fino alle app.
              Facciamo strategia e design che parlano al mercato. Siamo curiosi,
              un po&apos; audaci, e puntiamo a far crescere i brand con
              risultati misurabili. Per noi fare la differenza non è solo un
              lavoro: è uno stile di vita.
            </p>
          </div>
        </div>
      </div>
      <div className="window">
        <div className="window-content" ref={windowSectionRef} />
        <div className="window-text">
          <p>
            Siamo l&apos;incontro tra tradizione e tecnologia. Un team giovane
            con esperienza da vendere: dal web alla stampa, fino alle app.
            Facciamo strategia e design che parlano al mercato. Siamo curiosi,
            un po&apos; audaci, e puntiamo a far crescere i brand con risultati
            misurabili. Per noi fare la differenza non è solo un lavoro: è uno
            stile di vita.
          </p>
        </div>
      </div>
      <div className="accordion-container">
        <div className="accordion-buttons">
          <button
            className={`accordion-button ${
              activeAccordion === "marco" ? "active" : ""
            }`}
            onClick={() => toggleAccordion("marco")}
          ></button>
          <button
            className={`accordion-button ${
              activeAccordion === "alessio" ? "active" : ""
            }`}
            onClick={() => toggleAccordion("alessio")}
          ></button>
          <button
            className={`accordion-button ${
              activeAccordion === "giorgia" ? "active" : ""
            }`}
            onClick={() => toggleAccordion("giorgia")}
          ></button>
        </div>
        <div className="accordion-panels">
          <div className="accordion-panel" ref={marcoPanelRef}>
            <div className="content-inner">
              <div className="team-left">
                <div className="team-text">
                  <p>
                    Un innovatore nel campo digitale, con una mente che vede
                    oltre l&apos;orizzonte, ha trasformato ogni progetto in una
                    missione di scoperta, dove ogni pixel è un passo verso nuovi
                    mondi. A New York, trova ispirazione, ma la sua visione è
                    universale, creando con la precisione di un artigiano del
                    futuro.
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
                    Ha lo sguardo di chi vede il brand prima ancora del logo.
                    Mette in fila idee, immagini e parole finché trovano la loro
                    voce. Cresciuto tra tipografia e fotografia, impasta luce,
                    caratteri e ritmo, costruendo sistemi visivi che non cedono
                    al tempo. Guida il team senza alzare la voce: prova,
                    sbaglia, ricompone, finché tutto “suona”. Con lui la
                    creatività ha una direzione—quello che vedi è bello perché
                    funziona.
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
                    Dove gli altri vedono file, lei vede ritmo. Tra griglie e
                    livelli, esadecimali e profili colore, atterra i concept nel
                    mondo reale. Impagina, adatta, ottimizza: dal post al
                    packaging, dal web alla stampa—con pixel allineati, neri che
                    sono neri e loghi che non mollano mai. Precisione gentile,
                    velocità disarmante. Se qualcosa sembra semplice, è perché
                    Giorgia ci ha lavorato.
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
    </section>
  );
}

AboutUsDesktop.propTypes = {
  overlayRef: PropTypes.shape({
    current: PropTypes.instanceOf(Element),
  }),
  isOpen: PropTypes.bool,
};
