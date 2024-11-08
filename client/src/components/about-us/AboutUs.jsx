import { useRef, useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import './AboutUs.css';
// import img1 from '../../assets/marco.jpg';

gsap.registerPlugin(ScrollTrigger);

const AboutUsDesktop = () => {
  const aboutUsRef = useRef(null);

  useEffect(() => {
    const aboutUsElem = aboutUsRef.current;
    if (!aboutUsElem) {
      console.error('Element not found');
      return;
    }

    // Animazione di scroll per la sezione "chi-siamo"
    gsap.to(".chi-siamo-text", {
      yPercent: 35,
      // color: "black",
      ease: "none",
      scrollTrigger: {
        trigger: ".aboutus-section",
        start: "10%",
        end: "center -20%",
        scrub: true,
        opacity: 1,
        markers: true,
      }
    });
  }, []);

  let verticalSection = document.querySelector('.vertical')


  gsap.to('.vertical', {
    x: () => verticalSection.scrollWidth * -1,
    xPercent: 100,
    scrollTrigger: {
      trigger: '.vertical',
      start: '0',
      end: '+=2000px',
      pin: '#vertical-scoll',
      scrub: true,
      invalidateOnRefresh: true
    }
  });

  return (
    <div className="aboutus-section" ref={aboutUsRef}>
      <div className="chi-siamo vertical">
        <div className='chi-siamo-text'>Ci mettiamo meno tempo a farlo che a spiegartelo.</div>
      </div>
    </div>
  );
};

export default AboutUsDesktop;