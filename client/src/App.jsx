import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useEffect, useState } from 'react';
import useLocalStorage from 'use-local-storage';
import './App.css';
import { Cursor } from './components/cursor/Cursor';
import Home from './components/home/Home';
// import AboutUs from './components/about-us/AboutUs';
// import Portfolio from './components/portfolio/Portfolio';
import Contacts from './components/contacts/Contacts';
// import Dashboard from './components/dashboard/Dashboard';
import Navbar from './components/navbar/Navbar';

function App() {
  const preference = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const [isDark, setIsDark] = useLocalStorage('isDark', preference);
  const [showForm, setShowForm] = useState(false); // State to control form visibility

  const handleClick = () => {
    setShowForm(true); // Show the form when the button is clicked
  };

  const handleRestart = () => {
    setShowForm(false); // Hide the form and show the "Get in Touch!" button
  };

  useEffect(() => {
    // Aggiungi una classe al body
    document.body.classList.add('no-default-cursor');

    // Cleanup: rimuovi la classe quando il componente viene smontato
    return () => {
      document.body.classList.remove('no-default-cursor');
    };
  }, []);

  return (
    <Router>
      <Cursor isDark={isDark} />
      <div className="App" data-theme={isDark ? 'dark' : 'light'}>
        <Navbar isDark={isDark} setIsDark={setIsDark} /> {/* Passa le props */}
        <Routes>
          <Route path="/" element={<Home />} />
          {/* <Route path="/about-us" element={<AboutUs />} />
          <Route path="/portfolio" element={<Portfolio />} /> */}
          <Route path="/contatti" element={<Contacts />} /> 
          {/* <Route path="/dashboard" element={<Dashboard />} /> */}
        </Routes>
      </div>
    </Router>
  );
}

export default App;