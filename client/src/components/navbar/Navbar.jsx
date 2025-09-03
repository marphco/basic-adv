// Navbar.jsx
import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "./Navbar.css";
import Toggle from "../toggle/Toggle";
import PropTypes from "prop-types";
import classNames from "classnames";

// 3 asset separati
import IconOrange from "../../assets/icon-orange.svg";
import IconBlack from "../../assets/icon-black.svg";
import IconWhite from "../../assets/icon-white.svg";

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

  const pathname = (location.pathname || "/").replace(/\/+$/, "");

  const isLoginOrPolicy =
    pathname === "/login" ||
    pathname === "/privacy-policy" ||
    pathname === "/cookie-policy";

  const isDashboardPage = pathname === "/dashboard";
  const inAboutRoute = pathname === "/about-us";
  const inProjectRoute = pathname.startsWith("/project/");

  const handleToggleChange = () => setIsDark(!isDark);

  const toggleMenu = () => {
    if (isDashboardPage && isMobile) {
      if (hamburgerRef.current)
        hamburgerRef.current.style.visibility = "hidden";
      toggleSidebar();
    } else {
      setIsMenuOpen((prev) => !prev);
    }
  };

  useEffect(() => {
    if (isDashboardPage && isMobile && hamburgerRef.current) {
      hamburgerRef.current.style.visibility = isSidebarOpen
        ? "hidden"
        : "visible";
    }
  }, [isSidebarOpen, isDashboardPage, isMobile]);

  const handleLinkClick = () => setIsMenuOpen(false);
  const handleClose = () => navigate(-1);

  // Logo al centro SOLO su mobile/tablet ovunque tranne Login/Policy
  const showCenterLogo = isMobile && !isLoginOrPolicy;

  // --- NUOVO: nascondi voci su overlay desktop (About/Project) ---
  useEffect(() => {
    if (isMobile) {
      document.body.classList.remove("nav-hide-desktop");
      return;
    }

    const apply = () => {
      const projectOpen = document.body.classList.contains(
        "project-section-open"
      );
      // segnale esplicito + fallback su presenza nodo overlay
      const aboutOpen =
        document.body.classList.contains("aboutus-open") ||
        document.querySelector(".aboutus-overlay") != null;

      const shouldHide = projectOpen || aboutOpen;
      document.body.classList.toggle("nav-hide-desktop", shouldHide);
    };

    apply();

    const mo = new MutationObserver(apply);
    mo.observe(document.body, {
      attributes: true,
      attributeFilter: ["class"],
      childList: true,
      subtree: true,
    });

    return () => {
      mo.disconnect();
      document.body.classList.remove("nav-hide-desktop");
    };
  }, [isMobile]);

  // Forza l’effetto subito al click desktop (senza aspettare il portal)
  const handleAboutDesktop = (e) => {
    e.preventDefault();
    openAboutUs?.();
    document.body.classList.add("aboutus-open");
    handleLinkClick();
  };

  const LogoStack = () => (
    <span className="logo-stack" aria-hidden="true">
      <img src={IconOrange} className="logo-img logo-icon--orange" alt="" />
      <img src={IconBlack} className="logo-img logo-icon--hover-light" alt="" />
      <img src={IconWhite} className="logo-img logo-icon--hover-dark" alt="" />
    </span>
  );

  const shouldRenderMenu =
    !isLoginOrPolicy &&
    !isDashboardPage &&
    (isMobile ? !(inAboutRoute || inProjectRoute) : true);

  return (
    <div className="navbar-block">
      <nav className={classNames("navbar", { "dark-mode": isDark })}>
        {/* SINISTRA */}
        <div className="nav-left">
          {isLoginOrPolicy && (
            <Link to="/" onClick={handleLinkClick} className="navbar-logo">
              <LogoStack />
            </Link>
          )}

          {!isMobile && isDashboardPage && (
            <Link to="/" onClick={handleLinkClick} className="navbar-logo">
              <LogoStack />
            </Link>
          )}

          {(inAboutRoute || inProjectRoute) && (
            <div className="navbar-close">
              <button onClick={handleClose} className="close-btn">
                [CHIUDI]
              </button>
            </div>
          )}

          {isDashboardPage && isMobile && (
            <div
              ref={hamburgerRef}
              className="hamburger-menu"
              onClick={toggleMenu}
              aria-label="Open sidebar"
            >
              <div
                className={classNames("hamburger", { "dark-mode": isDark })}
              />
              <div
                className={classNames("hamburger", { "dark-mode": isDark })}
              />
            </div>
          )}

          {!isLoginOrPolicy &&
            !isDashboardPage &&
            !(inAboutRoute || inProjectRoute) &&
            isMobile && (
              <div
                ref={hamburgerRef}
                className="hamburger-menu"
                onClick={toggleMenu}
                aria-label="Open menu"
              >
                <div
                  className={classNames("hamburger", {
                    open: isMenuOpen,
                    "dark-mode": isDark,
                  })}
                />
                <div
                  className={classNames("hamburger", {
                    open: isMenuOpen,
                    "dark-mode": isDark,
                  })}
                />
              </div>
            )}

          {shouldRenderMenu && (
            <ul className={classNames("navbar-menu", { open: isMenuOpen })}>
              {!isMobile && (
                <li className="li-logo-desktop">
                  <Link
                    to="/"
                    onClick={handleLinkClick}
                    className="navbar-logo"
                  >
                    <LogoStack />
                  </Link>
                </li>
              )}
              <li>
                {isMobile ? (
                  <Link to="/about-us" onClick={handleLinkClick}>
                    ABOUT US
                  </Link>
                ) : (
                  <a href="#" onClick={handleAboutDesktop}>
                    ABOUT US
                  </a>
                )}
              </li>
              <li>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setIsMenuOpen(false);
                    window.dispatchEvent(
                      new CustomEvent("basic:scrollTo", {
                        detail: { id: "portfolio" },
                      })
                    );
                  }}
                >
                  PORTFOLIO
                </a>
              </li>
              <li>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setIsMenuOpen(false);
                    window.dispatchEvent(
                      new CustomEvent("basic:scrollTo", {
                        detail: { id: "contacts" },
                      })
                    );
                  }}
                >
                  CONTACTS
                </a>
              </li>
            </ul>
          )}
        </div>

        {/* CENTRO: logo solo su mobile/tablet */}
        {showCenterLogo && (
          <div className="nav-center">
            <Link to="/" onClick={handleLinkClick} className="navbar-logo">
              <LogoStack />
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
