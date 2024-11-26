// Services.jsx
import { useRef, useLayoutEffect } from "react";
import "./Services.css";
import { mergeRefs } from "react-merge-refs";
import PropTypes from "prop-types";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const Services = ({ scrollTween }) => {
  const servicesRef = useRef(null);
  const lineRef = useRef(null);

  const macroAreasRef = useRef(null);
  const brandingRef = useRef(null);
  const socialRef = useRef(null);
  const photoRef = useRef(null);
  const videoRef = useRef(null);
  const webRef = useRef(null);
  const applicationRef = useRef(null);
  const brandingListRef = useRef(null);
  const socialListRef = useRef(null);
  const photoListRef = useRef(null);
  const videoListRef = useRef(null);
  const webListRef = useRef(null);
  const applicationListRef = useRef(null);
  const servicesSectionRef = useRef(null);

  // Animazioni esistenti per la linea e il testo "services-text"
  useLayoutEffect(() => {
    let ctx = gsap.context(() => {
      const servicesElem = servicesRef.current;

      // Animazione per la linea orizzontale
      const lineElem = lineRef.current;
      const servicesWidth = servicesElem.scrollWidth;

      gsap.to(lineElem, {
        width: `${servicesWidth}px`,
        ease: "none",
        scrollTrigger: {
          trigger: servicesElem,
          start: "top top",
          end: "bottom top",
          scrub: true,
        },
      });

      // Animazione per 'services-text'
      const servicesText = servicesElem.querySelector(".services-text");
      if (servicesText) {
        gsap.to(servicesText, {
          yPercent: 350,
          ease: "none",
          duration: 0.5,
          scrollTrigger: {
            trigger: servicesElem,
            start: "top top",
            end: "bottom top",
            scrub: 2,
          },
        });
      }
    }, servicesRef);

    return () => ctx.revert();
  }, []);

  // Animazioni per i servizi
  useLayoutEffect(() => {
    if (!scrollTween) return;

    let ctx = gsap.context(() => {
      const q = gsap.utils.selector(servicesRef.current);

      // Animazioni per ciascuna macroarea e servizi associati
      const macroAreas = [
        { ref: brandingRef, listRef: brandingListRef, className: ".branding-list li" },
        { ref: socialRef, listRef: socialListRef, className: ".social-list li" },
        { ref: photoRef, listRef: photoListRef, className: ".photo-list li" },
        { ref: videoRef, listRef: videoListRef, className: ".video-list li" },
        { ref: webRef, listRef: webListRef, className: ".web-list li" },
        { ref: applicationRef, listRef: applicationListRef, className: ".application-list li" },
      ];

      macroAreas.forEach(({ ref, listRef, className }) => {
        // Animazioni di entrata per i servizi
        gsap.to(q(className), {
          opacity: 1,
          y: 0,
          duration: 0.6,
          stagger: 0.2,
          scrollTrigger: {
            trigger: ref.current,
            containerAnimation: scrollTween,
            start: "left center",
            toggleActions: "play none none reverse",
          },
        });

        // Movimento dei servizi da punto A a B
        gsap.to(listRef.current, {
          x: () => ref.current.offsetWidth - listRef.current.offsetWidth,
          ease: "none",
          scrollTrigger: {
            trigger: ref.current,
            start: "left center",
            end: "right center",
            scrub: true,
            containerAnimation: scrollTween,
          },
        });
      });
    }, servicesRef);

    return () => ctx.revert();
  }, [scrollTween]);

  return (
    <div className="services-section" ref={servicesRef}>
      <div className="chi-siamo">
        <div className="services-text">
          Ci mettiamo meno tempo a farlo che a spiegartelo.
        </div>
      </div>
      <div className="services-content">
        <div className="intro">
          <p>
            Più il progetto è ambizioso, più grande è la sfida – ed è proprio lì
            che ci piace stare, sempre pronti a superare i nostri limiti. Hai un
            progetto? Noi siamo già al lavoro.
          </p>
        </div>
        <div className="horizontal-line" ref={lineRef}></div>
      </div>
      {/* Sezione Servizi */}
      <section className="services-list-section">
        {/* Macroaree */}
        <div
          className="macro-areas"
          ref={mergeRefs([macroAreasRef, servicesSectionRef])}
        >
          <div className="branding macroarea" ref={brandingRef}>
            <h2>BRANDING</h2>
            <ul className="branding-list services-list" ref={brandingListRef}>
              {["Logo", "Brand Identity", "Naming Strategy", "Rebranding", "Packaging Design"].map(
                (service, idx) => (
                  <li key={idx}>{service}</li>
                )
              )}
            </ul>
          </div>
          <div className="social macroarea" ref={socialRef}>
            <h2>SOCIAL</h2>
            <ul className="social-list services-list" ref={socialListRef}>
              {[
                "Social Media Strategy",
                "Campaign Management",
                "Content Creation",
                "Analytics and Reporting",
                "Community Engagement",
              ].map((service, idx) => (
                <li key={idx}>{service}</li>
              ))}
            </ul>
          </div>
          <div className="photo macroarea" ref={photoRef}>
            <h2>PHOTO</h2>
            <ul className="photo-list services-list" ref={photoListRef}>
              {[
                "Concept",
                "Brand Imagery",
                "Event Shoots",
                "Lifestyle Visuals",
                "Post-Production",
              ].map((service, idx) => (
                <li key={idx}>{service}</li>
              ))}
            </ul>
          </div>
          <div className="video macroarea" ref={videoRef}>
            <h2>VIDEO</h2>
            <ul className="video-list services-list" ref={videoListRef}>
              {[
                "Brand Storytelling",
                "3D Motion Graphics",
                "Content Series",
                "Drone Footage",
                "Video Editing",
              ].map((service, idx) => (
                <li key={idx}>{service}</li>
              ))}
            </ul>
          </div>
          <div className="web macroarea" ref={webRef}>
            <h2>WEB</h2>
            <ul className="web-list services-list" ref={webListRef}>
              {[
                "UX/UI Design",
                "E-Commerce",
                "CMS Integration",
                "Website Maintenance",
                "Web Accessibility",
              ].map((service, idx) => (
                <li key={idx}>{service}</li>
              ))}
            </ul>
          </div>
          <div className="application macroarea" ref={applicationRef}>
            <h2>APP</h2>
            <ul className="application-list services-list" ref={applicationListRef}>
              {[
                "Concept Development",
                "Cross-Platform Solutions",
                "User-Centric Design",
                "Performance Optimization",
                "App Launch Strategy",
              ].map((service, idx) => (
                <li key={idx}>{service}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
};

Services.propTypes = {
  scrollTween: PropTypes.object.isRequired,
};

export default Services;
