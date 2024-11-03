// src/App.jsx
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
import AboutUsMobile from './components/about-us/AboutUsMobile';
import Contacts from './components/contacts/Contacts';

function App() {
  gsap.registerPlugin(ScrollTrigger);

  const preference = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const [isDark, setIsDark] = useLocalStorage('isDark', preference);

  const scrollContainerRef = useRef(null);
  const isMobileRef = useRef(window.innerWidth <= 768);
  const windowWidthRef = useRef(window.innerWidth);
  const windowHeightRef = useRef(window.innerHeight);

  // Aggiungi lo stato isMobile
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  // Riferimento allo ScrollTrigger dello scroll orizzontale
  const horizontalScrollTriggerRef = useRef(null);

  const initializeScroll = () => {
    const container = scrollContainerRef.current;

    if (!container) {
      console.error('scrollContainerRef.current is null');
      return;
    }

    const isMobileNow = window.innerWidth <= 768;

    if (isMobileNow) {
      // Rimuovi l'animazione dello scroll orizzontale su desktop
      if (horizontalScrollTriggerRef.current) {
        horizontalScrollTriggerRef.current.kill();
        horizontalScrollTriggerRef.current = null;
      }
      gsap.set(container, { clearProps: 'all' }); // Rimuovi le trasformazioni GSAP su mobile
      return; // Interrompi qui per dispositivi mobili
    }

    // Se su desktop, abilita lo scroll orizzontale
    const totalWidth = container.scrollWidth - window.innerWidth;

    // Rimuovi eventuali animazioni precedenti
    if (horizontalScrollTriggerRef.current) {
      horizontalScrollTriggerRef.current.kill();
      horizontalScrollTriggerRef.current = null;
    }
    gsap.killTweensOf(container);

    // Crea l'animazione dello scroll orizzontale
    const tween = gsap.to(container, {
      x: -totalWidth,
      ease: 'none',
      duration: 1, // la durata può essere ignorata se usi scrub
    });

    horizontalScrollTriggerRef.current = ScrollTrigger.create({
      animation: tween,
      trigger: container,
      start: 'top top',
      end: () => `+=${totalWidth}`,
      scrub: 1.5,
      pin: true,
      anticipatePin: 1,
    });

    // Aggiorna ScrollTrigger
    ScrollTrigger.refresh();
  };

  useEffect(() => {
    initializeScroll();

    const handleResize = () => {
      const newWidth = window.innerWidth;
      const newHeight = window.innerHeight;
      const isMobileNow = newWidth <= 768;

      // Aggiorna lo stato isMobile se è cambiato
      if (isMobile !== isMobileNow) {
        setIsMobile(isMobileNow);
      }

      // Se le dimensioni cambiano, ricalcola lo scroll
      if (
        newWidth !== windowWidthRef.current ||
        newHeight !== windowHeightRef.current ||
        isMobileRef.current !== isMobileNow
      ) {
        windowWidthRef.current = newWidth;
        windowHeightRef.current = newHeight;
        isMobileRef.current = isMobileNow;
        initializeScroll();
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);

      // Elimina solo lo ScrollTrigger dello scroll orizzontale
      if (horizontalScrollTriggerRef.current) {
        horizontalScrollTriggerRef.current.kill();
        horizontalScrollTriggerRef.current = null;
      }
    };
  }, [isMobile]); // Aggiunto isMobile alle dipendenze

  useEffect(() => {
    // Imposta il tema aggiungendo un attributo al body
    document.body.setAttribute('data-theme', isDark ? 'dark' : 'light');
  }, [isDark]);

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
          <div className="section">
            <Home />
          </div>
          <div className="section">
            {isMobile ? <AboutUsMobile /> : <AboutUs />}
          </div>
          <div className="section">
            <Contacts />
          </div>
        </div>
      </div>
    </Router>
  );
}

export default App;
