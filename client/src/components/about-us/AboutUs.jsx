import React, { useRef, useEffect } from 'react';
import PropTypes from 'prop-types'; // Importa PropTypes
import './AboutUs.css';
import frecciaIcon from '../../assets/freccia.svg';

const AboutUs = React.forwardRef((props, ref) => {
  const { lineRef } = props; // Destruttura lineRef da props
  const iconsRef = useRef([]);

  // Effetto parallasse sul movimento del mouse
  useEffect(() => {
    const handleMouseMove = (e) => {
      iconsRef.current.forEach((icon) => {
        const { left, top, width, height } = icon.getBoundingClientRect();
        const iconCenterX = left + width / 2;
        const iconCenterY = top + height / 2;
        const angleX = (e.clientX - iconCenterX) / 50;
        const angleY = (e.clientY - iconCenterY) / 50;
        icon.style.transform = `translate(${angleX}px, ${angleY}px)`;
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <div className="aboutus-section" ref={ref}>
      <div className="chi-siamo">
        <div className="chi-siamo-text">
          Ci mettiamo meno tempo a farlo che a spiegartelo.
        </div>
      </div>
      <div className="aboutus-content">
        <div className="intro">
          <p>
            Più il progetto è ambizioso, più grande è la sfida – ed è proprio lì che ci piace stare, sempre pronti a superare i nostri limiti. Hai un progetto? Noi siamo già al lavoro.
          </p>
        </div>
        <div className="horizontal-line" ref={lineRef}></div> {/* Linea con il riferimento */}
        <div className="text-container">
          <p>Testo centrale: descrizione breve del nostro lavoro e della nostra filosofia.</p>
        </div>
        <div className="text-container">
          <p>Testo centrale: descrizione breve del nostro lavoro e della nostra filosofia.</p>
        </div>
        <div className="text-container">
          <p>Testo centrale: descrizione breve del nostro lavoro e della nostra filosofia.</p>
        </div>
        {/* Icone decorative posizionate intorno al testo */}
        <img src={frecciaIcon} alt="Icona decorativa" className="decorative-icon" ref={(el) => (iconsRef.current[0] = el)} />
        <img src={frecciaIcon} alt="Icona decorativa" className="decorative-icon" ref={(el) => (iconsRef.current[1] = el)} />
        <img src={frecciaIcon} alt="Icona decorativa" className="decorative-icon" ref={(el) => (iconsRef.current[2] = el)} />
      </div>
    </div>
  );
});

// Definizione di PropTypes per AboutUs
AboutUs.propTypes = {
  lineRef: PropTypes.object.isRequired,
};

export default AboutUs;
