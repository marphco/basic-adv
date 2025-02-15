import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Navbar.css';
import Toggle from '../toggle/Toggle';
import PropTypes from 'prop-types';
import classNames from 'classnames';

const Navbar = ({ isDark, setIsDark, openAboutUs, isMobile }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

  // Se siamo nella route About Us, mostriamo "[CHIUDI]" al posto dell'hamburger
  const inAboutUs = location.pathname === "/about-us" || location.pathname === "/about-us/";

  const handleToggleChange = () => {
    setIsDark(!isDark);
  };

  const toggleMenu = () => {
    setIsMenuOpen(prev => !prev);
  };

  // Quando un link viene cliccato, chiudiamo il menu immediatamente
  const handleLinkClick = () => {
    setIsMenuOpen(false);
  };

  return (
    <div className="navbar-block">
      <nav className={classNames('navbar', { 'dark-mode': isDark })}>
        {inAboutUs ? (
          <div className="navbar-close">
            <Link to="/" onClick={handleLinkClick}>[CHIUDI]</Link>
          </div>
        ) : (
          <div className="hamburger-menu" onClick={toggleMenu}>
            <div className={classNames('hamburger', { open: isMenuOpen, 'dark-mode': isDark })} />
            <div className={classNames('hamburger', { open: isMenuOpen, 'dark-mode': isDark })} />
          </div>
        )}
        <ul className={classNames('navbar-menu', { open: isMenuOpen })}>
          <li>
            <Link to="/" onClick={handleLinkClick}>HOME</Link>
          </li>
          <li>
            {isMobile ? (
              <Link to="/about-us" onClick={handleLinkClick}>ABOUT US</Link>
            ) : (
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  openAboutUs();
                  handleLinkClick();
                }}
              >
                ABOUT US
              </a>
            )}
          </li>
          <li>
            <Link to="/portfolio" onClick={handleLinkClick}>PORTFOLIO</Link>
          </li>
          <li>
            <Link to="/contacts" onClick={handleLinkClick}>CONTACTS</Link>
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
  openAboutUs: PropTypes.func.isRequired,
  isMobile: PropTypes.bool.isRequired,
};

export default Navbar;
