// src/App.jsx
import { useEffect, useRef } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import useLocalStorage from 'use-local-storage';
import './App.css';
import { Cursor } from './components/cursor/Cursor';
import Navbar from './components/navbar/Navbar';
import Home from './components/home/Home';
import AboutUs from './components/about-us/AboutUs';
import Contacts from './components/contacts/Contacts';

function App() {
  const preference = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const [isDark, setIsDark] = useLocalStorage('isDark', preference);

  const scrollContainerRef = useRef(null);
  const scrollPositionRef = useRef(0);
  const targetScrollPositionRef = useRef(0);
  const isScrollingRef = useRef(false);

  useEffect(() => {
    const handleWheel = (event) => {
      event.preventDefault();

      const container = scrollContainerRef.current;
      if (!container) return;

      const maxScroll = container.scrollWidth - container.clientWidth;

      // Incrementa o decrementa la posizione di scroll con sensibilità aumentata
      const scrollAmount = event.deltaY * 1.5; // Aumenta la sensibilità
      targetScrollPositionRef.current += scrollAmount;

      // Limita la posizione di scroll entro i limiti validi
      targetScrollPositionRef.current = Math.max(0, Math.min(targetScrollPositionRef.current, maxScroll));

      // Log delle informazioni dello scroll
      console.log('--- Wheel Event ---');
      console.log('DeltaY:', event.deltaY);
      console.log('Scroll Amount:', scrollAmount);
      console.log('Updated Target Scroll:', targetScrollPositionRef.current);
      console.log('Max Scroll:', maxScroll);

      // Log delle dimensioni del contenitore
      console.log('Container ScrollWidth:', container.scrollWidth);
      console.log('Container ClientWidth:', container.clientWidth);

      // Avvia l'animazione di scroll se non è già in corso
      if (!isScrollingRef.current) {
        isScrollingRef.current = true;
        requestAnimationFrame(smoothScroll);
      }
    };

    const smoothScroll = () => {
      const container = scrollContainerRef.current;
      if (!container) {
        isScrollingRef.current = false;
        return;
      }

      const currentPosition = container.scrollLeft;
      const targetPosition = targetScrollPositionRef.current;

      // Calcola la distanza e applica l'interpolazione
      const distance = (targetPosition - currentPosition) * .2; // Aumentato a 0.2 per maggiore fluidità

      // Log delle informazioni dello smooth scroll
      console.log('--- Smooth Scroll ---');
      console.log('Current Position:', currentPosition);
      console.log('Target Position:', targetPosition);
      console.log('Distance:', distance);

      // Se il movimento è significativo, continuiamo l'animazione
      if (Math.abs(distance) > .5) { // Aumentato la soglia a 1
        container.scrollLeft += distance;
        scrollPositionRef.current = container.scrollLeft; // Aggiorna la posizione corrente
        requestAnimationFrame(smoothScroll); // Continua a chiamare l'animazione
      } else {
        // Quando l'animazione è completata, fermiamo lo scroll
        container.scrollLeft = targetPosition;
        scrollPositionRef.current = targetPosition;
        isScrollingRef.current = false;
        console.log('--- Scroll Animation Completed ---');
      }
    };

    // Inizializza le posizioni di scroll al montaggio del componente
    const container = scrollContainerRef.current;
    if (container) {
      scrollPositionRef.current = container.scrollLeft;
      targetScrollPositionRef.current = container.scrollLeft;
      console.log('Initial Scroll Position:', container.scrollLeft);
      console.log('Container ScrollWidth:', container.scrollWidth);
      console.log('Container ClientWidth:', container.clientWidth);
    }

    window.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      window.removeEventListener('wheel', handleWheel);
    };
  }, []);

  useEffect(() => {
    // Aggiunge la classe per il cursore personalizzato
    document.body.classList.add('no-default-cursor');
    return () => {
      document.body.classList.remove('no-default-cursor');
    };
  }, []);

  return (
    <Router>
      <Cursor isDark={isDark} />
      <div className="scroll-wrapper" ref={scrollContainerRef}>
        <div className="App" data-theme={isDark ? 'dark' : 'light'}>
          <Navbar isDark={isDark} setIsDark={setIsDark} />
          <div className="section"><Home /></div>
          <div className="section"><AboutUs /></div>
          <div className="section"><Contacts /></div>
        </div>
      </div>
    </Router>
  );
}

export default App;
