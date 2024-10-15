import { Link } from 'react-router-dom';
import './Navbar.css';
import Toggle from '../toggle/Toggle'; // Importazione predefinita corretta
import PropTypes from 'prop-types'; // Importa PropTypes

const Navbar = ({ isDark, setIsDark }) => {
  const handleToggleChange = () => {
    setIsDark(!isDark);
  };

  return (
    <div className="navbar-block">
      <nav className="navbar">
        <ul className="navbar-menu">
          <li>
            <Link to="/">Home</Link>
          </li>
          <li>
            <Link to="/about-us">About Us</Link>
          </li>
          <li>
            <Link to="/portfolio">Portfolio</Link>
          </li>
          <li>
            <Link to="/contatti">Contacts</Link>
          </li>
        </ul>
        <Toggle isChecked={isDark} handleChange={handleToggleChange} />
      </nav>
    </div>
  );
};

Navbar.propTypes = {
  isDark: PropTypes.bool.isRequired,
  setIsDark: PropTypes.func.isRequired,
};

export default Navbar;
