// src/components/about-us/AboutUs.jsx
import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import './AboutUs.css';
import img1 from '../../assets/marco.jpg';

gsap.registerPlugin(ScrollTrigger);

const AboutUs = () => {
  const aboutUsRef = useRef(null);
  const stripesContainerRef = useRef(null);
  const imageRef = useRef(null);
  const parallaxTweenRef = useRef(null);

  useEffect(() => {
    const aboutUsElem = aboutUsRef.current;
    const stripesContainer = stripesContainerRef.current;
    const imageElem = imageRef.current;

    if (!aboutUsElem || !stripesContainer || !imageElem) {
      console.error('Elements not found');
      return;
    }

    // Creare e aggiungere le strisce al container
    stripesContainer.innerHTML = '';
    const numStripes = 15; // Manteniamo il numero di strisce a 15
    for (let i = 0; i < numStripes; i++) {
      const stripe = document.createElement('div');
      stripe.classList.add('stripe');
      stripesContainer.appendChild(stripe);
    }

    // Effetto di transizione con strisce
    const stripes = stripesContainer.querySelectorAll('.stripe');
    const stripesAnimation = gsap.to(stripes, {
      scaleX: 1.1,
      transformOrigin: 'left center',
      stagger: 0.1,
      scrollTrigger: {
        trigger: aboutUsElem,
        start: 'top center',
        end: 'bottom top',
        scrub: true,
        markers: false,
      },
    });

    // Funzione per creare l'animazione di parallasse
    const createParallax = () => {
      // Ripristina le proprietà di trasformazione dell'immagine
      gsap.set(imageElem, { clearProps: 'x,y' });

      // Elimina eventuali animazioni e ScrollTrigger precedenti sull'immagine
      if (parallaxTweenRef.current) {
        if (parallaxTweenRef.current.scrollTrigger) {
          parallaxTweenRef.current.scrollTrigger.kill();
        }
        parallaxTweenRef.current.kill();
        parallaxTweenRef.current = null;
      }

      // Determina se siamo su mobile o desktop
      const isMobile = window.matchMedia('(max-width: 768px)').matches;

      if (isMobile) {
        // Effetto parallasse verticale per dispositivi mobili
        parallaxTweenRef.current = gsap.to(imageElem, {
          y: '35%', // Imposta y a '35%' come desiderato
          ease: 'none',
          scrollTrigger: {
            trigger: aboutUsElem,
            start: 'top bottom',
            end: 'bottom top',
            scrub: true,
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
          },
        });
      }
    };

    // Funzione per inizializzare il parallasse dopo un breve ritardo
    const initParallax = () => {
      setTimeout(() => {
        createParallax();
        ScrollTrigger.refresh();
      }, 100); // Ritardo di 100ms
    };

    // Attendere che l'immagine sia completamente caricata
    if (imageElem.complete) {
      initParallax();
    } else {
      imageElem.addEventListener('load', initParallax);
    }

    // Listener per il ridimensionamento della finestra
    const handleResize = () => {
      initParallax();
    };

    window.addEventListener('resize', handleResize);

    // Pulizia al dismontaggio del componente
    return () => {
      window.removeEventListener('resize', handleResize);

      // Rimuovi l'event listener 'load' sull'immagine
      imageElem.removeEventListener('load', initParallax);

      // Elimina gli ScrollTrigger associati
      if (parallaxTweenRef.current) {
        if (parallaxTweenRef.current.scrollTrigger) {
          parallaxTweenRef.current.scrollTrigger.kill();
        }
        parallaxTweenRef.current.kill();
        parallaxTweenRef.current = null;
      }
      if (stripesAnimation && stripesAnimation.scrollTrigger) {
        stripesAnimation.scrollTrigger.kill();
        stripesAnimation.kill();
      }
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
