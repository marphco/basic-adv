import { useRef, useLayoutEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import './Home.css';
import logoLight from '../../assets/logo-light.svg';
import logoDark from '../../assets/logo-dark.svg';

gsap.registerPlugin(ScrollTrigger);

// Utilizziamo React.forwardRef per accettare il ref
const Home = () => {
  const homeRef = useRef(null);

  useLayoutEffect(() => {
    let ctx = gsap.context(() => {
      if (!homeRef.current) return;

      const homeElem = homeRef.current;
      const stripesContainer = homeElem.querySelector('.stripes-container');

      if (stripesContainer) {
        // Creazione delle strisce
        stripesContainer.innerHTML = '';
        const numStripes = 20;
        for (let i = 0; i < numStripes; i++) {
          const stripe = document.createElement('div');
          stripe.classList.add('stripe');
          stripesContainer.appendChild(stripe);
        }

        gsap.set(stripesContainer, { opacity: 0 });
        const stripes = stripesContainer.querySelectorAll('.stripe');

        const tlHome = gsap.timeline({
          scrollTrigger: {
            trigger: homeElem,
            start: 'top top',
            end: 'bottom 80%',
            scrub: true
          },
        });

        tlHome.to(stripesContainer, { opacity: 1, duration: 0.5 });
        tlHome.to(
          stripes,
          {
            scaleX: 1,
            transformOrigin: 'left center',
            stagger: 0.1,
            ease: 'none',
          },
          '-=0.3'
        );
      }
    }, homeRef);

    return () => ctx.revert();
  }, []);
  
  return (
    <div className="home-container" ref={homeRef}>
      <div className="stripes-container"></div>
      <div className="home-text">
        <p>
          Se si tratta di comunicare, noi ci siamo. Trasformiamo idee in storie, progetti in esperienze. Non importa dove, non importa come: il tuo pubblico sta aspettando.
          <br />
          <span className="tagline">E noi siamo qui per farlo innamorare.</span>
        </p>
      </div>
      <div className="bottom-section">
        <div className="home-logo-container">
          <img src={logoLight} alt="Logo Light" className="home-logo light-logo" />
          <img src={logoDark} alt="Logo Dark" className="home-logo dark-logo" />
        </div>
        <div className="scroll-hint">
          COMINCIAMO? <span className="scroll-arrow">↓</span>
        </div>
      </div>
    </div>
  );
};

export default Home;