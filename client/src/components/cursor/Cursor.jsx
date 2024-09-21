import { useEffect } from 'react';
import PropTypes from 'prop-types';
import './Cursor.css';

export const Cursor = ({ isDark }) => {
    useEffect(() => {
      const dot = document.querySelector('.custom-cursor-dot');
      const circle = document.querySelector('.custom-cursor-circle');
  
      let mouseX = 0;
      let mouseY = 0;
      let circleX = 0;
      let circleY = 0;
      const speed = 0.15;
  
      const moveCursor = (e) => {
        mouseX = e.pageX;
        mouseY = e.pageY;
  
        dot.style.left = `${mouseX}px`;
        dot.style.top = `${mouseY}px`;
      };
  
      const animateCircle = () => {
        circleX += (mouseX - circleX) * speed;
        circleY += (mouseY - circleY) * speed;
  
        circle.style.left = `${circleX}px`;
        circle.style.top = `${circleY}px`;
  
        requestAnimationFrame(animateCircle);
      };
  
      const clickableElements = document.querySelectorAll('a, button, label, [role="button"], [onClick]');
  
      clickableElements.forEach((el) => {
        el.addEventListener('mouseenter', () => {
          dot.classList.add('hovered');
          circle.classList.add('hovered');
        });
  
        el.addEventListener('mouseleave', () => {
          dot.classList.remove('hovered');
          circle.classList.remove('hovered');
        });
      });
  
      document.addEventListener('mousemove', moveCursor);
      animateCircle();
  
      // Cleanup event listeners
      return () => {
        document.removeEventListener('mousemove', moveCursor);
        clickableElements.forEach((el) => {
          el.removeEventListener('mouseenter', () => {});
          el.removeEventListener('mouseleave', () => {});
        });
      };
    }, []);
  
    return (
      <>
        <div className={`custom-cursor-dot ${isDark ? 'cursor-white' : 'cursor-black'}`}></div>
        <div className={`custom-cursor-circle ${isDark ? 'cursor-white' : 'cursor-black'}`}></div>
      </>
    );
  };

Cursor.propTypes = {
    isDark: PropTypes.bool.isRequired
}