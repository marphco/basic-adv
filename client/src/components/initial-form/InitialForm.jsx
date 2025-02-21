import PropTypes from "prop-types";
import { CSSTransition, TransitionGroup } from "react-transition-group";
import { useRef } from "react";
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
}) => {
  const { brandName, projectType, businessField, otherBusinessField } = formData;

  const requiresBrand = selectedCategories.some((cat) =>
    categoriesRequiringBrand.includes(cat)
  );

  const formSectionRef = useRef(null);
  // Creiamo un ref per ogni categoria usando un oggetto
  const servicesRefs = useRef({});

  return (
    <div className="initial-form">
      <div className="category-grid">
        {Object.keys(services).map((category) => {
          // Inizializziamo il ref per questa categoria se non esiste
          if (!servicesRefs.current[category]) {
            servicesRefs.current[category] = { current: null };
          }

          return (
            <button
              key={category}
              className={`category-box ${selectedCategories.includes(category) ? "selected" : ""}`}
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
                    <label>Nome del Brand (opzionale)</label>
                    <input
                      type="text"
                      name="brandName"
                      value={brandName}
                      onChange={handleFormInputChange}
                    />
                  </div>
                  <div className="form-group">
                    <label>Tipo di Progetto (opzionale)</label>
                    <select
                      name="projectType"
                      value={projectType}
                      onChange={handleFormInputChange}
                    >
                      <option value="new">Nuovo progetto</option>
                      <option value="restyling">Restyling</option>
                    </select>
                  </div>
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
                </>
              )}
              <div className="form-group">
                <label>Settore Aziendale</label>
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
              {businessField === "Altro" && (
                <div className="form-group">
                  <label>Specificare il settore</label>
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
};

export default InitialForm;