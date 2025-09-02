// Navbar.jsx
import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "./Navbar.css";
import Toggle from "../toggle/Toggle";
import PropTypes from "prop-types";
import classNames from "classnames";
import LogoIconUrl from "../../assets/icon.svg"; // mask per ereditare il colore

const Navbar = ({
  isDark,
  setIsDark,
  openAboutUs,
  isMobile,
  toggleSidebar = () => {},
  isSidebarOpen = false,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const hamburgerRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

  const isLoginPage =
    location.pathname === "/login" ||
    location.pathname === "/privacy-policy" ||
    location.pathname === "/cookie-policy";
  const isDashboardPage = location.pathname === "/dashboard";
  const inAboutUsOrProject =
    location.pathname === "/about-us" ||
    location.pathname === "/about-us/" ||
    /^\/project\/[^/]+$/.test(location.pathname);

  const handleToggleChange = () => setIsDark(!isDark);

  const toggleMenu = () => {
    if (isDashboardPage && isMobile) {
      if (hamburgerRef.current) hamburgerRef.current.style.visibility = "hidden";
      toggleSidebar();
    } else {
      setIsMenuOpen((prev) => !prev);
    }
  };

  useEffect(() => {
    if (isDashboardPage && isMobile && hamburgerRef.current) {
      hamburgerRef.current.style.visibility = isSidebarOpen ? "hidden" : "visible";
    }
  }, [isSidebarOpen, isDashboardPage, isMobile]);

  const handleLinkClick = () => setIsMenuOpen(false);
  const handleClose = () => navigate(-1);

  // Icona come MASK per ereditare il colore dei testi
  const logoMaskStyle = {
    WebkitMaskImage: `url(${LogoIconUrl})`,
    maskImage: `url(${LogoIconUrl})`,
  };

  return (
    <div className="navbar-block">
      <nav className={classNames("navbar", { "dark-mode": isDark })}>
        {/* SINISTRA */}
        <div className="nav-left">
          {/* Pulsante CHIUDI nelle pagine speciali (desktop + mobile) */}
          {inAboutUsOrProject && (
            <div className="navbar-close">
              <button onClick={handleClose}>[CHIUDI]</button>
            </div>
          )}

          {/* Hamburger solo su mobile nelle pagine normali */}
          {!isLoginPage && !isDashboardPage && !inAboutUsOrProject && isMobile && (
            <div
              ref={hamburgerRef}
              className="hamburger-menu"
              onClick={toggleMenu}
              aria-label="Open menu"
            >
              <div className={classNames("hamburger", { open: isMenuOpen, "dark-mode": isDark })} />
              <div className={classNames("hamburger", { open: isMenuOpen, "dark-mode": isDark })} />
            </div>
          )}

          {/* Menu desktop inline (con logo a sinistra). 
              Sul mobile/Tablet NON inseriamo il logo qui. */}
          {!isLoginPage && !isDashboardPage && !inAboutUsOrProject && (
            <ul className={classNames("navbar-menu", { open: isMenuOpen })}>
              {!isMobile && (
                <li className="li-logo-desktop">
                  <Link to="/" onClick={handleLinkClick} className="navbar-logo" aria-label="Home">
                    <span className="logo-icon" style={logoMaskStyle} />
                  </Link>
                </li>
              )}
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
          )}
        </div>

        {/* CENTRO: logo SOLO su mobile (centrato perfettamente) */}
        <div className="nav-center">
          <Link to="/" className="navbar-logo" aria-label="Home">
            <span className="logo-icon" style={logoMaskStyle} />
          </Link>
        </div>

        {/* DESTRA */}
        <div className="nav-right">
          <Toggle isChecked={isDark} handleChange={handleToggleChange} />
        </div>
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
