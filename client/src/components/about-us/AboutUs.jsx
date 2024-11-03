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

    // Utilizzare gsap.matchMedia per gestire le animazioni in base alla dimensione dello schermo
    const mm = gsap.matchMedia();

    mm.add(
      {
        // Definisci le condizioni per mobile e desktop
        isDesktop: '(min-width: 769px)',
        isMobile: '(max-width: 768px)',
      },
      (context) => {
        let { isDesktop, isMobile } = context.conditions;

        if (isDesktop) {
          // Effetto parallasse orizzontale su desktop
          gsap.to(imageElem, {
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

        if (isMobile) {
          // Effetto parallasse verticale su mobile
          gsap.to(imageElem, {
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
        }
      }
    );

    // Pulizia al dismontaggio del componente
    return () => {
      mm.revert(); // Elimina tutte le animazioni associate a matchMedia
      if (stripesAnimation && stripesAnimation.scrollTrigger) {
        stripesAnimation.scrollTrigger.kill(); // Elimina lo ScrollTrigger delle stripes
        stripesAnimation.kill(); // Elimina l'animazione delle stripes
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
