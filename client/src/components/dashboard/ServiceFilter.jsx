import { useState, useEffect, useRef } from "react";
import PropTypes from "prop-types";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFilter } from "@fortawesome/free-solid-svg-icons";

const ServiceFilter = ({ services, onFilterChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedServices, setSelectedServices] = useState([]);
  const dropdownRef = useRef(null);

  const toggleDropdown = (e) => {
    e.stopPropagation(); // Impedisce la propagazione dell'evento click
    setIsOpen(!isOpen);
  };

  const handleCheckboxChange = (service) => {
    const updatedServices = selectedServices.includes(service)
      ? selectedServices.filter((s) => s !== service)
      : [...selectedServices, service];
    setSelectedServices(updatedServices);
    onFilterChange(updatedServices);
  };

  // Chiude il dropdown se si clicca fuori
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="service-filter" ref={dropdownRef}>
      <button className="filter-btn" onClick={toggleDropdown}>
        <FontAwesomeIcon icon={faFilter} className="filter-icon" />
        Filtra per servizio
      </button>
      {isOpen && (
        <div className="filter-dropdown">
          {services.map((service, index) => (
            <label key={index} className="filter-option">
              <input
                type="checkbox"
                checked={selectedServices.includes(service)}
                onChange={() => handleCheckboxChange(service)}
              />
              {service}
            </label>
          ))}
        </div>
      )}
    </div>
  );
};

ServiceFilter.propTypes = {
  services: PropTypes.arrayOf(PropTypes.string).isRequired,
  onFilterChange: PropTypes.func.isRequired,
};

export default ServiceFilter;