import { Link } from 'react-router-dom';
import './Navbar.css';
import Toggle from '../toggle/Toggle'; // Importazione predefinita corretta
import PropTypes from 'prop-types'; // Importa PropTypes

const Navbar = ({ isDark, setIsDark }) => {
  const handleToggleChange = () => {
    setIsDark(!isDark);
  };

  return (
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
          <Link to="/contatti">Contatti</Link>
        </li>
      </ul>
      <Toggle isChecked={isDark} handleChange={handleToggleChange} /> {/* Passa le props correttamente */}
    </nav>
  );
};

Navbar.propTypes = {
  isDark: PropTypes.bool.isRequired,
  setIsDark: PropTypes.func.isRequired,
};

export default Navbar;