import PropTypes from "prop-types";
import { CSSTransition, TransitionGroup } from "react-transition-group";
import { useRef } from "react";
import {
  FaExclamationCircle,
  FaPaperclip,
  FaApple,
  FaAndroid,
  FaLaptopCode,
} from "react-icons/fa";
import "./InitialForm.css";
import { useTranslation } from "react-i18next";
import LinkDock from "./LinkDock";

const InitialForm = ({
  formData,
  handleFormInputChange,
  businessFields,
  selectedCategories,
  toggleCategory,
  selectedServices,
  toggleService,
  services,
  errors = {},
  PT_PH,
  BF_PH,
}) => {
  const {
    brandName,
    projectType,
    businessField,
    otherBusinessField,
    currentLogo,
    websiteUrl,
    instagramUrl,
    facebookUrl,
    assetsLink,
    referenceUrls,
  } = formData;

  const showBrandingControls = selectedCategories.includes("Branding");
  const showWebFields = selectedCategories.includes("Web");
  const showSocialFields = selectedCategories.includes("Social");
  const showMediaFields = selectedCategories.some((c) =>
    ["Photo", "Video"].includes(c)
  );
  const showAssets = showWebFields || showSocialFields || showMediaFields;
  const showReferences = showAssets;

  const formSectionRef = useRef(null);
  const servicesRefs = useRef({});
  const fileInputRef = useRef(null);

  const { t } = useTranslation(["common"]);

  const handleFileButtonClick = () => {
    // Se c'è già un file, il click su ✕ lo rimuove
    if (currentLogo && typeof currentLogo === "object") {
      if (fileInputRef.current) fileInputRef.current.value = "";
      // comunico al parent che il logo è stato rimosso
      handleFormInputChange({ name: "currentLogo", value: "" });
      return;
    }
    fileInputRef.current?.click();
  };

  const showAppFields = selectedCategories.includes("App");

  const showDock =
    showWebFields || showSocialFields || showMediaFields || showAppFields;

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
                        <span className="error-message" role="alert">
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
              {showBrandingControls && (
                <>
                  {/* Nome brand (opzionale) */}
                  <div className="form-group">
                    <input
                      type="text"
                      name="brandName"
                      value={brandName || ""}
                      onChange={handleFormInputChange}
                      placeholder={
                        t("form.initial.brandName.placeholder") ||
                        "Nome brand (opzionale)"
                      }
                    />
                  </div>

                  <div className="form-group">
                    <select
                      name="projectType"
                      value={projectType}
                      onChange={handleFormInputChange}
                      required
                    >
                      <option value={PT_PH} disabled>
                        {t("form.initial.projectType.placeholder")}
                      </option>
                      <option value="new">
                        {t("form.initial.projectType.new")}
                      </option>
                      <option value="restyling">
                        {t("form.initial.projectType.restyling")}
                      </option>
                    </select>
                    {errors.projectType && (
                      <span className="error-message" role="alert">
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
                          aria-label={
                            currentLogo
                              ? t("form.actions.clear")
                              : t("form.initial.uploadLogo")
                          }
                        >
                          {currentLogo &&
                          typeof currentLogo === "object" &&
                          currentLogo.name ? (
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
                              <span className="file-icon-right" aria-hidden>
                                ✕
                              </span>
                            </>
                          ) : (
                            <>
                              <span>{t("form.initial.uploadLogo")}</span>
                              <span className="file-icon-right" aria-hidden>
                                ↑
                              </span>
                            </>
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
                        <span className="error-message" role="alert">
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
                  <option value={BF_PH} disabled>
                    {t("form.initial.businessField.placeholder")}
                  </option>
                  {businessFields.map((field) => (
                    <option key={field} value={field}>
                      {t(`form.initial.businessField.options.${field}`)}
                    </option>
                  ))}
                </select>
                {errors.businessField && (
                  <span className="error-message" role="alert">
                    <FaExclamationCircle className="error-icon" />
                    {errors.businessField}
                  </span>
                )}
              </div>

              {businessField === "Other" && (
                <div className="form-group">
                  <input
                    type="text"
                    name="otherBusinessField"
                    value={otherBusinessField}
                    onChange={handleFormInputChange}
                    required
                    placeholder={t(
                      "form.initial.businessField.otherPlaceholder"
                    )}
                  />
                  {errors.otherBusinessField && (
                    <span className="error-message" role="alert">
                      <FaExclamationCircle className="error-icon" />
                      {errors.otherBusinessField}
                    </span>
                  )}
                </div>
              )}

              {/* --- Link opzionali (mostra solo se servono) --- */}
              {showDock && (
                <>
                  <div className="dock-legend">
                    {t("form.labels.optionalLinks")}
                  </div>
                  <LinkDock
                    t={t}
                    showWebsite={showWebFields}
                    showInstagram={showSocialFields}
                    showFacebook={showSocialFields}
                    showAssets={showAssets}
                    showReferences={showReferences}
                    showAppLinks={showAppFields}
                    values={{
                      websiteUrl,
                      instagramUrl,
                      facebookUrl,
                      assetsLink,
                      referenceUrls,
                      iosUrl: formData.iosUrl,
                      androidUrl: formData.androidUrl,
                      webappUrl: formData.webappUrl,
                      repoUrl: formData.repoUrl,
                      designLink: formData.designLink,
                      appPlatforms: formData.appPlatforms,
                    }}
                    errors={errors}
                    onChange={handleFormInputChange}
                  />
                </>
              )}

              {/* --- Piattaforme (cliccabili) --- */}
              {showAppFields && (
                <div className="links-row" style={{ marginTop: ".5rem" }}>
                  <div style={{ width: "100%" }}>
                    <div id="platforms-legend" className="chips-legend">
                      {t("form.labels.platforms")}
                    </div>
                    <div
                      className="platforms-wrap"
                      role="group"
                      aria-labelledby="platforms-legend"
                      aria-describedby="platforms-help"
                    >
                      {[
                        {
                          k: "ios",
                          lab: t("form.platforms.ios"),
                          Icon: FaApple,
                        },
                        {
                          k: "android",
                          lab: t("form.platforms.android"),
                          Icon: FaAndroid,
                        },
                        {
                          k: "webapp",
                          lab: t("form.platforms.webapp"),
                          Icon: FaLaptopCode,
                        },
                      ].map(({ k, lab, Icon }) => {
                        const on = (formData.appPlatforms || []).includes(k);

                        const toggle = () => {
                          const set = new Set(formData.appPlatforms || []);
                          on ? set.delete(k) : set.add(k);
                          handleFormInputChange({
                            name: "appPlatforms",
                            value: Array.from(set),
                          }); // ← oggetto flat, identico a LinkDock
                        };

                        return (
                          <button
                            key={k}
                            type="button"
                            className={`platform-card${on ? " is-on" : ""}`}
                            role="checkbox"
                            aria-checked={on}
                            aria-label={lab}
                            onClick={toggle}
                            onKeyDown={(e) => {
                              if (e.key === " " || e.key === "Enter") {
                                e.preventDefault();
                                toggle();
                              }
                            }}
                            tabIndex={0}
                          >
                            <span className="picon" aria-hidden>
                              <Icon />
                            </span>
                            <span className="plab">{lab}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* <small id="platforms-help" className="chips-help">
                      {t("form.help.platforms")}
                    </small> */}

                  {errors.appPlatforms && (
                    <span className="error-message err-platform" role="alert">
                      <FaExclamationCircle className="error-icon" />
                      {errors.appPlatforms}
                    </span>
                  )}
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
  errors: PropTypes.object,
  PT_PH: PropTypes.string.isRequired,
  BF_PH: PropTypes.string.isRequired,
};

export default InitialForm;
