import './AboutUs.css';
import 'aos/dist/aos.css';
import { useEffect } from 'react';
import AOS from 'aos';
import img1 from '../../assets/marco.jpg'; 
import img2 from '../../assets/marco.jpg';

const AboutUs = () => {
  useEffect(() => {
    // Inizializza AOS con configurazioni specifiche
    AOS.init({
      duration: 1000,
      once: false,
      mirror: true,
      offset: 200, // Controlla lo scorrimento orizzontale
    });

    // Funzione per gestire lo scroll orizzontale e attivare AOS
    const handleScroll = () => {
      document.querySelectorAll('.aos-init').forEach((element) => {
        const elementOffset = element.getBoundingClientRect().left;

        // Se l'elemento è visibile nello schermo, attiva l'animazione
        if (elementOffset < window.innerWidth * 0.9) {
          element.classList.add('aos-animate');
        } else {
          element.classList.remove('aos-animate');
        }
      });
    };

    const scrollWrapper = document.querySelector('.scroll-wrapper');
    scrollWrapper.addEventListener('scroll', handleScroll);

    // Rimuovi l'evento quando il componente viene smontato
    return () => {
      scrollWrapper.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <section className="section aboutus-section">
      <div className="aboutus-content">
        <div className="aboutus-item" data-aos="fade-down">
          <img src={img1} alt="Immagine 1" className="aboutus-image" />
          <div className="aboutus-text" data-aos="fade-right">
            <h2>Titolo Immagine 1</h2>
            <p>Testo che accompagna la prima immagine, che entra da destra.</p>
          </div>
        </div>

        <div className="aboutus-item" data-aos="fade-up">
          <img src={img2} alt="Immagine 2" className="aboutus-image" />
          <div className="aboutus-text" data-aos="fade-right">
            <h2>Titolo Immagine 2</h2>
            <p>Testo che accompagna la seconda immagine, che entra da destra.</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutUs;
