import { useState, useEffect, useLayoutEffect, useRef } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import useLocalStorage from "use-local-storage";
import PropTypes from "prop-types";
// import "./App.css";
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
import PrivacyPolicy from "./components/policies/PrivacyPolicy";
import CookiePolicy from "./components/policies/CookiePolicy";
import CookieNotice from "./components/policies/CookieNotice";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";
import useInputMode from "../src/hooks/useInputMode"; // se già creato prima
import useDisableZoom from "../src/hooks/useDisableZoom";

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);
ScrollTrigger.normalizeScroll(true);

function AppContent({ isDark, setIsDark, scrollContainerRef }) {
  const location = useLocation();
  const isHomePage = location.pathname === "/";
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const isDashboard = location.pathname === "/dashboard";
  const isPolicyPage =
    location.pathname === "/privacy-policy" ||
    location.pathname === "/cookie-policy";
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
          force3D: true, // ⚑ aggiunto
          scrollTrigger: {
            trigger: container,
            start: "top top",
            end: () => "+=" + (totalWidth * 1.5),
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobile, windowWidth, windowHeight, location.pathname]);

  useEffect(() => {
    document.body.setAttribute("data-theme", isDark ? "dark" : "light");
  }, [isDark]);

  useEffect(() => {
    document.body.classList.add("no-default-cursor");
    return () => document.body.classList.remove("no-default-cursor");
  }, []);

  // Anchor #hash -> scroll corretto (già presente)
  useEffect(() => {
    if (location.pathname !== "/") return;

    const hash = (location.hash || "").slice(1);
    if (!hash) return;

    requestAnimationFrame(() => {
      const target = document.getElementById(hash);
      if (!target) return;

      const container = scrollContainerRef.current;

      if (!isMobile && scrollTween?.scrollTrigger && container) {
        const st = scrollTween.scrollTrigger;
        const totalH = container.scrollWidth - window.innerWidth; // orizzontale
        const totalV = st.end - st.start; // verticale
        const left = Math.max(0, Math.min(target.offsetLeft, totalH));
        const y = st.start + (left / totalH) * totalV; // mappatura corretta

        gsap.to(window, { duration: 0.9, ease: "power2.out", scrollTo: y });
      } else {
        const y = target.getBoundingClientRect().top + window.pageYOffset;
        gsap.to(window, { duration: 0.7, ease: "power2.out", scrollTo: y });
      }
    });
  }, [
    location.pathname,
    location.hash,
    isMobile,
    scrollTween,
    scrollContainerRef,
  ]);

  // Evento custom "basic:scrollTo" -> scroll (già presente)
  useEffect(() => {
    const handler = (ev) => {
      const id = ev?.detail?.id;
      if (!id) return;

      const target =
        document.getElementById(id) ||
        document.querySelector(`[data-section="${id}"]`) ||
        document.querySelector(`.${id}-section`);

      if (!target) return;

      const container = scrollContainerRef.current;

      // DESKTOP (pinned orizzontale): mappa offsetLeft -> Y finestra
      if (!isMobile && scrollTween?.scrollTrigger && container) {
        const st = scrollTween.scrollTrigger;
        const totalH = container.scrollWidth - window.innerWidth; // orizzontale
        const totalV = st.end - st.start; // verticale
        const left = Math.max(0, Math.min(target.offsetLeft, totalH));
        const y = st.start + (left / totalH) * totalV;

        gsap.to(window, { duration: 0.9, ease: "power2.out", scrollTo: y });
        return;
      }

      // MOBILE (layout verticale normale)
      gsap.to(window, { duration: 0.7, ease: "power2.out", scrollTo: target });
    };

    window.addEventListener("basic:scrollTo", handler);
    return () => window.removeEventListener("basic:scrollTo", handler);
  }, [isMobile, scrollTween, scrollContainerRef]);

  // Ripristina la Y salvata quando torni su "/" da un project MOBILE
  useEffect(() => {
    if (!isMobile) return;
    if (location.pathname !== "/") return;

    const saved = sessionStorage.getItem("basic:returnY");
    if (!saved) return;

    sessionStorage.removeItem("basic:returnY");
    const y = Math.max(0, parseInt(saved, 10) || 0);

    // assicurati che sovrascriva eventuali scroll-to-top
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.scrollTo(0, y);
      });
    });
  }, [location.pathname, isMobile]);

  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
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
        className={`App ${isHomePage ? "home-layout" : ""} ${
          isDashboard ? "dashboard-layout" : ""
        } ${isPolicyPage ? "policy-layout" : ""}`}
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

                <div className="section" id="services">
                  <Services
                    scrollTween={scrollTween}
                    isMobile={isMobile}
                    windowWidth={windowWidth}
                    windowHeight={windowHeight}
                  />
                </div>

                <div className="section" id="portfolio">
                  <DndProvider backend={HTML5Backend}>
                    <Portfolio scrollTween={scrollTween} />
                  </DndProvider>
                </div>

                <div className="section" id="contacts">
                  <Contacts scrollTween={scrollTween} />
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
          {isMobile && (
            <Route path="/project/:id" element={<ProjectSectionMobile />} />
          )}
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
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/cookie-policy" element={<CookiePolicy />} />
        </Routes>
      </div>
      <CookieNotice />
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
  const { isTouch } = useInputMode?.() ?? { isTouch: true }; // se non hai l'hook, metti true
  useDisableZoom({ enable: isTouch }); // attiva solo su mobile/tablet

  return (
    <Router>
      <ScrollToTopOnRouteChange />
      <div className={`app-wrapper ${isDark ? "dark-theme" : "light-theme"}`}>
        <AppContent
          isDark={isDark}
          setIsDark={setIsDark}
          scrollContainerRef={scrollContainerRef}
        />
      </div>
    </Router>
  );
}

export default App;
