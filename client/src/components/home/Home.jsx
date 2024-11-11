import React from 'react';
import './Home.css';
import logoLight from '../../assets/logo-light.svg';
import logoDark from '../../assets/logo-dark.svg';

// Utilizziamo React.forwardRef per accettare il ref
const Home = React.forwardRef((props, ref) => {
  return (
    <div className="home-container" ref={ref}>
      <div className="stripes-container"></div>
      <div className="home-text">
        <p>
          Se si tratta di comunicare, noi ci siamo. Trasformiamo idee in storie, progetti in esperienze. Non importa dove, non importa come: il tuo pubblico sta aspettando.
          <br />
          <span className="tagline">E noi siamo qui per farlo innamorare.</span>
        </p>
      </div>
      <div className="bottom-section">
        <div className="home-logo-container">
          <img src={logoLight} alt="Logo Light" className="home-logo light-logo" />
          <img src={logoDark} alt="Logo Dark" className="home-logo dark-logo" />
        </div>
        <div className="scroll-hint">
          COMINCIAMO? <span className="scroll-arrow">↓</span>
        </div>
      </div>
    </div>
  );
});

export default Home;