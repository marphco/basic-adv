// src/App.jsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Row, Container, Button } from 'react-bootstrap';
import { useEffect, useState } from 'react';
import useLocalStorage from 'use-local-storage';
import './App.css';
import { Toggle } from './components/toggle/Toggle';
import { Cursor } from './components/cursor/Cursor';
import DynamicForm from './components/dynamic-form/DynamicForm'; // Presumo che DynamicForm esista
import Home from './components/home/Home';
// import AboutUs from './components/about-us/AboutUs';
// import Portfolio from './components/portfolio/Portfolio';
// import Contact from './components/contacts/Contact'; // Creeremo questo
// import Dashboard from './components/dashboard/Dashboard'; // Creeremo questo
import Navbar from './components/navbar/Navbar'; // Creeremo questo

function App() {
  const preference = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const [isDark, setIsDark] = useLocalStorage('isDark', preference);
  
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
        <Toggle isChecked={isDark} handleChange={() => setIsDark(!isDark)} />
        <Navbar /> {/* Navbar con i link di navigazione */}
        <Routes>
          <Route path="/" element={<Home />} />
          {/* <Route path="/about-us" element={<AboutUs />} />
          <Route path="/portfolio" element={<Portfolio />} />
          <Route path="/contatti" element={<Contact />} />
          <Route path="/dashboard" element={<Dashboard />} /> */}
        </Routes>
      </div>
    </Router>
  );
}

export default App;
