import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
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
  
  const handleRestart = () => {
    // Puoi implementare questa funzione se necessaria
  };
  
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
        <Navbar isDark={isDark} setIsDark={setIsDark} />
        <Routes>
          <Route path="/" element={<Home />} />
          {/* Altri Routes */}
          <Route path="/contatti" element={<Contacts handleRestart={handleRestart} />} /> 
        </Routes>
      </div>
    </Router>
  );
}


export default App;
