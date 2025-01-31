// AboutUsContent.jsx
import React from "react";
import "./AboutUsContent.css";

// Importa immagini
import storica1 from "../../assets/storica1.jpg";
import storica2 from "../../assets/storica2.jpg";
import storica3 from "../../assets/storica3.jpg";
import storica4 from "../../assets/storica4.jpg";
import storica5 from "../../assets/storica5.jpg";
import storica6 from "../../assets/storica6.jpg";

const AboutUsContent = () => {
  return (
    <section className="aboutus-section">
      <div className="slider-section">
        <div className="aboutus-container">
          <div className="aboutus-images">
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
              Siamo nati e cresciuti tra le macchine da stampa della piccola bottega
              di nostro padre, Crescenzo. Da lui abbiamo ereditato non solo la passione
              per la comunicazione, ma anche il cuore di chi non si ferma mai davanti
              a una sfida. Dopo la sua scomparsa, abbiamo deciso di trasformare quella
              scintilla in un fuoco creativo, portando avanti la sua visione con
              innovazione e coraggio.
            </p>
          </div>
        </div>

        <div className="wall">
          <div className="wall-content">
            {/* background-image in CSS */}
          </div>
        </div>

        <div className="marco-content">
          <div className="marco-text">
            <p>
              Basic è il punto d'incontro tra tradizione e tecnologia. Il nostro team,
              giovane ma con esperienza da vendere, domina l'arte della comunicazione a
              360 gradi, dal web alla stampa, fino alle app. Siamo professionisti con
              un pizzico di audacia, pronti a rivoluzionare il mercato con strategie
              digitali vincenti e design che fanno parlare di sé. Perché per noi, fare
              la differenza non è solo un lavoro, è uno stile di vita.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutUsContent;
