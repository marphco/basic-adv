import { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import useLocalStorage from 'use-local-storage';
import './App.css';
import { Cursor } from './components/cursor/Cursor';
import Navbar from './components/navbar/Navbar';
import Home from './components/home/Home';
import AboutUs from './components/about-us/AboutUs';
import Contacts from './components/contacts/Contacts';

// Registra il plugin ScrollTrigger
gsap.registerPlugin(ScrollTrigger);

function App() {
  // Gestione del tema (light/dark)
  const preference = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const [isDark, setIsDark] = useLocalStorage('isDark', preference);

  // Riferimenti per le sezioni
  const scrollContainerRef = useRef(null);
  const homeRef = useRef(null);
  const aboutUsRef = useRef(null);
  const contactsRef = useRef(null);
  const lineRef = useRef(null);

  // Stato per gestire la responsività
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const windowWidthRef = useRef(window.innerWidth);
  const windowHeightRef = useRef(window.innerHeight);

  // Gestione del resize per aggiornare isMobile
  useEffect(() => {
    const handleResize = () => {
      const isMobileNow = window.innerWidth <= 768;
      if (isMobile !== isMobileNow) {
        setIsMobile(isMobileNow);
      }

      if (window.innerWidth !== windowWidthRef.current || window.innerHeight !== windowHeightRef.current) {
        windowWidthRef.current = window.innerWidth;
        windowHeightRef.current = window.innerHeight;
        ScrollTrigger.refresh();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isMobile]);

  // Centralizzazione delle animazioni in App.jsx
  useEffect(() => {
    const ctx = gsap.context(() => {
      // **1. Animazioni per la sezione Home**
      if (homeRef.current && !isMobile) {
        const homeElem = homeRef.current;
        const stripesContainer = homeElem.querySelector('.stripes-container');
  
        if (stripesContainer) {
          stripesContainer.innerHTML = '';
          const numStripes = 15;
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
              scrub: true,
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
      }
  
      // **2. Animazione Scroll Orizzontale (se desiderato)**
      if (!isMobile && scrollContainerRef.current) {
        const container = scrollContainerRef.current;
        const totalWidth = container.scrollWidth - window.innerWidth;
  
        gsap.to(container, {
          x: -totalWidth,
          ease: 'none',
          scrollTrigger: {
            trigger: container,
            start: 'top top',
            end: 'bottom top',
            scrub: 1.5,
            pin: true,
            anticipatePin: 1,
          },
        });
      }
  
      // **3. Animazioni per la sezione AboutUs**
      if (aboutUsRef.current && lineRef.current) {
        const aboutUsElem = aboutUsRef.current;
        const lineElem = lineRef.current;
        const chiSiamoText = aboutUsElem.querySelector('.chi-siamo-text');
  
        const tlAboutUs = gsap.timeline({
          scrollTrigger: {
            trigger: aboutUsElem,
            start: "top top",
            end: "bottom top",
            scrub: true,
          }
        });
  
        const aboutUsWidth = aboutUsElem.scrollWidth;
  
        tlAboutUs.to(lineElem, {
          width: `${aboutUsWidth}px`,
          ease: "none",
        });
  
        // Ripristina l'animazione per `chi-siamo-text`
        if (chiSiamoText) {
          tlAboutUs.to(chiSiamoText, {
            yPercent: 170,
            ease: "none",
            duration: 0.5,
          }, 0);
        }
      }
  
      ScrollTrigger.refresh();
    }, scrollContainerRef);
  
    return () => ctx.revert();
  }, [isMobile]);

  // Gestione del tema (aggiunge un attributo al body)
  useEffect(() => {
    document.body.setAttribute('data-theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  // Gestione del cursore personalizzato (se applicabile)
  useEffect(() => {
    document.body.classList.add('no-default-cursor');
    return () => {
      document.body.classList.remove('no-default-cursor');
    };
  }, []);

  return (
    <Router>
      <div className="app-wrapper">
        <Cursor isDark={isDark} />
        <Navbar isDark={isDark} setIsDark={setIsDark} />
        <div className="App" ref={scrollContainerRef}>
          <div className="section" ref={homeRef}>
            <Home />
          </div>
          <div className="section" ref={aboutUsRef}>
            <AboutUs lineRef={lineRef}/>
          </div>
          <div className="section" ref={contactsRef}>
            <Contacts />
          </div>
        </div>
      </div>
    </Router>
  );
}

export default App;
