// Navbar.jsx
import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "./Navbar.css";
import Toggle from "../toggle/Toggle";
import PropTypes from "prop-types";
import classNames from "classnames";
import LogoIcon from "../../assets/icon.svg";

const Navbar = ({
  isDark,
  setIsDark,
  openAboutUs,
  isMobile,
  toggleSidebar = () => {},
  isSidebarOpen = false,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const hamburgerRef = useRef(null); // Riferimento per l'elemento hamburger

  const location = useLocation();

  // Aggiungiamo /privacy-policy e /cookie-policy alla condizione
  const isLoginPage =
    location.pathname === "/login" ||
    location.pathname === "/privacy-policy" ||
    location.pathname === "/cookie-policy";

  const isDashboardPage = location.pathname === "/dashboard";
  const inAboutUsOrProject =
    location.pathname === "/about-us" ||
    location.pathname === "/about-us/" ||
    /^\/project\/[^/]+$/.test(location.pathname);

  const handleToggleChange = () => {
    setIsDark(!isDark);
  };

  const toggleMenu = () => {
    if (isDashboardPage && isMobile) {
      // Applica immediatamente visibility: hidden al click
      if (hamburgerRef.current) {
        hamburgerRef.current.style.visibility = "hidden";
      }
      toggleSidebar();
    } else {
      setIsMenuOpen((prev) => !prev);
    }
  };

  // Sincronizza la visibilità dell'hamburger con la chiusura della sidebar
  useEffect(() => {
    if (isDashboardPage && isMobile && hamburgerRef.current) {
      hamburgerRef.current.style.visibility = isSidebarOpen ? "hidden" : "visible";
    }
  }, [isSidebarOpen, isDashboardPage, isMobile]);

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
          <Link to="/" className="navbar-logo">
            <img src={LogoIcon} alt="Logo" className="logo-icon" />
          </Link>
        ) : isDashboardPage ? (
          isMobile ? (
            <div
              ref={hamburgerRef}
              className="hamburger-menu"
              onClick={toggleMenu}
            >
              <div className={classNames("hamburger", { "dark-mode": isDark })} />
              <div className={classNames("hamburger", { "dark-mode": isDark })} />
            </div>
          ) : (
            <div className="navbar-empty"></div>
          )
        ) : inAboutUsOrProject ? (
          <div className="navbar-close">
            <button onClick={handleClose}>[CHIUDI]</button>
          </div>
        ) : (
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