import { useEffect, useState } from 'react';
import './Home.css';
import logoLight from '../../assets/logo-light.svg';
import logoDark from '../../assets/logo-dark.svg';
import PropTypes from 'prop-types'; // Import PropTypes

const Home = ({ isDark }) => {  
  const [logo, setLogo] = useState(logoLight);

  useEffect(() => {
    if (isDark) {
      setLogo(logoDark);
    } else {
      setLogo(logoLight);
    }
  }, [isDark]);

  return (
    <div className="home-container">
      <div className="home-text">
        <p>
          Se si tratta di comunicare, noi ci siamo. Trasformiamo idee in storie, progetti in esperienze. Non importa dove, non importa come: il tuo pubblico sta aspettando.<br/><span className="tagline">E noi siamo qui per farlo innamorare.</span>
        </p>
      </div>
      <div className="bottom-section">
        <div className="home-logo-container">
          <img src={logo} alt="Logo Basic Adv" className="home-logo"/>
        </div>
        <div className="scroll-hint">
          COMINCIAMO? <span className="scroll-arrow">↓</span>
        </div>
      </div>
    </div>
  );
};

Home.propTypes = {
  isDark: PropTypes.bool.isRequired,
};

export default Home;
