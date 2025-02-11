import { useState } from 'react';
import { Link } from 'react-router-dom';
import './Navbar.css';
import Toggle from '../toggle/Toggle';
import PropTypes from 'prop-types';
import classNames from 'classnames';

const Navbar = ({ isDark, setIsDark, openAboutUs }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleToggleChange = () => {
    setIsDark(!isDark);
  };

  const toggleMenu = () => {
    if (isMenuOpen) {
      // Aggiungi l'animazione in uscita per le voci del menu prima di chiuderlo
      document.querySelectorAll('.navbar-menu li').forEach((item) => {
        item.classList.add('close');
      });

      // Aspetta la fine dell'animazione prima di nascondere il menu
      setTimeout(() => {
        setIsMenuOpen(false);
      }, 400); // Durata dell'animazione in uscita (400ms)
    } else {
      // Rimuovi la classe di uscita quando si apre il menu di nuovo
      document.querySelectorAll('.navbar-menu li').forEach((item) => {
        item.classList.remove('close');
      });
      setIsMenuOpen(true);
    }
  };

  // const handleAboutUsClick = (e) => {
  //   e.preventDefault(); // Previene la navigazione
  //   openAboutUs(); // Apre l'Overlay
  //   setIsMenuOpen(false); // Chiude il menu se aperto
  // };

  return (
    <div className="navbar-block">
      <nav className={classNames('navbar', { 'dark-mode': isDark })}>
        <div className="hamburger-menu" onClick={toggleMenu}>
          <div className={classNames('hamburger', { open: isMenuOpen, 'dark-mode': isDark })}></div>
          <div className={classNames('hamburger', { open: isMenuOpen, 'dark-mode': isDark })}></div>
        </div>
        <ul className={classNames('navbar-menu', { open: isMenuOpen })}>
          <li>
            <Link to="/" onClick={() => setIsMenuOpen(false)}>HOME</Link>
          </li>
          <li>
  <a href="#" onClick={e => {
    e.preventDefault();
    openAboutUs();
    setIsMenuOpen(false); // Chiude il menu
  }}>ABOUT US</a>
</li>
          <li>
            <Link to="/portfolio" onClick={() => setIsMenuOpen(false)}>PORTFOLIO</Link>
          </li>
          <li>
            <Link to="/contatti" onClick={() => setIsMenuOpen(false)}>CONTACTS</Link>
          </li>
        </ul>
        <Toggle isChecked={isDark} handleChange={handleToggleChange} />
      </nav>
    </div>
  );
};

Navbar.propTypes = {
  isDark: PropTypes.bool.isRequired,
  setIsDark: PropTypes.func.isRequired,
  openAboutUs: PropTypes.func.isRequired, // Definisci PropTypes per openAboutUs
};

export default Navbar;
