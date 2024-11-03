// src/components/about-us/AboutUsMobile.jsx
import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import './AboutUs.css';
import img1 from '../../assets/marco.jpg';

gsap.registerPlugin(ScrollTrigger);
console.log('GSAP and ScrollTrigger registered in AboutUsMobile');

const AboutUsMobile = () => {
  console.log('AboutUsMobile component rendered');

  const aboutUsRef = useRef(null);
  const stripesContainerRef = useRef(null);
  const imageRef = useRef(null);
  const parallaxTweenRef = useRef(null);

  useEffect(() => {
    console.log('AboutUsMobile useEffect executed');

    const aboutUsElem = aboutUsRef.current;
    const stripesContainer = stripesContainerRef.current;
    const imageElem = imageRef.current;

    console.log('aboutUsElem:', aboutUsElem);
    console.log('stripesContainer:', stripesContainer);
    console.log('imageElem:', imageElem);

    if (!aboutUsElem || !stripesContainer || !imageElem) {
      console.error('Elements not found in AboutUsMobile');
      return;
    }

    console.log('Elements found in AboutUsMobile');

    // Creare e aggiungere le strisce al container
    stripesContainer.innerHTML = '';
    const numStripes = 15;
    for (let i = 0; i < numStripes; i++) {
      const stripe = document.createElement('div');
      stripe.classList.add('stripe');
      stripesContainer.appendChild(stripe);
    }
    console.log('Stripes created and appended');

    // Effetto di transizione con strisce
    const stripes = stripesContainer.querySelectorAll('.stripe');
    console.log('stripes:', stripes);
    const stripesAnimation = gsap.to(stripes, {
      scaleX: 1.1,
      transformOrigin: 'left center',
      stagger: 0.1,
      scrollTrigger: {
        trigger: aboutUsElem,
        start: 'top center',
        end: 'bottom top',
        scrub: true,
        markers: true, // Abilita markers per il debugging
        onUpdate: () => {
          console.log('stripesAnimation onUpdate');
        },
      },
      onComplete: () => {
        console.log('stripesAnimation completed');
      },
    });
    console.log('stripesAnimation created:', stripesAnimation);

    // Animazione di parallasse per mobile
    parallaxTweenRef.current = gsap.to(imageElem, {
      y: '35%',
      ease: 'none',
      scrollTrigger: {
        trigger: aboutUsElem,
        start: 'top bottom',
        end: 'bottom top',
        scrub: true,
        markers: true, // Abilita markers per il debugging
        onUpdate: () => {
          console.log('parallaxTweenRef onUpdate');
        },
      },
      onComplete: () => {
        console.log('parallaxTweenRef animation completed');
      },
    });
    console.log('parallaxTweenRef.current created:', parallaxTweenRef.current);

    // Pulizia al dismontaggio del componente
    return () => {
      console.log('AboutUsMobile cleanup function called');
      if (parallaxTweenRef.current) {
        if (parallaxTweenRef.current.scrollTrigger) {
          parallaxTweenRef.current.scrollTrigger.kill();
          console.log('parallaxTweenRef.current.scrollTrigger killed');
        }
        parallaxTweenRef.current.kill();
        parallaxTweenRef.current = null;
        console.log('parallaxTweenRef.current killed and set to null');
      }
      if (stripesAnimation && stripesAnimation.scrollTrigger) {
        stripesAnimation.scrollTrigger.kill();
        stripesAnimation.kill();
        console.log('stripesAnimation and its scrollTrigger killed');
      }
    };
  }, []);

  return (
    <div className="aboutus-section" ref={aboutUsRef}>
      {console.log('Rendering AboutUsMobile JSX')}
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

export default AboutUsMobile;
