// src/components/about-us/AboutUs.jsx
import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import './AboutUs.css';
import img1 from '../../assets/marco.jpg';

gsap.registerPlugin(ScrollTrigger);

const AboutUs = () => {
  const aboutUsRef = useRef(null);
  const stripesContainerRef = useRef(null);
  const imageRef = useRef(null);
  const parallaxTweenRef = useRef(null);
  const isMobileRef = useRef(window.innerWidth <= 768);

  useEffect(() => {
    const aboutUsElem = aboutUsRef.current;
    const stripesContainer = stripesContainerRef.current;
    const imageElem = imageRef.current;

    if (!aboutUsElem || !stripesContainer || !imageElem) {
      console.error('Elements not found');
      return;
    }

    // Pulizia delle strisce precedenti
    stripesContainer.innerHTML = '';

    // Creare e aggiungere le strisce al container
    const numStripes = 15; // Numero di strisce rimane a 15
    for (let i = 0; i < numStripes; i++) {
      const stripe = document.createElement('div');
      stripe.classList.add('stripe');
      stripesContainer.appendChild(stripe);
    }

    // Effetto di transizione con strisce
    const stripes = stripesContainer.querySelectorAll('.stripe');
    gsap.to(stripes, {
      scaleX: 1.1,
      transformOrigin: 'left center',
      stagger: 5000000,
      scrollTrigger: {
        trigger: aboutUsElem,
        start: 'top center',
        end: 'bottom top',
        scrub: true,
        markers: false,
      },
    });

    // Funzione per creare l'animazione di parallasse appropriata
    const createParallax = () => {
      // Elimina l'animazione precedente, se esiste
      if (parallaxTweenRef.current) {
        parallaxTweenRef.current.kill();
      }

      // Determina se siamo su mobile o desktop
      const isMobile = window.innerWidth <= 768;
      isMobileRef.current = isMobile;

      // Ripristina le proprietà di trasformazione dell'immagine
      gsap.set(imageElem, { clearProps: 'x,y' });

      if (isMobile) {
        // Effetto parallasse verticale per dispositivi mobili
        parallaxTweenRef.current = gsap.to(imageElem, {
          y: '30%',
          ease: 'none',
          scrollTrigger: {
            trigger: aboutUsElem,
            start: 'top bottom',
            end: 'bottom top',
            scrub: true,
            markers: false,
          },
        });
      } else {
        // Effetto parallasse orizzontale dell'immagine su desktop
        parallaxTweenRef.current = gsap.to(imageElem, {
          x: '-20%',
          ease: 'none',
          scrollTrigger: {
            trigger: aboutUsElem,
            start: 'top bottom',
            end: 'bottom top',
            scrub: true,
            markers: false,
          },
        });
      }
    };

    // Creare l'animazione di parallasse iniziale
    createParallax();

    // Listener per il ridimensionamento della finestra
    const handleResize = () => {
      const isMobile = window.innerWidth <= 768;
      if (isMobile !== isMobileRef.current) {
        // Se la dimensione è cambiata da mobile a desktop o viceversa, ricrea l'animazione
        createParallax();
      }
    };

    window.addEventListener('resize', handleResize);

    // Pulizia al dismontaggio del componente
    return () => {
      window.removeEventListener('resize', handleResize);
      if (parallaxTweenRef.current) {
        parallaxTweenRef.current.kill();
      }
      // Non eliminiamo gli ScrollTrigger delle stripes
    };
  }, []);

  return (
    <div className="aboutus-section" ref={aboutUsRef}>
      <div className="stripes-container" ref={stripesContainerRef}></div>
      <div className="aboutus-content">
        <img
          ref={imageRef}
          src={img1}
          alt="Immagine About Us"
          className="aboutus-image"
        />
      </div>
    </div>
  );
};

export default AboutUs;
