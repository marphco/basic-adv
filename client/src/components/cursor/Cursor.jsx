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

  const initializeCursor = () => {
    const dot = dotRef.current;
    const circle = circleRef.current;

    if (!dot || !circle) return;

    dot.style.visibility = 'visible';
    circle.style.visibility = 'visible';

    const moveCursor = (e) => {
      mouseX.current = e.clientX;
      mouseY.current = e.clientY;
      dot.style.left = `${mouseX.current}px`;
      dot.style.top = `${mouseY.current}px`;
    };

    const animateCircle = () => {
      circleX.current += (mouseX.current - circleX.current) * 0.12;
      circleY.current += (mouseY.current - circleY.current) * 0.12;
      circle.style.left = `${circleX.current}px`;
      circle.style.top = `${circleY.current}px`;
      requestAnimationFrame(animateCircle);
    };

    const addHoverClass = () => {
      dot.classList.add('hovered');
      circle.classList.add('hovered');
    };

    const removeHoverClass = () => {
      dot.classList.remove('hovered');
      circle.classList.remove('hovered');
    };

    const handlePointerEnter = (e) => {
      if (e.target && typeof e.target.closest === 'function') {
        const target = e.target.closest(
          'a, button, label, [role="button"], [onClick], input, textarea, select'
        );
        if (target) {
          if (target.tagName === 'INPUT') {
            const inputType = target.getAttribute('type');
            if (
              inputType === 'text' ||
              inputType === 'email' ||
              inputType === 'tel' ||
              inputType === 'password'
            ) {
              dot.classList.add('hidden');
              circle.classList.add('hidden');
            } else if (inputType === 'checkbox' || inputType === 'radio') {
              addHoverClass();
            }
          } else if (target.tagName === 'TEXTAREA') {
            dot.classList.add('hidden');
            circle.classList.add('hidden');
          } else {
            addHoverClass();
          }
        }
      }
    };

    const handlePointerLeave = (e) => {
      if (e.target && typeof e.target.closest === 'function') {
        const target = e.target.closest(
          'a, button, label, [role="button"], [onClick], input, textarea, select'
        );
        if (target) {
          if (target.tagName === 'INPUT') {
            const inputType = target.getAttribute('type');
            if (
              inputType === 'text' ||
              inputType === 'email' ||
              inputType === 'tel' ||
              inputType === 'password'
            ) {
              dot.classList.remove('hidden');
              circle.classList.remove('hidden');
            } else if (inputType === 'checkbox' || inputType === 'radio') {
              removeHoverClass();
            }
          } else if (target.tagName === 'TEXTAREA') {
            dot.classList.remove('hidden');
            circle.classList.remove('hidden');
          } else {
            removeHoverClass();
          }
        }
      }
    };

    const handleMouseDown = () => {
      if (!dot.classList.contains('clicked')) {
        dot.classList.add('clicked');
      }
    };

    const handleMouseUp = () => {
      if (dot.classList.contains('clicked')) {
        dot.classList.remove('clicked');
      }
      // Rimuovi .hovered dopo il rilascio del clic
      removeHoverClass();
    };

    document.addEventListener('mousemove', moveCursor);
    document.addEventListener('pointerenter', handlePointerEnter, true);
    document.addEventListener('pointerleave', handlePointerLeave, true);
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mouseup', handleMouseUp);

    animateCircle();

    return () => {
      document.removeEventListener('mousemove', moveCursor);
      document.removeEventListener('pointerenter', handlePointerEnter, true);
      document.removeEventListener('pointerleave', handlePointerLeave, true);
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  };

  useEffect(() => {
    const isMobile = window.innerWidth <= 768;
    if (isMobile) return;

    const cleanup = initializeCursor();

    const handleVisibilityChange = () => {
      if (!document.hidden && dotRef.current && circleRef.current) {
        dotRef.current.style.visibility = 'visible';
        circleRef.current.style.visibility = 'visible';
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (cleanup) cleanup();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

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