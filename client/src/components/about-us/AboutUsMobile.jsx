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
  const imageRef = useRef(null);
  const parallaxTweenRef = useRef(null);

  useEffect(() => {
    console.log('AboutUsMobile useEffect executed');

    const aboutUsElem = aboutUsRef.current;
    const imageElem = imageRef.current;

    console.log('aboutUsElem:', aboutUsElem);
    console.log('imageElem:', imageElem);

    if (!aboutUsElem || !imageElem) {
      console.error('Elements not found in AboutUsMobile');
      return;
    }

    console.log('Elements found in AboutUsMobile');

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

    // Forza un aggiornamento di ScrollTrigger
    ScrollTrigger.refresh();

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
    };
  }, []);

  return (
    <div className="aboutus-section" ref={aboutUsRef}>
      {console.log('Rendering AboutUsMobile JSX')}
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
