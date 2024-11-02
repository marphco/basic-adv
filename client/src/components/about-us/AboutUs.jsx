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

    // Creare e aggiungere le strisce al container
    const numStripes = 10; // Numero di strisce ridotto per migliorare l'effetto visivo
    for (let i = 0; i < numStripes; i++) {
      const stripe = document.createElement('div');
      stripe.classList.add('stripe');
      stripesContainer.appendChild(stripe);
    }

    // Effetto parallasse laterale dell'immagine durante lo scroll (desktop)
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

    // Effetto di transizione con strisce
    const stripes = stripesContainer.querySelectorAll('.stripe');
    gsap.to(stripes, {
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

    // Effetto parallasse verticale per dispositivi mobili
    if (window.innerWidth <= 768) {
      gsap.to(imageElem, {
        y: '-20%', // Movimento verso l'alto per l'effetto di parallasse verticale
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
