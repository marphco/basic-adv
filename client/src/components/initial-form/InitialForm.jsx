import PropTypes from "prop-types";
import "./InitialForm.css";

const InitialForm = ({ formData, handleFormInputChange, businessFields }) => {
  const { brandName, projectType, businessField, otherBusinessField } =
    formData;

  return (
    <div>
      <div className="form-group">
        <label>Nome del Brand:</label>
        <input
          type="text"
          name="brandName"
          value={brandName}
          onChange={handleFormInputChange}
          required
        />
      </div>

      <div className="form-group">
        <label>Tipo di Progetto:</label>
        <select
          name="projectType"
          value={projectType}
          onChange={handleFormInputChange}
          required
        >
          <option value="new">Nuovo progetto</option>
          <option value="restyling">Restyling</option>
        </select>
      </div>

      {/* Render condizionale dell'input per l'upload del logo */}
      {projectType === "restyling" && (
        <div className="form-group">
          <label>Carica il tuo logo attuale (opzionale):</label>
          <input
            type="file"
            name="currentLogo"
            accept=".jpg, .jpeg, .png, .tiff, .tif, .svg, .pdf, .heic, .heif"
            onChange={handleFormInputChange}
          />
        </div>
      )}

      <div className="form-group">
        <label>Settore Aziendale:</label>
        <select
          name="businessField"
          value={businessField}
          onChange={handleFormInputChange}
          required
        >
          {businessFields.map((field) => (
            <option key={field} value={field}>
              {field}
            </option>
          ))}
        </select>
      </div>

      {/* Se "Altro" è selezionato, mostra il campo per specificare il settore */}
      {businessField === "Altro" && (
        <div className="form-group">
          <label>Specificare il settore:</label>
          <input
            type="text"
            name="otherBusinessField"
            value={otherBusinessField}
            onChange={handleFormInputChange}
            required
          />
        </div>
      )}
    </div>
  );
};

InitialForm.propTypes = {
  formData: PropTypes.object.isRequired,
  handleFormInputChange: PropTypes.func.isRequired,
  businessFields: PropTypes.arrayOf(PropTypes.string).isRequired,
};

export default InitialForm;
