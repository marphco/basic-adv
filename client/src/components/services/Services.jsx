// Services.jsx
import { useRef, useLayoutEffect } from "react";
import "./Services.css";
import { mergeRefs } from "react-merge-refs";
import PropTypes from "prop-types";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Trans, useTranslation } from "react-i18next";

gsap.registerPlugin(ScrollTrigger);

  ScrollTrigger.config({ ignoreMobileResize: true });


const Services = ({
  scrollTween = null,
  isMobile,
  windowWidth,
  // windowHeight,
}) => {
  const servicesRef = useRef(null);
  const lineRef = useRef(null);
  const { t } = useTranslation(["common"]);

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

  // Animazione della linea e di services-text
  useLayoutEffect(() => {
    const servicesElem = servicesRef.current;
    const lineElem = lineRef.current;

    gsap.set(lineElem, { willChange: "transform" });

    if (!servicesElem || !lineElem) return;

    // Creazione di un nuovo contesto per gestire le animazioni
    let ctx = gsap.context(() => {
      // reset dimensioni “reali” e usa scale per l’animazione
      if (isMobile) {
        gsap.set(lineElem, {
          clearProps: "width",
          height: "100%",
          scaleY: 0,
          transformOrigin: "top center",
        });
      } else {
        gsap.set(lineElem, {
          clearProps: "height",
          width: "100%",
          scaleX: 0,
          transformOrigin: "left center",
        });
      }

      if (isMobile) {
  // evita duplicati se l'effetto rientra
  ScrollTrigger.getById("services-line-mobile")?.kill();

  gsap.to(lineElem, {
    id: "services-line-mobile",          // <— assegna SEMPRE un id
    scaleY: 12,
    ease: "none",
    force3D: true,
    scrollTrigger: {
      id: "services-line-mobile",        // <— stesso id sul trigger
      trigger: servicesElem,
      start: "top bottom",
      end: "bottom top",
      scrub: true,
      invalidateOnRefresh: true,
      refreshPriority: 2,
    },
  });
} else {
  // --- DESKTOP: LINEA ---
  ScrollTrigger.getById("services-line-desktop")?.kill();

  gsap.to(lineElem, {
    id: "services-line-desktop",
    scaleX: 22,
    ease: "none",
    scrollTrigger: {
      id: "services-line-desktop",
      trigger: servicesElem,
      containerAnimation: scrollTween,
      start: "left right",
      end: "right left",
      scrub: true,
      invalidateOnRefresh: true,
    },
  });
}

      // Animazione per 'services-text'
      const servicesText = servicesElem.querySelector(".services-text");
if (servicesText) {
  if (isMobile) {
    ScrollTrigger.getById("services-text-mobile")?.kill();

    gsap.set(servicesText, { x: "50vw", willChange: "transform" });
    gsap.to(servicesText, {
      id: "services-text-mobile",
      x: -250,
      ease: "none",
      force3D: true,
      scrollTrigger: {
        id: "services-text-mobile",
        trigger: servicesText,
        start: "top 100%",
        end: "top 20%",
        scrub: true,
        invalidateOnRefresh: true,
        refreshPriority: 2,
      },
    });
  } else {
    ScrollTrigger.getById("services-text-desktop")?.kill();

    gsap.to(servicesText, {
      id: "services-text-desktop",
      yPercent: 400,
      ease: "none",
      scrollTrigger: {
        id: "services-text-desktop",
        trigger: servicesElem,
        containerAnimation: scrollTween,
        start: "left right",
        end: "right center",
        scrub: 2,
        invalidateOnRefresh: true,
      },
    });
  }
}

    }, servicesRef);

    return () => ctx.revert();
}, [isMobile, windowWidth, scrollTween]);

  // Animazioni per i servizi
  useLayoutEffect(() => {
    if (!isMobile && !scrollTween) return;

    let ctx = gsap.context(() => {
      const q = gsap.utils.selector(servicesRef.current);

      // Animazioni per ciascuna macroarea e servizi associati
      const macroAreas = [
        {
          ref: brandingRef,
          listRef: brandingListRef,
          className: ".branding-list li",
        },
        {
          ref: socialRef,
          listRef: socialListRef,
          className: ".social-list li",
        },
        { ref: photoRef, listRef: photoListRef, className: ".photo-list li" },
        { ref: videoRef, listRef: videoListRef, className: ".video-list li" },
        { ref: webRef, listRef: webListRef, className: ".web-list li" },
        {
          ref: applicationRef,
          listRef: applicationListRef,
          className: ".application-list li",
        },
      ];

      if (isMobile) {
        // Animazioni su mobile
        macroAreas.forEach(({ ref, className }) => {
          gsap.to(q(className), {
            opacity: 1,
            x: 0,
            duration: 0.6,
            stagger: 0.1,
            ease: "power2.out",
            scrollTrigger: {
              trigger: ref.current,
              start: "top 50%",
              toggleActions: "play none none reverse",
              invalidateOnRefresh: true,
            },
          });
        });
      } else {
        // Animazioni su desktop
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
              invalidateOnRefresh: true,
              markers: false,
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
              invalidateOnRefresh: true,
            },
          });
        });
      }
    }, servicesRef);

    return () => ctx.revert();
  }, [scrollTween, isMobile]);

  return (
    <div className="services-section" ref={servicesRef}>
      <div className="chi-siamo">
        <div className="services-text">{t("services.ribbon")}</div>
      </div>

      <div className="services-content">
        <div className="intro">
          <p>
            <Trans
              i18nKey="services.intro"
              ns="common"
              components={{
                1: <br />,
                2: <span />,
              }}
            />
          </p>
        </div>
        <div className="horizontal-line" ref={lineRef}></div>
      </div>

      {/* Sezione Servizi */}
      <section className="services-list-section">
        <div
          className="macro-areas"
          ref={mergeRefs([macroAreasRef, servicesSectionRef])}
        >
          {/* BRANDING */}
          <div className="branding macroarea" ref={brandingRef}>
            <h2>{t("services.groups.branding.title")}</h2>
            <ul className="branding-list services-list" ref={brandingListRef}>
              {t("services.groups.branding.items", { returnObjects: true }).map(
                (s, i) => (
                  <li key={i}>{s}</li>
                )
              )}
            </ul>
          </div>

          {/* SOCIAL */}
          <div className="social macroarea" ref={socialRef}>
            <h2>{t("services.groups.social.title")}</h2>
            <ul className="social-list services-list" ref={socialListRef}>
              {t("services.groups.social.items", { returnObjects: true }).map(
                (s, i) => (
                  <li key={i}>{s}</li>
                )
              )}
            </ul>
          </div>

          {/* PHOTO */}
          <div className="photo macroarea" ref={photoRef}>
            <h2>{t("services.groups.photo.title")}</h2>
            <ul className="photo-list services-list" ref={photoListRef}>
              {t("services.groups.photo.items", { returnObjects: true }).map(
                (s, i) => (
                  <li key={i}>{s}</li>
                )
              )}
            </ul>
          </div>

          {/* VIDEO */}
          <div className="video macroarea" ref={videoRef}>
            <h2>{t("services.groups.video.title")}</h2>
            <ul className="video-list services-list" ref={videoListRef}>
              {t("services.groups.video.items", { returnObjects: true }).map(
                (s, i) => (
                  <li key={i}>{s}</li>
                )
              )}
            </ul>
          </div>

          {/* WEB */}
          <div className="web macroarea" ref={webRef}>
            <h2>{t("services.groups.web.title")}</h2>
            <ul className="web-list services-list" ref={webListRef}>
              {t("services.groups.web.items", { returnObjects: true }).map(
                (s, i) => (
                  <li key={i}>{s}</li>
                )
              )}
            </ul>
          </div>

          {/* APP */}
          <div className="application macroarea" ref={applicationRef}>
            <h2>{t("services.groups.app.title")}</h2>
            <ul
              className="application-list services-list"
              ref={applicationListRef}
            >
              {t("services.groups.app.items", { returnObjects: true }).map(
                (s, i) => (
                  <li key={i}>{s}</li>
                )
              )}
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
};

Services.propTypes = {
  scrollTween: PropTypes.object,
  isMobile: PropTypes.bool.isRequired,
  windowWidth: PropTypes.number.isRequired,
  windowHeight: PropTypes.number.isRequired,
};

export default Services;
