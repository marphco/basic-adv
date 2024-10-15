import { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import './Cursor.css';

export const Cursor = ({ isDark }) => {
  const dotRef = useRef(null);
  const circleRef = useRef(null);
  const mouseX = useRef(0);
  const mouseY = useRef(0);
  const circleX = useRef(0);
  const circleY = useRef(0);

  useEffect(() => {
    const dot = dotRef.current;
    const circle = circleRef.current;
    const speed = 0.15;

    const moveCursor = (e) => {
      mouseX.current = e.clientX;
      mouseY.current = e.clientY;

      if (dot) {
        dot.style.left = `${mouseX.current}px`;
        dot.style.top = `${mouseY.current}px`;
      }
    };

    const animateCircle = () => {
      circleX.current += (mouseX.current - circleX.current) * speed;
      circleY.current += (mouseY.current - circleY.current) * speed;

      if (circle) {
        circle.style.left = `${circleX.current}px`;
        circle.style.top = `${circleY.current}px`;
      }

      requestAnimationFrame(animateCircle);
    };

    // Event handlers for hover and click events
    const addHoverClass = () => {
      dot?.classList.add('hovered');
      circle?.classList.add('hovered');
    };

    const removeHoverClass = () => {
      dot?.classList.remove('hovered');
      circle?.classList.remove('hovered');
    };

    const handlePointerEnter = (e) => {
      const target = e.target.closest('a, button, label, [role="button"], [onClick]');
      if (target) {
        addHoverClass();
      }
    };

    const handlePointerLeave = (e) => {
      const target = e.target.closest('a, button, label, [role="button"], [onClick]');
      if (target) {
        removeHoverClass();
      }
    };

    document.addEventListener('mousemove', moveCursor);
    document.addEventListener('pointerenter', handlePointerEnter, true);
    document.addEventListener('pointerleave', handlePointerLeave, true);

    animateCircle();

    return () => {
      document.removeEventListener('mousemove', moveCursor);
      document.removeEventListener('pointerenter', handlePointerEnter, true);
      document.removeEventListener('pointerleave', handlePointerLeave, true);
    };
  }, []); // Effetto eseguito solo al montaggio

  // Aggiorna le classi CSS quando isDark cambia
  useEffect(() => {
    const dot = dotRef.current;
    const circle = circleRef.current;

    if (isDark) {
      dot?.classList.add('cursor-white');
      dot?.classList.remove('cursor-black');
      circle?.classList.add('cursor-white');
      circle?.classList.remove('cursor-black');
    } else {
      dot?.classList.add('cursor-black');
      dot?.classList.remove('cursor-white');
      circle?.classList.add('cursor-black');
      circle?.classList.remove('cursor-white');
    }
  }, [isDark]);

  return (
    <>
      <div ref={dotRef} className="custom-cursor-dot"></div>
      <div ref={circleRef} className="custom-cursor-circle"></div>
    </>
  );
};

Cursor.propTypes = {
  isDark: PropTypes.bool.isRequired,
};
