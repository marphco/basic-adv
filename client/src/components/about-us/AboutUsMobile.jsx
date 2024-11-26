import { useEffect, useRef } from 'react';
import './AboutUs.css';
import img1 from '../../assets/marco-mobile.jpg';

const AboutUsMobile = () => {
  const imageRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      if (imageRef.current) {
        const imageHeight = imageRef.current.offsetHeight;
        const scrollTop = window.scrollY;
        const sectionTop = imageRef.current.parentElement.parentElement.offsetTop;
        const windowHeight = window.innerHeight;

        // Calcola la posizione relativa dello scroll rispetto alla sezione
        const scrollPosition = scrollTop + windowHeight - sectionTop;

        // Calcola la percentuale di scroll rispetto all'altezza della sezione
        const scrollPercent = scrollPosition / (imageHeight + windowHeight);

        // Limita il valore tra 0 e 1
        const clampedScroll = Math.min(Math.max(scrollPercent, 0), 1);

        // Calcola la trasformazione inversa
        const translateY = (1 - clampedScroll) * 30; // Regola 30 per l'intensità

        // Applica la trasformazione
        imageRef.current.style.transform = `translate3d(0, -${translateY}%, 0)`;
      }
    };

    window.addEventListener('scroll', handleScroll);

    // Esegui l'aggiornamento iniziale
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <div className="aboutus-section">
      <div className="aboutus-content">
        <img
          src={img1}
          alt="Immagine About Us"
          className="aboutus-image parallax-image"
          ref={imageRef}
        />
      </div>
    </div>
  );
};

export default AboutUsMobile;