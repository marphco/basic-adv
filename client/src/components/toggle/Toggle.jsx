import './Toggle.css';
import PropTypes from 'prop-types';

const Toggle = ({ handleChange, isChecked }) => {
  const label = isChecked ? 'Passa al tema chiaro' : 'Passa al tema scuro';
  return (
    <div className="toggle-container">
      <button
        className="toggle-circles"
        type="button"
        onClick={handleChange}
        aria-pressed={isChecked}      // semantica di toggle
        aria-label={label}            // nome accessibile
      >
        <span className={`circle white-circle ${!isChecked ? 'active' : ''}`} aria-hidden="true"></span>
        <span className={`circle black-circle ${isChecked ? 'active' : ''}`} aria-hidden="true"></span>
      </button>
    </div>
  );
};

Toggle.propTypes = {
  handleChange: PropTypes.func.isRequired,
  isChecked: PropTypes.bool.isRequired,
};

export default Toggle;
