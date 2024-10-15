import './Toggle.css';
import PropTypes from 'prop-types';

const Toggle = ({ handleChange, isChecked }) => {
  return (
    <div className="toggle-container">
      <div
        className="toggle-circles"
        onClick={handleChange}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            handleChange();
          }
        }}
      >
        <div className={`circle white-circle ${!isChecked ? 'active' : ''}`}></div>
        <div className={`circle black-circle ${isChecked ? 'active' : ''}`}></div>
      </div>
    </div>
  );
};

Toggle.propTypes = {
  handleChange: PropTypes.func.isRequired,
  isChecked: PropTypes.bool.isRequired,
};

export default Toggle;