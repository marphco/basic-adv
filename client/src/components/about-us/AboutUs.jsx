/* eslint-disable react/jsx-key */
import { useRef, useEffect, useState } from "react";
import PropTypes from "prop-types";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useTranslation, Trans } from "react-i18next";
import storica1 from "../../assets/storica1.jpg";
import storica2 from "../../assets/storica2.jpg";
import storica3 from "../../assets/storica3.jpg";
import storica4 from "../../assets/storica4.jpg";
import storica5 from "../../assets/storica5.jpg";
import storica6 from "../../assets/storica6.jpg";
// import marcoImage from "../../assets/marco.jpg";
// import alessioImage from "../../assets/alessio.jpg";
// import giorgiaImage from "../../assets/giorgia.jpg";
import "./AboutUs.css";
import MobileSlider from "./MobileSlider";

gsap.registerPlugin(ScrollTrigger);

export default function AboutUs() {
  const { t } = useTranslation();
  const aboutRef = useRef(null);
  const imagesRef = useRef(null);
  const wallRef = useRef(null);
  const windowSectionRef = useRef(null);

  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "canonical";
    link.href = "https://www.basicadv.com/about-us";
    document.head.appendChild(link);
    return () => document.head.removeChild(link);
  }, []);

  const isTouchLike = () => {
    const byClass = document.body.classList.contains("is-mobile");
    const byPointer = window.matchMedia?.("(pointer: coarse)")?.matches;
    const byUA = /iPad|Android|Tablet/i.test(navigator.userAgent);
    return byClass || byPointer || byUA || window.innerWidth <= 768;
  };

  const [isMobile, setIsMobile] = useState(isTouchLike());

  useEffect(() => {
    const onResize = () => setIsMobile(isTouchLike());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (!isMobile) return;

    const aboutSection = aboutRef.current;
    const imagesContainer = imagesRef.current;
    const wallContent = wallRef.current;
    const windowContent = windowSectionRef.current;

    gsap.set(aboutSection, { clearProps: "all", x: 0, y: 0 });
    if (imagesContainer)
      gsap.set(imagesContainer, { clearProps: "all", x: 0, y: 0 });
    if (wallContent) gsap.set(wallContent, { clearProps: "all" });
    if (windowContent) gsap.set(windowContent, { clearProps: "all" });

    const totalWidth = aboutSection.scrollWidth - window.innerWidth;
    const mobileTl = gsap.timeline({
      scrollTrigger: {
        trigger: aboutSection,
        start: "top top",
        end: "bottom top",
        scrub: true,
        markers: false,
      },
    });

    if (imagesContainer)
      mobileTl.to(
        imagesContainer,
        { x: -totalWidth, ease: "none", duration: 1 },
        0
      );
    if (wallContent)
      mobileTl.to(
        wallContent,
        { backgroundPosition: "10% 70%", ease: "none", duration: 1 },
        0
      );
    if (windowContent)
      mobileTl.to(
        windowContent,
        { backgroundPosition: "90% 10%", ease: "none", duration: 1 },
        0
      );

    return () => {
      if (mobileTl.scrollTrigger) mobileTl.scrollTrigger.kill();
      mobileTl.kill();
    };
  }, [isMobile]);

  // Accordion
  const [activeAccordion, setActiveAccordion] = useState("marco");
  const marcoPanelRef = useRef(null);
  const alessioPanelRef = useRef(null);
  const giorgiaPanelRef = useRef(null);

  useEffect(() => {
    if (marcoPanelRef.current)
      gsap.set(marcoPanelRef.current, {
        xPercent: activeAccordion === "marco" ? 0 : 100,
      });
    if (alessioPanelRef.current)
      gsap.set(alessioPanelRef.current, {
        xPercent: activeAccordion === "alessio" ? 0 : 100,
      });
    if (giorgiaPanelRef.current)
      gsap.set(giorgiaPanelRef.current, {
        xPercent: activeAccordion === "giorgia" ? 0 : 100,
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openPanel = (name) => {
    let panel;
    if (name === "marco") panel = marcoPanelRef.current;
    else if (name === "alessio") panel = alessioPanelRef.current;
    else if (name === "giorgia") panel = giorgiaPanelRef.current;
    if (panel)
      gsap.to(panel, { xPercent: 0, duration: 0.5, ease: "power2.out" });
  };

  const closePanel = (name) => {
    let panel;
    if (name === "marco") panel = marcoPanelRef.current;
    else if (name === "alessio") panel = alessioPanelRef.current;
    else if (name === "giorgia") panel = giorgiaPanelRef.current;
    if (panel)
      gsap.to(panel, { xPercent: 100, duration: 0.5, ease: "power2.in" });
  };

  const toggleAccordion = (name) => {
    if (activeAccordion === name) return;
    if (activeAccordion) closePanel(activeAccordion);
    openPanel(name);
    setActiveAccordion(name);
  };

  if (isMobile) {
    const images = [storica1, storica2, storica3, storica4, storica5, storica6];
    return (
      <section className="aboutus-section" ref={aboutRef}>
        <div className="aboutus-mobile">
          <div className="mobile-slider-wrapper">
            <MobileSlider images={images} />
          </div>

          <div className="aboutus-title">
            <h1>
              <Trans i18nKey="about.mobile.title" components={[<br />]} />
            </h1>
            <p className="aboutus-subtitle">{t("about.mobile.subtitle")}</p>
          </div>
        </div>

        <div className="storia">
          <div className="storia-content">
            <div className="storia-text">
              <h2>
                <Trans
                  i18nKey="about.story.title"
                  components={[<br />, <span className="accent" />]}
                />
              </h2>
              <p>{t("about.story.paragraph1")}</p>
            </div>
          </div>

          <div className="wall">
            <div className="wall-content" ref={wallRef} />
          </div>

          <div
            className={`storia-moderna ${
              window.innerWidth <= 768 ? "mobile-hidden" : ""
            }`}
          >
            <div className="storia-moderna-text">
              <p>{t("about.modern.paragraph1")}</p>
            </div>
          </div>
        </div>

        <div className="window">
          <div className="window-content" ref={windowSectionRef} />
          <div className="window-text">
            <p>{t("about.modern.paragraph2")}</p>
          </div>
        </div>

        <div className="accordion-container">
          <div className="accordion-buttons">
            <button
              className={`accordion-button ${
                activeAccordion === "marco" ? "active" : ""
              }`}
              onClick={() => toggleAccordion("marco")}
            ></button>
            <button
              className={`accordion-button ${
                activeAccordion === "alessio" ? "active" : ""
              }`}
              onClick={() => toggleAccordion("alessio")}
            ></button>
            <button
              className={`accordion-button ${
                activeAccordion === "giorgia" ? "active" : ""
              }`}
              onClick={() => toggleAccordion("giorgia")}
            ></button>
          </div>

          <div className="accordion-panels">
            <div className="accordion-panel" ref={marcoPanelRef}>
              <div className="content-inner">
                <div className="team-left">
                  <div className="team-text">
                    <p>{t("about.team.marco.mobile")}</p>
                  </div>
                  <div className="team-title">
                    <h2>MARCO</h2>
                  </div>
                </div>
                <div className="team-right">{/* optional image */}</div>
              </div>
            </div>

            <div className="accordion-panel" ref={alessioPanelRef}>
              <div className="content-inner">
                <div className="team-left">
                  <div className="team-text">
                    <p>{t("about.team.alessio")}</p>
                  </div>
                  <div className="team-title">
                    <h2>ALESSIO</h2>
                  </div>
                </div>
                <div className="team-right">{/* optional image */}</div>
              </div>
            </div>

            <div className="accordion-panel" ref={giorgiaPanelRef}>
              <div className="content-inner">
                <div className="team-left">
                  <div className="team-text">
                    <p>{t("about.team.giorgia")}</p>
                  </div>
                  <div className="team-title">
                    <h2>GIORGIA</h2>
                  </div>
                </div>
                <div className="team-right">{/* optional image */}</div>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return null;
}

AboutUs.propTypes = {
  overlayRef: PropTypes.shape({ current: PropTypes.instanceOf(Element) }),
  isOpen: PropTypes.bool,
};
