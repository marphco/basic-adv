import { Link } from "react-router-dom";
import PropTypes from "prop-types";
import "./Footer.css";

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const isMobile = window.innerWidth <= 768;

  return (
    <div className="section-footer footer">
      <div className="footer-trigger">©</div>
      <div className="footer-overlay">
        <div className="footer-content">
          {/* Città: su righe separate su desktop, su una riga con • su mobile */}
          {isMobile ? (
            <p className="footer-cities">
              NAPOLI • ROMA • NEW YORK
            </p>
          ) : (
            <p className="footer-cities">
              NAPOLI<br />
              ROMA<br />
              NEW YORK
            </p>
          )}
          <p>
            <span className="agency">Basic adv srls</span>
          </p>
          <p>P. IVA IT09456771212</p>
          {/* Copyright: su una riga con • su mobile, su due su desktop */}
          {isMobile ? (
            <p className="footer-copyright">
              Copyright © {currentYear} • All rights reserved
            </p>
          ) : (
            <p className="footer-copyright">
              Copyright © {currentYear}
              <br />
              All rights reserved
            </p>
          )}
          {/* Link: su una riga con separatore su mobile, su due righe su desktop */}
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
  isVisible: PropTypes.bool,
};

export default Footer;