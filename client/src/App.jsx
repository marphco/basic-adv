// App.jsx
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
import Portfolio from "./components/portfolio/Portfolio";
// import AboutUs from "./components/about-us/AboutUs";
import Contacts from "./components/contacts/Contacts";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
// import AboutUsOverlay from "./components/about-us/AboutUsOverlay";
import { AboutUsPortal } from "./components/about-us/AboutUsPortal";
import AboutUs from "./components/about-us/AboutUs"; // i contenuti



// Registra il plugin ScrollTrigger
gsap.registerPlugin(ScrollTrigger);

ScrollTrigger.normalizeScroll(true);

function App() {
  // Gestione del tema (light/dark)
  const preference = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const [isDark, setIsDark] = useLocalStorage('isDark', preference);

  const [isAboutUsOpen, setIsAboutUsOpen] = useState(false);

  // Funzione per aprire l'Overlay About Us
  const openAboutUs = () => {
    console.log("openAboutUs called!");

    setIsAboutUsOpen(true);
  };

  // Funzione per chiudere l'Overlay About Us
  const closeAboutUs = () => {
    setIsAboutUsOpen(false);
  };


  // Riferimenti per le sezioni
  const scrollContainerRef = useRef(null);

  // Stato per gestire la responsività e le dimensioni della finestra
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [windowHeight, setWindowHeight] = useState(window.innerHeight);

  // Stato per l'animazione dello scroll orizzontale
  const [scrollTween, setScrollTween] = useState(null);

  // Gestione del resize per aggiornare isMobile e le dimensioni della finestra
  useLayoutEffect(() => {
    const handleResize = () => {
      const isMobileNow = window.innerWidth <= 768;
      if (isMobile !== isMobileNow) {
        setIsMobile(isMobileNow);
      }

      if (
        window.innerWidth !== windowWidth ||
        window.innerHeight !== windowHeight
      ) {
        setWindowWidth(window.innerWidth);
        setWindowHeight(window.innerHeight);
        ScrollTrigger.refresh();
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isMobile, windowWidth, windowHeight]);

  // Centralizzazione delle animazioni in App.jsx
  useLayoutEffect(() => {
    let ctx = gsap.context(() => {
      if (!isMobile && scrollContainerRef.current) {
        const container = scrollContainerRef.current;
        const totalWidth = container.scrollWidth - window.innerWidth;

        // Se esiste già un tween precedente, lo uccidiamo
        if (scrollTween) {
          scrollTween.kill();
        }

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
            invalidateOnRefresh: true, // Ricalcola il tween su refresh
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobile, windowWidth, windowHeight]); // Non includiamo scrollTween per evitare loop

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
        <Navbar isDark={isDark} setIsDark={setIsDark} openAboutUs={openAboutUs}/>
        <div className="App" ref={scrollContainerRef}>
          <div className="section">
            <Home />
          </div>
            
            {/* <AboutUs /> */}

          <div className="section">
            <Services 
              scrollTween={scrollTween} 
              isMobile={isMobile} 
              windowWidth={windowWidth} 
              windowHeight={windowHeight} 
            />
          </div>

          <div className="section">
            <DndProvider backend={HTML5Backend}>
              <Portfolio scrollTween={scrollTween} />
            </DndProvider>
          </div>

          {/* <AboutUsOverlay isOpen={isAboutUsOpen} onClose={closeAboutUs} />        */}

          <div className="section">
            <Contacts />
          </div>

          {/* Portal overlay */}
        <AboutUsPortal isOpen={isAboutUsOpen} onClose={closeAboutUs}>
          <AboutUs />
        </AboutUsPortal>

        </div>
      </div>
    </Router>
  );
}

export default App;
