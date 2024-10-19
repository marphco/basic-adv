// src/App.jsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useEffect, useState } from 'react';
import useLocalStorage from 'use-local-storage';
import './App.css';
import { Cursor } from './components/cursor/Cursor';
import Navbar from './components/navbar/Navbar';
import Home from './components/home/Home';
import AboutUs from './components/about-us/AboutUs';
import Contacts from './components/contacts/Contacts';
// import Portfolio from './components/portfolio/Portfolio';
// import Dashboard from './components/dashboard/Dashboard';
// import TransitionOverlay from './components/transition-overlay/TransitionOverlay';

function App() {
  const preference = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const [isDark, setIsDark] = useLocalStorage('isDark', preference);
  
  const [setIsAnimating] = useState(false);
  
  useEffect(() => {
    document.body.classList.add('no-default-cursor');
    return () => {
      document.body.classList.remove('no-default-cursor');
    };
  }, []);

  return (
    <Router>
      <Cursor isDark={isDark} />
      <div className="App" data-theme={isDark ? 'dark' : 'light'}>
        <Navbar isDark={isDark} setIsDark={setIsDark} setIsAnimating={setIsAnimating} />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about-us" element={<AboutUs />} /> 
          <Route path="/contatti" element={<Contacts />} /> 
        </Routes>
      </div>
    </Router>
  );
}

export default App;
