import PropTypes from "prop-types";
import "./ServiceSelection.css";

const ServiceSelection = ({ services, selectedServices, toggleService }) => (
  <div>
    <p>Quali servizi ti interessano?</p>
    <div className="selectable-buttons">
      {services.map((service) => (
        <button
          key={service}
          className={`service-btn ${
            selectedServices.includes(service) ? "selected" : ""
          }`}
          onClick={() => toggleService(service)}
        >
          {service}
        </button>
      ))}
    </div>
  </div>
);

ServiceSelection.propTypes = {
  services: PropTypes.arrayOf(PropTypes.string).isRequired,
  selectedServices: PropTypes.arrayOf(PropTypes.string).isRequired,
  toggleService: PropTypes.func.isRequired,
};

export default ServiceSelection;