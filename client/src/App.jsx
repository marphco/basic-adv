import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import useLocalStorage from "use-local-storage";
import "./App.css";
import { Cursor } from "./components/cursor/Cursor";
import Navbar from "./components/navbar/Navbar";
import Home from "./components/home/Home";
import Services from "./components/services/Services";
import Portfolio from "./components/portfolio/Portfolio";
import Contacts from "./components/contacts/Contacts";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { AboutUsPortal } from "./components/about-us/AboutUsPortal";
import AboutUsDesktop from "./components/about-us/AboutUsDesktop";
import AboutUs from "./components/about-us/AboutUs";
import ProjectSectionMobile from "./components/portfolio/ProjectSectionMobile";
import ScrollToTopOnRouteChange from "./components/about-us/ScrollToTopOnRouteChange";

gsap.registerPlugin(ScrollTrigger);
ScrollTrigger.normalizeScroll(true);

function App() {
  const preference = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const [isDark, setIsDark] = useLocalStorage('isDark', preference);
  const [isAboutUsOpen, setIsAboutUsOpen] = useState(false);
  const openAboutUs = () => setIsAboutUsOpen(true);
  const closeAboutUs = () => setIsAboutUsOpen(false);

  const scrollContainerRef = useRef(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [windowHeight, setWindowHeight] = useState(window.innerHeight);
  const [scrollTween, setScrollTween] = useState(null);

  useLayoutEffect(() => {
    const handleResize = () => {
      const isMobileNow = window.innerWidth <= 768;
      if (isMobile !== isMobileNow) setIsMobile(isMobileNow);
      if (window.innerWidth !== windowWidth || window.innerHeight !== windowHeight) {
        setWindowWidth(window.innerWidth);
        setWindowHeight(window.innerHeight);
        ScrollTrigger.refresh();
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isMobile, windowWidth, windowHeight]);

  useLayoutEffect(() => {
    let ctx = gsap.context(() => {
      if (!isMobile && scrollContainerRef.current) {
        const container = scrollContainerRef.current;
        const totalWidth = container.scrollWidth - window.innerWidth;
        if (scrollTween) scrollTween.kill();
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
            invalidateOnRefresh: true,
          },
        });
        setScrollTween(tween);
      } else {
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
  }, [isMobile, windowWidth, windowHeight]);

  useEffect(() => {
    // Applica l’attributo data-theme al body per il tema
    document.body.setAttribute('data-theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  useEffect(() => {
    document.body.classList.add('no-default-cursor');
    return () => document.body.classList.remove('no-default-cursor');
  }, []);

  return (
    <Router>
      <ScrollToTopOnRouteChange />
      <div className={`app-wrapper ${isDark ? 'dark-theme' : 'light-theme'}`}>
        <Cursor isDark={isDark} />
        <Navbar
          isDark={isDark}
          setIsDark={setIsDark}
          openAboutUs={openAboutUs}
          closeAboutUs={closeAboutUs}
          isMobile={isMobile}
        />
        <div className="App" ref={scrollContainerRef}>
          <Routes>
            <Route
              path="/"
              element={
                <>
                  <div className="section"><Home /></div>
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
                  <div className="section"><Contacts /></div>
                  {!isMobile && (
                    <AboutUsPortal isOpen={isAboutUsOpen} onClose={closeAboutUs}>
                      <AboutUsDesktop />
                    </AboutUsPortal>
                  )}
                </>
              }
            />
            <Route path="/about-us" element={<AboutUs />} />
            {isMobile && (
              <Route path="/project/:id" element={<ProjectSectionMobile />} />
            )}
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;