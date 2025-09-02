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

  // Normalizzo pathname
  const pathname = (location.pathname || "/").replace(/\/+$/, "");

  // Login + Policy (stesso trattamento)
  const isLoginOrPolicy =
    pathname === "/login" ||
    pathname === "/privacy-policy" ||
    pathname === "/cookie-policy";

  const isDashboardPage = pathname === "/dashboard";

  // About e Project (per [CHIUDI])
  const inAboutUsOrProject =
    pathname === "/about-us" || pathname.startsWith("/project/");

  const handleToggleChange = () => setIsDark(!isDark);

  const toggleMenu = () => {
    if (isDashboardPage && isMobile) {
      if (hamburgerRef.current) hamburgerRef.current.style.visibility = "hidden";
      toggleSidebar(); // apre/chiude sidebar
    } else {
      setIsMenuOpen((prev) => !prev);
    }
  };

  // Sincronizza visibilità hamburger dashboard-mobile con lo stato della sidebar
  useEffect(() => {
    if (isDashboardPage && isMobile && hamburgerRef.current) {
      hamburgerRef.current.style.visibility = isSidebarOpen ? "hidden" : "visible";
    }
  }, [isSidebarOpen, isDashboardPage, isMobile]);

  const handleLinkClick = () => setIsMenuOpen(false);
  const handleClose = () => navigate(-1);

  // Icona come MASK per ereditare sempre il colore dei testi
  const logoMaskStyle = {
    WebkitMaskImage: `url(${LogoIconUrl})`,
    maskImage: `url(${LogoIconUrl})`,
  };

  // Logo al centro SOLO su mobile/tablet ovunque tranne Login/Policy
  // (quindi anche in About/Project e in Dashboard)
  const showCenterLogo = isMobile && !isLoginOrPolicy;

  return (
    <div className="navbar-block">
      <nav className={classNames("navbar", { "dark-mode": isDark })}>
        {/* SINISTRA */}
        <div className="nav-left">
          {/* LOGIN / POLICY -> solo logo a sinistra */}
          {isLoginOrPolicy && (
            <Link to="/" className="navbar-logo" aria-label="Home">
              <span className="logo-icon" style={logoMaskStyle} />
            </Link>
          )}

          {/* DASHBOARD desktop -> solo logo a sinistra */}
          {!isMobile && isDashboardPage && (
            <Link to="/" className="navbar-logo" aria-label="Home">
              <span className="logo-icon" style={logoMaskStyle} />
            </Link>
          )}

          {/* [CHIUDI] in About/Project (desktop e mobile) */}
          {inAboutUsOrProject && (
            <div className="navbar-close">
              <button onClick={handleClose} className="close-btn">[CHIUDI]</button>
            </div>
          )}

          {/* HAMBURGER: dashboard mobile -> apre/chiude la sidebar */}
          {isDashboardPage && isMobile && (
            <div
              ref={hamburgerRef}
              className="hamburger-menu"
              onClick={toggleMenu}
              aria-label="Open sidebar"
            >
              <div className={classNames("hamburger", { "dark-mode": isDark })} />
              <div className={classNames("hamburger", { "dark-mode": isDark })} />
            </div>
          )}

          {/* HAMBURGER: pagine normali (non login/policy, non dashboard, non about/project) */}
          {!isLoginOrPolicy && !isDashboardPage && !inAboutUsOrProject && isMobile && (
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

          {/* MENU DESKTOP inline (come nel tuo originale) */}
          {!isLoginOrPolicy && !isDashboardPage && !inAboutUsOrProject && (
            <ul className={classNames("navbar-menu", { open: isMenuOpen })}>
              {/* logo nel menu SOLO su desktop */}
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
                {/* anchor one-page */}
                <Link to="/#portfolio" onClick={handleLinkClick}>PORTFOLIO</Link>
              </li>
              <li>
                <Link to="/#contacts" onClick={handleLinkClick}>CONTACTS</Link>
              </li>
            </ul>
          )}
        </div>

        {/* CENTRO: logo solo su mobile/tablet (anche About/Project e Dashboard) */}
        {showCenterLogo && (
          <div className="nav-center">
            <Link to="/" className="navbar-logo" aria-label="Home">
              <span className="logo-icon" style={logoMaskStyle} />
            </Link>
          </div>
        )}

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
