// Navbar.jsx
import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "./Navbar.css";
import Toggle from "../toggle/Toggle";
import PropTypes from "prop-types";
import classNames from "classnames";
import { useTranslation } from "react-i18next";

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
  const { t, i18n } = useTranslation(["common"]);

  const pathname = (location.pathname || "/").replace(/\/+$/, "");

  const isLoginOrPolicy =
    pathname === "/login" ||
    pathname === "/privacy-policy" ||
    pathname === "/cookie-policy";

  const isDashboardPage = pathname === "/dashboard";
  const inAboutRoute = pathname === "/about-us";
  const inProjectRoute = pathname.startsWith("/project/");

  const handleToggleChange = () => setIsDark(!isDark);

  // helper locale
  const setLang = (lng) => {
    i18n.changeLanguage(lng);
    localStorage.setItem("lang", lng);
    document.documentElement.setAttribute("lang", lng);
    window.dispatchEvent(new CustomEvent("basic:lang", { detail: lng }));
    // suggerisci al form di riavviare se una sessione è in corso
    window.dispatchEvent(
      new CustomEvent("basic:lang:maybe-restart", { detail: lng })
    );
    setIsMenuOpen(false);
  };

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

  useEffect(() => {
    const lng =
      localStorage.getItem("lang") ||
      (i18n.language?.startsWith("it") ? "it" : "en");
    document.documentElement.setAttribute("lang", lng);
  }, [i18n.language]);

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
      <nav
        className={classNames("navbar", { "dark-mode": isDark })}
        aria-label="Navigazione principale"
      >
        {/* SINISTRA */}
        <div className="nav-left">
          {isLoginOrPolicy && (
            <Link
              to="/"
              onClick={handleLinkClick}
              className="navbar-logo"
              aria-label="BASIC. — home"
            >
              <LogoStack />
            </Link>
          )}

          {!isMobile && isDashboardPage && (
            <li className="li-logo-desktop">
              <Link
                to="/"
                onClick={handleLinkClick}
                className="navbar-logo"
                aria-label={t("aria.home")}
              >
                <LogoStack />
              </Link>
            </li>
          )}

          {(inAboutRoute || inProjectRoute) && (
            <div className="navbar-close">
              <button onClick={handleClose} className="close-btn">
                [{t("navbar.close")}]
              </button>
            </div>
          )}

          {isDashboardPage && isMobile && (
            <button
              ref={hamburgerRef}
              type="button"
              className="hamburger-menu"
              onClick={toggleMenu}
              aria-label={
                isSidebarOpen ? t("aria.closeSidebar") : t("aria.openSidebar")
              }
              aria-expanded={isSidebarOpen}
            >
              <span
                className={classNames("hamburger", { "dark-mode": isDark })}
                aria-hidden="true"
              />
              <span
                className={classNames("hamburger", { "dark-mode": isDark })}
                aria-hidden="true"
              />
            </button>
          )}

          {!isLoginOrPolicy &&
            !isDashboardPage &&
            !(inAboutRoute || inProjectRoute) &&
            isMobile && (
              <button
                ref={hamburgerRef}
                type="button"
                className="hamburger-menu"
                onClick={toggleMenu}
                aria-label={
                  isMenuOpen ? t("aria.closeMenu") : t("aria.openMenu")
                }
                aria-expanded={isMenuOpen}
                aria-controls="primary-nav"
              >
                <span
                  className={classNames("hamburger", {
                    open: isMenuOpen,
                    "dark-mode": isDark,
                  })}
                  aria-hidden="true"
                />
                <span
                  className={classNames("hamburger", {
                    open: isMenuOpen,
                    "dark-mode": isDark,
                  })}
                  aria-hidden="true"
                />
              </button>
            )}

          {shouldRenderMenu && (
            <ul
              id="primary-nav"
              className={classNames("navbar-menu", { open: isMenuOpen })}
            >
              <li className="li-logo-desktop">
  <Link to="/" onClick={handleLinkClick} className="navbar-logo" aria-label={t("aria.home")}>
    <LogoStack />
  </Link>
</li>
              <li>
                {isMobile ? (
                  <Link to="/about-us" onClick={handleLinkClick}>
                    {t("navbar.about")}
                  </Link>
                ) : (
                  <a href="#" onClick={handleAboutDesktop}>
                    {t("navbar.about")}
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
                  {t("navbar.portfolio")}
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
                  {t("navbar.contacts")}
                </a>
              </li>
            </ul>
          )}
        </div>

        {/* CENTRO: logo solo su mobile/tablet */}
        {showCenterLogo && (
          <div className="nav-center">
            <Link
              to="/"
              onClick={handleLinkClick}
              className="navbar-logo"
              aria-label="BASIC. — home"
            >
              <LogoStack />
            </Link>
          </div>
        )}

        {/* DESTRA */}
        <div className="nav-right">
          <div className="lang-switch">
            <div
              className="lang-inline"
              role="group"
              aria-label="Language switch"
            >
              <button
                type="button"
                className="lang-btn"
                data-active={!i18n.language || !i18n.language.startsWith("it")}
                onClick={() => setLang("en")}
                aria-pressed={!i18n.language || !i18n.language.startsWith("it")}
              >
                EN
              </button>
              <span className="lang-sep" aria-hidden="true">
                ·
              </span>
              <button
                type="button"
                className="lang-btn"
                data-active={i18n.language?.startsWith("it")}
                onClick={() => setLang("it")}
                aria-pressed={i18n.language?.startsWith("it")}
              >
                IT
              </button>
            </div>
          </div>
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
