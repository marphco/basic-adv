import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PropTypes from 'prop-types';
import './TransitionOverlay.css';

const TransitionOverlay = ({ isAnimating, onAnimationComplete }) => {
  const slices = 10; // Numero di slice verticali

  useEffect(() => {
    if (!isAnimating) return;
    const timeout = setTimeout(() => {
      onAnimationComplete();
    }, 1000); // Durata dell'animazione in millisecondi
    return () => clearTimeout(timeout);
  }, [isAnimating, onAnimationComplete]);

  return (
    <AnimatePresence>
      {isAnimating && (
        <div className="transition-overlay">
          {Array.from({ length: slices }).map((_, index) => (
            <motion.div
              key={index}
              className="slice"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              exit={{ scaleX: 0 }}
              transition={{
                duration: 1,
                delay: index * 0.05,
                ease: 'easeInOut',
              }}
            />
          ))}
        </div>
      )}
    </AnimatePresence>
  );
};

TransitionOverlay.propTypes = {
  isAnimating: PropTypes.bool.isRequired,  
  onAnimationComplete: PropTypes.func.isRequired,
};

export default TransitionOverlay;
