import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import './AboutUs.css';
import img1 from '../../assets/marco.jpg';

gsap.registerPlugin(ScrollTrigger);

const AboutUsMobile = () => {
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
    const numStripes = 15;
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

    // Animazione di parallasse per mobile
    parallaxTweenRef.current = gsap.to(imageElem, {
      y: '35%',
      ease: 'none',
      scrollTrigger: {
        trigger: aboutUsElem,
        start: 'top bottom',
        end: 'bottom top',
        scrub: true,
        markers: false,
      },
    });

    // Pulizia al dismontaggio del componente
    return () => {
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

export default AboutUsMobile;
