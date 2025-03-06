import React, { useState } from "react";
import PropTypes from "prop-types";

const SearchBar = ({ onSearch }) => {
  const [searchTerm, setSearchTerm] = useState("");

  const handleChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    onSearch(value); // Passa il termine di ricerca al componente genitore
  };

  return (
    <div className="search-bar">
      <input
        type="text"
        placeholder="Cerca..."
        value={searchTerm}
        onChange={handleChange}
      />
    </div>
  );
};

SearchBar.propTypes = {
  onSearch: PropTypes.func.isRequired,
};

export default React.memo(SearchBar);
