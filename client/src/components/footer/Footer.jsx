// Footer.jsx
import { Link } from "react-router-dom";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import "./Footer.css";

const Footer = ({ isMobile }) => {
  const currentYear = new Date().getFullYear();
  const { t } = useTranslation();

  return (
    <div className="section-footer footer">
      {/* Su touch/tablet: trigger inutile, quindi lo nascondiamo via CSS quando is-mobile */}
      <div className="footer-trigger">©</div>

      {/* Mobile/Tablet (isMobile): overlay sempre visibile, come mobile */}
      <div className={`footer-overlay ${isMobile ? "is-inline" : ""}`}>
        <div className="footer-content">
          {isMobile ? (
            <p className="footer-cities">NAPOLI • ROMA • NEW YORK</p>
          ) : (
            <p className="footer-cities">
              NAPOLI
              <br />
              ROMA
              <br />
              NEW YORK
            </p>
          )}

          <p>
            <span className="agency">Basic adv srls</span>
          </p>
          <p>P. IVA IT09456771212</p>

          {isMobile ? (
            <p className="footer-copyright">
              Copyright © {currentYear} • {t("allRightsReserved")}
            </p>
          ) : (
            <p className="footer-copyright">
              Copyright © {currentYear}
              <br />
              {t("allRightsReserved")}
            </p>
          )}

          {isMobile ? (
            <div className="footer-links">
              <Link to="/privacy-policy">Privacy Policy</Link>
              <span className="separator">•</span>
              <Link to="/cookie-policy">Cookie Policy</Link>
            </div>
          ) : (
            <div className="footer-links">
              <Link to="/privacy-policy">Privacy Policy</Link>
              <br />
              <Link to="/cookie-policy">Cookie Policy</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

Footer.propTypes = {
  isMobile: PropTypes.bool.isRequired,
};

export default Footer;
