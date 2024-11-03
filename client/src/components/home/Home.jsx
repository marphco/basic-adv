// src/components/home/Home.jsx
import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import './Home.css';
import logoLight from '../../assets/logo-light.svg';
import logoDark from '../../assets/logo-dark.svg';

gsap.registerPlugin(ScrollTrigger);

const Home = () => {
  const homeRef = useRef(null);
  const stripesContainerRef = useRef(null);

  const setupAnimation = () => {
    const homeElem = homeRef.current;
    const stripesContainer = stripesContainerRef.current;

    if (!homeElem || !stripesContainer) {
      console.error('Elements not found');
      return;
    }

    const isMobile = window.innerWidth <= 768;
    if (isMobile) {
      // Non applicare animazioni delle stripes su mobile
      return;
    }

    // Pulizia delle stripes precedenti, se esistono
    stripesContainer.innerHTML = '';

    // Creare e aggiungere le strisce al container
    const numStripes = 15;
    for (let i = 0; i < numStripes; i++) {
      const stripe = document.createElement('div');
      stripe.classList.add('stripe');
      stripesContainer.appendChild(stripe);
    }

    // Impostare il container delle stripes invisibile all'inizio
    gsap.set(stripesContainer, { opacity: 0 });

    // Effetto di transizione con strisce
    const stripes = stripesContainer.querySelectorAll('.stripe');
    gsap.timeline({
      scrollTrigger: {
        trigger: homeElem,
        start: 'top top',
        end: 'bottom top',
        scrub: true,
        markers: false,
        onEnter: () => {
          stripesContainer.style.backgroundColor = 'transparent';
        },
      },
    })
      .to(stripesContainer, { opacity: 1, duration: 0.5 })
      .to(stripes, {
        scaleX: 1,
        transformOrigin: 'left center',
        stagger: 0.1,
        ease: 'none',
      });
  };

  useEffect(() => {
    // Esegui l'animazione al montaggio solo su desktop
    if (window.innerWidth > 768) {
      setupAnimation();
    }

    // Listener di resize per reimpostare l'animazione solo su desktop
    const handleResize = () => {
      if (window.innerWidth > 768) {
        ScrollTrigger.getAll().forEach((t) => t.kill());
        setupAnimation();
      } else {
        ScrollTrigger.getAll().forEach((t) => t.kill());
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      ScrollTrigger.getAll().forEach((t) => t.kill());
    };
  }, []); // Dipendenze vuote, l'effetto viene eseguito solo al montaggio

  return (
    <div className="home-container" ref={homeRef}>
      <div className="stripes-container" ref={stripesContainerRef}></div>
      <div className="home-text">
        <p>
          Se si tratta di comunicare, noi ci siamo. Trasformiamo idee in storie, progetti in esperienze. Non importa dove, non importa come: il tuo pubblico sta aspettando.
          <br />
          <span className="tagline">E noi siamo qui per farlo innamorare.</span>
        </p>
      </div>
      <div className="bottom-section">
        <div className="home-logo-container">
          <img src={logoLight} alt="Logo Light" className="home-logo light-logo safari-fix" />
          <img src={logoDark} alt="Logo Dark" className="home-logo dark-logo safari-fix" />
        </div>
        <div className="scroll-hint">
          COMINCIAMO? <span className="scroll-arrow">↓</span>
        </div>
      </div>
    </div>
  );
};

export default Home;
