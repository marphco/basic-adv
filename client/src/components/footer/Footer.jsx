import { Link } from "react-router-dom";
import PropTypes from "prop-types";
import "./Footer.css";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <div className="section-footer footer">
      <div className="footer-content">
        <p className="footer-cities">NAPOLI • ROMA • NEW YORK</p>
        <p><span className="agency">Basic adv srls</span></p>
        <p>P. IVA IT09456771212</p>
        <p>Copyright © {currentYear} • All rights reserved</p>
        <div className="footer-links">
          <Link to="/privacy-policy">Privacy Policy</Link>
          <span className="separator">•</span>
          <Link to="/cookie-policy">Cookie Policy</Link>
        </div>
      </div>
    </div>
  );
};

Footer.propTypes = {
  isVisible: PropTypes.bool,
};

export default Footer;