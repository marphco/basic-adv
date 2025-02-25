// Navbar.jsx
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "./Navbar.css";
import Toggle from "../toggle/Toggle";
import PropTypes from "prop-types";
import classNames from "classnames";
import LogoIcon from '../../assets/icon.svg'; // Importa l'icona

const Navbar = ({ isDark, setIsDark, openAboutUs, isMobile }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

  // Controlla se siamo in /login o /dashboard
  const isSpecialPage = location.pathname === "/login" || location.pathname === "/dashboard";

  // Controlla se siamo in About Us o in una pagina progetto
  const inAboutUsOrProject =
    location.pathname === "/about-us" ||
    location.pathname === "/about-us/" ||
    /^\/project\/[^/]+$/.test(location.pathname);

  const handleToggleChange = () => {
    setIsDark(!isDark);
  };

  const toggleMenu = () => {
    setIsMenuOpen((prev) => !prev);
  };

  const handleLinkClick = () => {
    setIsMenuOpen(false);
  };

  const navigate = useNavigate();

  const handleClose = () => {
    navigate(-1);
  };

  return (
    <div className="navbar-block">
      <nav className={classNames("navbar", { "dark-mode": isDark })}>
        {isSpecialPage ? (
          // Mostra solo l'icona del logo per /login e /dashboard
          <Link to="/" className="navbar-logo">
            <img src={LogoIcon} alt="Logo" className="logo-icon" />
          </Link>
        ) : inAboutUsOrProject ? (
          // Mostra il pulsante [CHIUDI] per About Us e progetti
          <div className="navbar-close">
            <button onClick={handleClose}>[CHIUDI]</button>
          </div>
        ) : (
          // Mostra il menu hamburger e i link standard
          <>
            <div className="hamburger-menu" onClick={toggleMenu}>
              <div className={classNames("hamburger", { open: isMenuOpen, "dark-mode": isDark })} />
              <div className={classNames("hamburger", { open: isMenuOpen, "dark-mode": isDark })} />
            </div>
            <ul className={classNames("navbar-menu", { open: isMenuOpen })}>
              <li>
                <Link to="/" onClick={handleLinkClick}>
                  HOME
                </Link>
              </li>
              <li>
                {isMobile ? (
                  <Link to="/about-us" onClick={handleLinkClick}>
                    ABOUT US
                  </Link>
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
                <Link to="/portfolio" onClick={handleLinkClick}>
                  PORTFOLIO
                </Link>
              </li>
              <li>
                <Link to="/contacts" onClick={handleLinkClick}>
                  CONTACTS
                </Link>
              </li>
            </ul>
          </>
        )}
        {/* Toggle sempre visibile */}
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