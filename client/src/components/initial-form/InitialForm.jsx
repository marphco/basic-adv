import PropTypes from "prop-types";
import "./InitialForm.css";

const InitialForm = ({ formData, handleFormInputChange, businessFields }) => (
  <div>
    {/* Nome del brand o azienda */}
    <div className="form-group">
      <label>Nome del brand o azienda:</label>
      <input
        type="text"
        name="brandName"
        value={formData.brandName}
        onChange={handleFormInputChange}
        placeholder="Inserisci il nome del brand o azienda"
      />
    </div>

    {/* Tipo di progetto */}
    <div className="form-group">
      <label>Nuovo progetto o restyling?</label>
      <select
        name="projectType"
        value={formData.projectType}
        onChange={handleFormInputChange}
      >
        <option value="new">Nuovo</option>
        <option value="restyling">Restyling</option>
      </select>
    </div>

    {/* Settore aziendale */}
    <div className="form-group">
      <label>Settore aziendale:</label>
      <select
        name="businessField"
        value={formData.businessField}
        onChange={handleFormInputChange}
      >
        {businessFields.map((field) => (
          <option key={field} value={field}>
            {field}
          </option>
        ))}
      </select>

      {formData.businessField === "Altro" && (
        <input
          type="text"
          name="otherBusinessField"
          value={formData.otherBusinessField}
          onChange={handleFormInputChange}
          placeholder="Descrivi la tua idea di business/brand"
        />
      )}
    </div>
  </div>
);

InitialForm.propTypes = {
  formData: PropTypes.shape({
    brandName: PropTypes.string.isRequired,
    projectType: PropTypes.string.isRequired,
    businessField: PropTypes.string.isRequired,
    otherBusinessField: PropTypes.string,
  }).isRequired,
  handleFormInputChange: PropTypes.func.isRequired,
  businessFields: PropTypes.arrayOf(PropTypes.string).isRequired,
};

export default InitialForm;