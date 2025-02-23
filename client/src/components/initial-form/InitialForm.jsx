import PropTypes from "prop-types";
import { CSSTransition, TransitionGroup } from "react-transition-group";
import { useRef } from "react";
import { FaExclamationCircle, FaPaperclip } from "react-icons/fa";
import "./InitialForm.css";

const InitialForm = ({
  formData,
  handleFormInputChange,
  businessFields,
  selectedCategories,
  toggleCategory,
  selectedServices,
  toggleService,
  services,
  categoriesRequiringBrand,
  errors = {},
}) => {
  const {
    brandName,
    projectType,
    businessField,
    otherBusinessField,
    currentLogo,
    budget,
  } = formData;

  const requiresBrand = selectedCategories.some((cat) =>
    categoriesRequiringBrand.includes(cat)
  );

  const formSectionRef = useRef(null);
  const servicesRefs = useRef({});
  const fileInputRef = useRef(null);

  const handleFileButtonClick = () => {
    fileInputRef.current.click();
  };

  const budgetOptions = [
    { label: "Non lo so", value: "unknown" },
    { label: "0-1.000 €", value: "0-1000" },
    { label: "1-5.000 €", value: "1000-5000" },
    { label: "5-10.000 €", value: "5000-10000" },
    { label: "+10.000 €", value: "10000+" },
  ];

  const handleBudgetSelect = (value) => {
    handleFormInputChange({ target: { name: "budget", value } });
  };

  return (
    <div className="initial-form">
      <div className="category-grid">
        {Object.keys(services).map((category) => {
          if (!servicesRefs.current[category]) {
            servicesRefs.current[category] = { current: null };
          }

          return (
            <button
              key={category}
              className={`category-box ${
                selectedCategories.includes(category) ? "selected" : ""
              }`}
              onClick={() => toggleCategory(category)}
              type="button"
            >
              <div className="category-label">
                <span>{category}</span>
              </div>
              <TransitionGroup component={null}>
                {selectedCategories.includes(category) && (
                  <CSSTransition
                    key={`services-${category}`}
                    timeout={600}
                    classNames="services"
                    nodeRef={servicesRefs.current[category]}
                    appear={true}
                    unmountOnExit={true}
                  >
                    <div
                      ref={servicesRefs.current[category]}
                      className="form-services-list"
                    >
                      {services[category].map((service) => (
                        <label
                          key={service}
                          className="service-item"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            value={service}
                            checked={selectedServices.includes(service)}
                            onChange={() => toggleService(service)}
                          />
                          <span>{service}</span>
                        </label>
                      ))}
                      {errors.services && (
                        <span className="error-message">
                          <FaExclamationCircle className="error-icon" />
                          {errors.services}
                        </span>
                      )}
                    </div>
                  </CSSTransition>
                )}
              </TransitionGroup>
            </button>
          );
        })}
      </div>

      <TransitionGroup component={null}>
        {selectedCategories.length > 0 && (
          <CSSTransition
            key="form-section"
            timeout={600}
            classNames="form-item"
            nodeRef={formSectionRef}
            appear={true}
            unmountOnExit={true}
          >
            <div ref={formSectionRef} className="form-section">
              {requiresBrand && (
                <>
                  <div className="form-group">
                    <input
                      type="text"
                      name="brandName"
                      value={brandName}
                      onChange={handleFormInputChange}
                      placeholder="Nome del brand"
                    />
                    {errors.brandName && (
                      <span className="error-message">
                        <FaExclamationCircle className="error-icon" />
                        {errors.brandName}
                      </span>
                    )}
                  </div>
                  <div className="form-group">
                    <select
                      name="projectType"
                      value={projectType}
                      onChange={handleFormInputChange}
                      required
                    >
                      <option value="Tipo di progetto" disabled>
                        Tipo di progetto
                      </option>
                      <option value="new">Nuovo progetto</option>
                      <option value="restyling">Restyling</option>
                    </select>
                    {errors.projectType && (
                      <span className="error-message">
                        <FaExclamationCircle className="error-icon" />
                        {errors.projectType}
                      </span>
                    )}
                  </div>
                  {projectType === "restyling" && (
                    <div className="form-group">
                      <div className="file-upload-wrapper">
                        <button
                          type="button"
                          className={`file-upload-btn ${
                            currentLogo ? "uploaded" : ""
                          }`}
                          onClick={handleFileButtonClick}
                        >
                          {currentLogo ? (
                            <>
                              <span className="file-icon-left">
                                <FaPaperclip />
                              </span>
                              <span className="file-name-wrapper">
                                <span className="file-name-text">
                                  {currentLogo.name.substring(
                                    0,
                                    currentLogo.name.lastIndexOf(".")
                                  )}
                                </span>
                                <span className="file-extension">
                                  {currentLogo.name.substring(
                                    currentLogo.name.lastIndexOf(".")
                                  )}
                                </span>
                              </span>
                              <span
                                className="file-icon-right"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleFormInputChange({
                                    target: { name: "currentLogo", value: null },
                                  });
                                  fileInputRef.current.value = "";
                                }}
                              >
                                ✕
                              </span>
                            </>
                          ) : (
                            <span>Carica il tuo logo attuale</span>
                          )}
                          {!currentLogo && (
                            <span className="file-icon-right">↑</span>
                          )}
                        </button>
                      </div>
                      <input
                        type="file"
                        name="currentLogo"
                        ref={fileInputRef}
                        accept=".jpg, .jpeg, .png, .tiff, .tif, .svg, .pdf, .heic, .heif"
                        onChange={handleFormInputChange}
                        style={{ display: "none" }}
                      />
                      {errors.currentLogo && (
                        <span className="error-message">
                          <FaExclamationCircle className="error-icon" />
                          {errors.currentLogo}
                        </span>
                      )}
                    </div>
                  )}
                </>
              )}
              <div className="form-group">
                <select
                  name="businessField"
                  value={businessField}
                  onChange={handleFormInputChange}
                  required
                >
                  <option value="Ambito" disabled>
                    Ambito
                  </option>
                  {businessFields
                    .filter((field) => field !== "Ambito")
                    .map((field) => (
                      <option key={field} value={field}>
                        {field}
                      </option>
                    ))}
                </select>
                {errors.businessField && (
                  <span className="error-message">
                    <FaExclamationCircle className="error-icon" />
                    {errors.businessField}
                  </span>
                )}
              </div>
              {businessField === "Altro" && (
                <div className="form-group">
                  <input
                    type="text"
                    name="otherBusinessField"
                    value={otherBusinessField}
                    onChange={handleFormInputChange}
                    required
                    placeholder="Specifica l’ambito"
                  />
                  {errors.otherBusinessField && (
                    <span className="error-message">
                      <FaExclamationCircle className="error-icon" />
                      {errors.otherBusinessField}
                    </span>
                  )}
                </div>
              )}
              {/* Campo budget con titolo */}
              <div className="form-group budget-group">
                <h3 className="budget-title">Qual è il tuo budget?</h3>
                <div className="budget-circles">
                  {budgetOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={`budget-circle ${
                        budget === option.value ? "selected" : ""
                      }`}
                      onClick={() => handleBudgetSelect(option.value)}
                    >
                      <span className="budget-label">{option.label}</span>
                    </button>
                  ))}
                </div>
                {errors.budget && (
                  <span className="error-message budget-error">
                    <FaExclamationCircle className="error-icon" />
                    {errors.budget}
                  </span>
                )}
              </div>
            </div>
          </CSSTransition>
        )}
      </TransitionGroup>
    </div>
  );
};

InitialForm.propTypes = {
  formData: PropTypes.object.isRequired,
  handleFormInputChange: PropTypes.func.isRequired,
  businessFields: PropTypes.arrayOf(PropTypes.string).isRequired,
  selectedCategories: PropTypes.arrayOf(PropTypes.string).isRequired,
  toggleCategory: PropTypes.func.isRequired,
  selectedServices: PropTypes.arrayOf(PropTypes.string).isRequired,
  toggleService: PropTypes.func.isRequired,
  services: PropTypes.object.isRequired,
  categoriesRequiringBrand: PropTypes.arrayOf(PropTypes.string).isRequired,
  errors: PropTypes.object,
};

export default InitialForm;