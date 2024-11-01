// src/App.jsx
import { useEffect, useRef } from 'react';
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

function App() {
  gsap.registerPlugin(ScrollTrigger);

  const preference = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const [isDark, setIsDark] = useLocalStorage('isDark', preference);

  const scrollContainerRef = useRef(null);
  const isMobileRef = useRef(window.innerWidth <= 768);
  const windowWidthRef = useRef(window.innerWidth);

  const initializeScroll = () => {
    const container = scrollContainerRef.current;

    if (!container) {
      console.error('scrollContainerRef.current is null');
      return;
    }

    const isMobile = window.innerWidth <= 768;

    if (isMobile) {
      // Rimuovi qualsiasi animazione GSAP per i dispositivi mobili
      ScrollTrigger.getAll().forEach((t) => t.kill());
      gsap.killTweensOf(container);
      container.style.transform = ''; // Rimuovi le trasformazioni GSAP su mobile
      return; // Interrompi qui per dispositivi mobili
    }

    // Se su desktop, abilita lo scroll orizzontale
    const totalWidth = container.scrollWidth - window.innerWidth;

    gsap.to(container, {
      x: -totalWidth,
      ease: 'none',
      scrollTrigger: {
        trigger: container,
        start: 'top top',
        end: () => `+=${totalWidth}`,
        scrub: 1.5,
        pin: true,
        anticipatePin: 1,
      },
    });
  };

  useEffect(() => {
    initializeScroll();

    const handleResize = () => {
      const newWidth = window.innerWidth;
      const isMobile = newWidth <= 768;

      // Se siamo su desktop e la larghezza cambia, ricalcola lo scroll
      if (!isMobile && newWidth !== windowWidthRef.current) {
        windowWidthRef.current = newWidth;
        initializeScroll();
      }

      // Se passiamo da desktop a mobile o viceversa
      if (isMobileRef.current !== isMobile) {
        isMobileRef.current = isMobile;
        initializeScroll();
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      ScrollTrigger.getAll().forEach((t) => t.kill());
    };
  }, []);

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
        <div
          className="App"
          data-theme={isDark ? 'dark' : 'light'}
          ref={scrollContainerRef}
        >
          <div className="section">
            <Home isDark={isDark !== undefined ? isDark : false} />
          </div>
          <div className="section">
            <AboutUs />
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
