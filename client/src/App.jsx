import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { BrowserRouter as Router } from "react-router-dom";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import useLocalStorage from "use-local-storage";
import "./App.css";
import { Cursor } from "./components/cursor/Cursor";
import Navbar from "./components/navbar/Navbar";
import Home from "./components/home/Home";
import Services from "./components/services/Services";
import Contacts from "./components/contacts/Contacts";

// Registra il plugin ScrollTrigger
gsap.registerPlugin(ScrollTrigger);

ScrollTrigger.normalizeScroll(true);

function App() {
  // Gestione del tema (light/dark)
  const preference = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const [isDark, setIsDark] = useLocalStorage('isDark', preference);

  // Riferimenti per le sezioni
  const scrollContainerRef = useRef(null);

  // Stato per gestire la responsività
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const windowWidthRef = useRef(window.innerWidth);
  const windowHeightRef = useRef(window.innerHeight);

  
  // Gestione del resize per aggiornare isMobile
  useLayoutEffect(() => {
    const handleResize = () => {
      const isMobileNow = window.innerWidth <= 768;
      if (isMobile !== isMobileNow) {
        setIsMobile(isMobileNow);
      }
      
      if (
        window.innerWidth !== windowWidthRef.current ||
        window.innerHeight !== windowHeightRef.current
      ) {
        windowWidthRef.current = window.innerWidth;
        windowHeightRef.current = window.innerHeight;
        ScrollTrigger.refresh();
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isMobile]);
  
  // Riferimento per l'animazione dello scroll orizzontale
  const [scrollTween, setScrollTween] = useState(null);

  // Centralizzazione delle animazioni in App.jsx
  useLayoutEffect(() => {
  let ctx = gsap.context(() => {
    if (!isMobile && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const totalWidth = container.scrollWidth - window.innerWidth;

      // Crea l'animazione dello scroll orizzontale
      const tween = gsap.to(container, {
        x: -totalWidth,
        ease: "none",
        scrollTrigger: {
          trigger: container,
          start: "top top",
          end: "bottom top",
          scrub: 2,
          pin: true,
          anticipatePin: 1,
        },
      });

      setScrollTween(tween);
    } else {
      // Se siamo su mobile, resettiamo lo scroll e rimuoviamo l'animazione dello scroll orizzontale
      if (scrollContainerRef.current) {
        gsap.set(scrollContainerRef.current, { clearProps: 'all' });
      }
      if (scrollTween) {
        scrollTween.kill();
        setScrollTween(null);
      }
    }

    ScrollTrigger.refresh();
  }, scrollContainerRef);

  return () => ctx.revert();
}, [isMobile]/* eslint-disable-line react-hooks/exhaustive-deps */);


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
          <div className="section">
            <Home />
          </div>

            <div className="section">
              <Services scrollTween={scrollTween} isMobile={isMobile} />
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
