import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import useLocalStorage from "use-local-storage";
import PropTypes from "prop-types";
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
import Login from "./components/login/Login";
import Dashboard from "./components/dashboard/Dashboard";
import Footer from "./components/footer/Footer";

// Componenti placeholder per Privacy Policy e Cookie Policy
const PrivacyPolicy = () => <div>Privacy Policy Page</div>;
const CookiePolicy = () => <div>Cookie Policy Page</div>;

gsap.registerPlugin(ScrollTrigger);
ScrollTrigger.normalizeScroll(true);

function AppContent({ isDark, setIsDark, scrollContainerRef }) {
  const location = useLocation();
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const isDashboard = location.pathname === "/dashboard";
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [windowHeight, setWindowHeight] = useState(window.innerHeight);
  const [scrollTween, setScrollTween] = useState(null);
  const [isAboutUsOpen, setIsAboutUsOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const openAboutUs = () => setIsAboutUsOpen(true);
  const closeAboutUs = () => setIsAboutUsOpen(false);
  const toggleSidebar = () => setIsSidebarOpen((prev) => !prev);

  useLayoutEffect(() => {
    const handleResize = () => {
      const isMobileNow = window.innerWidth <= 768;
      if (isMobile !== isMobileNow) setIsMobile(isMobileNow);
      if (window.innerWidth !== windowWidth || windowHeight !== windowHeight) {
        setWindowWidth(window.innerWidth);
        setWindowHeight(window.innerHeight);
        ScrollTrigger.refresh();
        window.location.reload();
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isMobile, windowWidth, windowHeight]);

  useLayoutEffect(() => {
    let ctx = gsap.context(() => {
      const isHomePage = location.pathname === "/";
      if (!isMobile && scrollContainerRef.current && isHomePage) {
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
          gsap.set(scrollContainerRef.current, { clearProps: "all" });
        }
        if (scrollTween) {
          scrollTween.kill();
          setScrollTween(null);
        }
      }
      ScrollTrigger.refresh();
    }, scrollContainerRef);
    return () => ctx.revert();
  }, [isMobile, windowWidth, windowHeight, location.pathname]);

  useEffect(() => {
    document.body.setAttribute("data-theme", isDark ? "dark" : "light");
  }, [isDark]);

  useEffect(() => {
    document.body.classList.add("no-default-cursor");
    return () => document.body.classList.remove("no-default-cursor");
  }, []);

  return (
    <>
      <Cursor isDark={isDark} />
      <Navbar
        isDark={isDark}
        setIsDark={setIsDark}
        openAboutUs={openAboutUs}
        closeAboutUs={closeAboutUs}
        isMobile={isMobile}
        toggleSidebar={toggleSidebar}
        isSidebarOpen={isSidebarOpen}
      />
      <div
        className={`App ${isDashboard ? "dashboard-layout" : ""}`}
        ref={scrollContainerRef}
      >
        <Routes>
          <Route
            path="/"
            element={
              <>
                <div className="section">
                  <Home />
                </div>
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
                <div className="section">
                  <Contacts />
                </div>
                <div className="section-footer">
                  <Footer />
                </div>
                {!isMobile && (
                  <AboutUsPortal isOpen={isAboutUsOpen} onClose={closeAboutUs}>
                    <AboutUsDesktop />
                  </AboutUsPortal>
                )}
              </>
            }
          />
          <Route path="/about-us" element={<AboutUs />} />
          {isMobile && <Route path="/project/:id" element={<ProjectSectionMobile />} />}
          <Route path="/login" element={<Login isDark={isDark} />} />
          <Route
            path="/dashboard"
            element={
              <Dashboard
                isDark={isDark}
                toggleSidebar={toggleSidebar}
                isSidebarOpen={isSidebarOpen}
              />
            }
          />
          {/* Aggiunte route per Privacy Policy e Cookie Policy */}
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/cookie-policy" element={<CookiePolicy />} />
        </Routes>
      </div>
    </>
  );
}

AppContent.propTypes = {
  isDark: PropTypes.bool.isRequired,
  setIsDark: PropTypes.func.isRequired,
  scrollContainerRef: PropTypes.shape({
    current: PropTypes.instanceOf(Element),
  }).isRequired,
};

function App() {
  const preference = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const [isDark, setIsDark] = useLocalStorage("isDark", preference);
  const scrollContainerRef = useRef(null);

  return (
    <Router>
      <ScrollToTopOnRouteChange />
      <div className={`app-wrapper ${isDark ? "dark-theme" : "light-theme"}`}>
        <AppContent isDark={isDark} setIsDark={setIsDark} scrollContainerRef={scrollContainerRef} />
      </div>
    </Router>
  );
}

export default App;