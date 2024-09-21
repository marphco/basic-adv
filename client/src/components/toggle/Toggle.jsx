import "./Toggle.css"
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMoon, faLightbulb } from '@fortawesome/free-solid-svg-icons';

export const Toggle = ({ handleChange, isChecked}) => {
    return (
        <div className="toggle-container">
            <input
            type="checkbox"
            id="check"
            className="toggle"
            onChange={handleChange}
            checked={isChecked}
            />
            <label htmlFor="check">
                <FontAwesomeIcon className="toggle-icon" icon={isChecked ? faMoon : faLightbulb} size="sm" />
            </label>
        </div>
    )
}

Toggle.propTypes = {
    handleChange: PropTypes.func.isRequired,
    isChecked: PropTypes.bool.isRequired,
}