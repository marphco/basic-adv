import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import './AboutUs.css';
import img1 from '../../assets/marco.jpg';
import img2 from '../../assets/marco.jpg';

gsap.registerPlugin(ScrollTrigger);

const AboutUs = () => {
  const aboutUsRef = useRef(null);
  const imageRef = useRef(null);
  const textRef = useRef(null);
  const imageRef2 = useRef(null);
  const textRef2 = useRef(null);

  useEffect(() => {
    const aboutUsElem = aboutUsRef.current;
    const imageElem = imageRef.current;
    const textElem = textRef.current;
    const imageElem2 = imageRef2.current;
    const textElem2 = textRef2.current;

    if (!aboutUsElem || !imageElem || !textElem || !imageElem2 || !textElem2) {
      console.error('Elements not found');
      return;
    }

    // Creare due animazioni separate per i blocchi 1 e 2
    // Animazione per il primo blocco
    gsap.timeline({
      scrollTrigger: {
        trigger: aboutUsElem,
        start: 'top 0%', // Avvia l'animazione per il primo blocco prima
        end: 'bottom 20%',
        scrub: true,
        markers: true,
        toggleActions: 'play none none reverse',
      },
    })
      .fromTo(
        imageElem,
        { y: -200, opacity: 0 },
        { y: 0, opacity: 1, duration: .8, ease: 'power2.out' }
      )
      .fromTo(
        textElem,
        { x: 1440, opacity: 0 },
        { x: 0, opacity: 1, duration: 3, ease: 'power2.out' },
        '-=2.5'
      );

    // Animazione per il secondo blocco
    gsap.timeline({
      scrollTrigger: {
        trigger: imageElem2,
        start: 'top 50%', // Avvia l'animazione per il secondo blocco dopo il primo
        end: 'bottom 20%',
        scrub: 1,
        markers: true,
        toggleActions: 'play none none reverse',
      },
    })
      .fromTo(
        imageElem2,
        { y: 300, opacity: 0 },
        { y: 0, opacity: 1, duration: .8, ease: 'power2.out' }
      )
      .fromTo(
        textElem2,
        { x: 1440, opacity: 0 },
        { x: 0, opacity: 1, duration: 3, ease: 'power2.out' },
        '-=2.5'
      );

    // Pulizia al dismontaggio
    return () => {
      ScrollTrigger.getAll().forEach(trigger => trigger.kill());
    };
  }, []);

  return (
    <div className="aboutus-section" ref={aboutUsRef}>
      <div className="aboutus-content">
        <img
          ref={imageRef}
          src={img1}
          alt="Immagine 1"
          className="aboutus-image"
        />
        <div ref={textRef} className="aboutus-text">
          <h2>Titolo Immagine 1</h2>
          <p>
            Testo che accompagna la prima immagine, che entra da destra verso sinistra.
          </p>
        </div>
      </div>
      <div className="aboutus-content second-block">
        <img
          ref={imageRef2}
          src={img2}
          alt="Immagine 2"
          className="aboutus-image"
        />
        <div ref={textRef2} className="aboutus-text">
          <h2>Titolo Immagine 2</h2>
          <p>
            Testo che accompagna la seconda immagine, che entra da destra verso sinistra.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AboutUs;