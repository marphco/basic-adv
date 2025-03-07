import { useState, useEffect, useRef } from "react";
import PropTypes from "prop-types";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFilter, faTimes } from "@fortawesome/free-solid-svg-icons";

const ServiceFilter = ({ services, selectedServices, onFilterChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const toggleDropdown = (e) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  const handleCheckboxChange = (service) => {
    const updatedServices = selectedServices.includes(service)
      ? selectedServices.filter((s) => s !== service)
      : [...selectedServices, service];
    onFilterChange(updatedServices);
  };

  const clearFilters = (e) => {
    e.stopPropagation();
    onFilterChange([]);
  };

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
      <div className="filter-wrapper">
        <button className="filter-btn" onClick={toggleDropdown}>
          <FontAwesomeIcon icon={faFilter} className="filter-icon" />
          Filtra per servizio
          {selectedServices.length > 0 && (
            <span className="filter-badge">{selectedServices.length}</span>
          )}
        </button>
        {selectedServices.length > 0 && (
          <button className="filter-clear-btn" onClick={clearFilters}>
            <FontAwesomeIcon icon={faTimes} className="filter-clear-icon" />
          </button>
        )}
      </div>
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
  selectedServices: PropTypes.arrayOf(PropTypes.string).isRequired,
  onFilterChange: PropTypes.func.isRequired,
};

export default ServiceFilter;