// Navbar.jsx
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "./Navbar.css";
import Toggle from "../toggle/Toggle";
import PropTypes from "prop-types";
import classNames from "classnames";
import LogoIcon from '../../assets/icon.svg';

const Navbar = ({
  isDark,
  setIsDark,
  openAboutUs,
  isMobile,
  toggleSidebar = () => {}, // Parametro predefinito
  isSidebarOpen = false,   // Parametro predefinito
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

  // Controlla se siamo in /login
  const isLoginPage = location.pathname === "/login";
  // Controlla se siamo in /dashboard
  const isDashboardPage = location.pathname === "/dashboard";
  // Controlla se siamo in About Us o in una pagina progetto
  const inAboutUsOrProject =
    location.pathname === "/about-us" ||
    location.pathname === "/about-us/" ||
    /^\/project\/[^/]+$/.test(location.pathname);

  const handleToggleChange = () => {
    setIsDark(!isDark);
  };

  const toggleMenu = () => {
    if (isDashboardPage && isMobile) {
      // In /dashboard su mobile, il menu hamburger apre la sidebar
      toggleSidebar();
    } else {
      // Altrimenti, apre il menu a tendina
      setIsMenuOpen((prev) => !prev);
    }
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
        {isLoginPage ? (
          // Mostra solo l'icona del logo per /login
          <Link to="/" className="navbar-logo">
            <img src={LogoIcon} alt="Logo" className="logo-icon" />
          </Link>
        ) : isDashboardPage ? (
          // In /dashboard
          isMobile ? (
            // Su mobile, mostra il menu hamburger che apre la sidebar
            <div className="hamburger-menu" onClick={toggleMenu}>
              <div className={classNames("hamburger", { open: isSidebarOpen, "dark-mode": isDark })} />
              <div className={classNames("hamburger", { open: isSidebarOpen, "dark-mode": isDark })} />
            </div>
          ) : (
            // Su desktop, non mostra nulla (contenuto vuoto)
            <div className="navbar-empty"></div>
          )
        ) : inAboutUsOrProject ? (
          // Mostra il pulsante [CHIUDI] per About Us e progetti
          <div className="navbar-close">
            <button onClick={handleClose}>[CHIUDI]</button>
          </div>
        ) : (
          // Mostra il menu hamburger e i link standard per le altre pagine
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
  toggleSidebar: PropTypes.func,
  isSidebarOpen: PropTypes.bool,
};

export default Navbar;