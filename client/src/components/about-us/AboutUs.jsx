import './AboutUs.css';
import 'aos/dist/aos.css';
import { useEffect } from 'react';
import AOS from 'aos';

const AboutUs = () => {
  useEffect(() => {
    // Inizializza AOS con un offset piccolo per far partire le animazioni
    AOS.init({
      duration: 1000,
      once: false,
      mirror: true,
      offset: 200,  // Sarà regolato dinamicamente in base allo scroll orizzontale
    });

    // Forziamo AOS a funzionare con lo scroll orizzontale
    const handleScroll = () => {
      // Controlliamo la posizione di scroll orizzontale
      document.querySelectorAll('.aos-init').forEach((element) => {
        const elementOffset = element.getBoundingClientRect().left;

        // Controlla se l'elemento è visibile nello schermo
        if (elementOffset < window.innerWidth * 0.9) {
          element.classList.add('aos-animate');
        } else {
          element.classList.remove('aos-animate');
        }
      });
    };

    const scrollWrapper = document.querySelector('.scroll-wrapper');
    scrollWrapper.addEventListener('scroll', handleScroll);

    // Rimuovi l'evento al dismount del componente
    return () => {
      scrollWrapper.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <section className="section aboutus-section">
      <div className="aboutus-content">
        <div className="aboutus-item" data-aos="fade-down">
          <img src="/src/assets/marco.jpg" alt="Immagine 1" className="aboutus-image" />
          <div className="aboutus-text" data-aos="fade-right">
            <h2>Titolo Immagine 1</h2>
            <p>Testo che accompagna la prima immagine, che entra da destra.</p>
          </div>
        </div>

        <div className="aboutus-item" data-aos="fade-up">
          <img src="/src/assets/marco.jpg" alt="Immagine 2" className="aboutus-image" />
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
