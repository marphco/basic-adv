import { useRef, useLayoutEffect } from "react";
import "./AboutUs.css";
import { mergeRefs } from "react-merge-refs";
import PropTypes from "prop-types";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const AboutUs = ({ scrollTween }) => {
  const aboutUsRef = useRef(null);
  const lineRef = useRef(null);
  // const iconsRef = useRef([]);

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

  // Animazioni esistenti per la linea e il testo "chi-siamo-text"
  useLayoutEffect(() => {
    let ctx = gsap.context(() => {
      const aboutUsElem = aboutUsRef.current;

      // Animazione per la linea orizzontale
      const lineElem = lineRef.current;
      const aboutUsWidth = aboutUsElem.scrollWidth;

      gsap.to(lineElem, {
        width: `${aboutUsWidth}px`,
        ease: "none",
        scrollTrigger: {
          trigger: aboutUsElem,
          start: "top top",
          end: "bottom top",
          scrub: true,
          // Rimuoviamo containerAnimation
        },
      });

      // Animazione per 'chi-siamo-text'
      const chiSiamoText = aboutUsElem.querySelector(".chi-siamo-text");
      if (chiSiamoText) {
        gsap.to(chiSiamoText, {
          yPercent: 400,
          ease: "none",
          duration: 0.5,
          scrollTrigger: {
            trigger: aboutUsElem,
            start: "top top",
            end: "bottom top",
            scrub: 2,
            // Rimuoviamo containerAnimation
          },
        });
      }
    }, aboutUsRef);

    return () => ctx.revert();
  }, []);

  // Animazioni per i servizi
  useLayoutEffect(() => {
    if (!scrollTween) return;

    let ctx = gsap.context(() => {
      const q = gsap.utils.selector(aboutUsRef.current);

      // Animazioni di entrata per i servizi "BRANDING"
      gsap.to(q(".branding-list li"), {
        opacity: 1,
        y: 0,
        duration: 0.6,
        stagger: 0.2,
        scrollTrigger: {
          trigger: brandingRef.current,
          containerAnimation: scrollTween,
          start: "left center",
          toggleActions: "play none none reverse",
        },
      });

      // Movimento dei servizi "BRANDING" da punto A a B
      gsap.to(brandingListRef.current, {
        x: () =>
          brandingRef.current.offsetWidth - brandingListRef.current.offsetWidth,
        ease: "none",
        scrollTrigger: {
          trigger: brandingRef.current,
          start: "left center",
          end: "right center",
          scrub: true,
          containerAnimation: scrollTween,
        },
      });

      // Animazioni di entrata per i servizi "SOCIAL"
      gsap.to(q(".social-list li"), {
        opacity: 1,
        y: 0,
        duration: 0.6,
        stagger: 0.2,
        scrollTrigger: {
          trigger: socialRef.current,
          containerAnimation: scrollTween,
          start: "left center",
          toggleActions: "play none none reverse",
        },
      });

      // Movimento dei servizi "SOCIAL" da punto A a B
      gsap.to(socialListRef.current, {
        x: () =>
          socialRef.current.offsetWidth - socialListRef.current.offsetWidth,
        ease: "none",
        scrollTrigger: {
          trigger: socialRef.current,
          start: "left center",
          end: "right center",
          scrub: true,
          containerAnimation: scrollTween,
        },
      });

      // Animazioni di entrata per i servizi "PHOTO"
      gsap.to(q(".photo-list li"), {
        opacity: 1,
        y: 0,
        duration: 0.6,
        stagger: 0.2,
        scrollTrigger: {
          trigger: photoRef.current,
          containerAnimation: scrollTween,
          start: "left center",
          toggleActions: "play none none reverse",
        },
      });

      // Movimento dei servizi "PHOTO" da punto A a B
      gsap.to(photoListRef.current, {
        x: () =>
          photoRef.current.offsetWidth - photoListRef.current.offsetWidth,
        ease: "none",
        scrollTrigger: {
          trigger: photoRef.current,
          start: "left center",
          end: "right center",
          scrub: true,
          containerAnimation: scrollTween,
        },
      });

      // Animazioni di entrata per i servizi "VIDEO"
      gsap.to(q(".video-list li"), {
        opacity: 1,
        y: 0,
        duration: 0.6,
        stagger: 0.2,
        scrollTrigger: {
          trigger: videoRef.current,
          containerAnimation: scrollTween,
          start: "left center",
          toggleActions: "play none none reverse",
        },
      });

      // Movimento dei servizi "VIDEO" da punto A a B
      gsap.to(videoListRef.current, {
        x: () =>
          videoRef.current.offsetWidth - videoListRef.current.offsetWidth,
        ease: "none",
        scrollTrigger: {
          trigger: videoRef.current,
          start: "left center",
          end: "right center",
          scrub: true,
          containerAnimation: scrollTween,
        },
      });

      // Animazioni di entrata per i servizi "WEB"
      gsap.to(q(".web-list li"), {
        opacity: 1,
        y: 0,
        duration: 0.6,
        stagger: 0.2,
        scrollTrigger: {
          trigger: webRef.current,
          containerAnimation: scrollTween,
          start: "left center",
          toggleActions: "play none none reverse",
        },
      });

      // Movimento dei servizi "WEB" da punto A a B
      gsap.to(webListRef.current, {
        x: () =>
          webRef.current.offsetWidth - webListRef.current.offsetWidth,
        ease: "none",
        scrollTrigger: {
          trigger: webRef.current,
          start: "left center",
          end: "right center",
          scrub: true,
          containerAnimation: scrollTween,
        },
      });

      // Animazioni di entrata per i servizi "APP"
      gsap.to(q(".application-list li"), {
        opacity: 1,
        y: 0,
        duration: 0.6,
        stagger: 0.2,
        scrollTrigger: {
          trigger: applicationRef.current,
          containerAnimation: scrollTween,
          start: "left center",
          toggleActions: "play none none reverse",
        },
      });

      // Movimento dei servizi "APP" da punto A a B
      gsap.to(applicationListRef.current, {
        x: () =>
          applicationRef.current.offsetWidth - applicationListRef.current.offsetWidth,
        ease: "none",
        scrollTrigger: {
          trigger: applicationRef.current,
          start: "left center",
          end: "right center",
          scrub: true,
          containerAnimation: scrollTween,
        },
      });
    }, aboutUsRef);
    

    return () => ctx.revert();
  }, [scrollTween]);

  return (
    <div className="aboutus-section" ref={aboutUsRef}>
      <div className="chi-siamo">
        <div className="chi-siamo-text">
          Ci mettiamo meno tempo a farlo che a spiegartelo.
        </div>
      </div>
      <div className="aboutus-content">
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
      <section className="services-section">
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

AboutUs.propTypes = {
  scrollTween: PropTypes.object.isRequired,
};

export default AboutUs;