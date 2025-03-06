import PropTypes from "prop-types";
import "./ContactForm.css";
import { FaExclamationCircle } from "react-icons/fa";
import { useState } from "react";
import { Link } from "react-router-dom";

const ContactForm = ({
  formData,
  setFormData,
  handleSubmitContactInfo,
  loading,
  errors = {},
  setErrors,
}) => {
  const [privacyConsent, setPrivacyConsent] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      contactInfo: {
        ...prevData.contactInfo,
        [name]: value,
      },
    }));
    setErrors((prev) => {
      const updatedErrors = { ...prev };
      if (value.trim() && updatedErrors[name]) {
        delete updatedErrors[name];
      }
      if (Object.values(updatedErrors).every((err) => !err)) {
        return {};
      }
      return updatedErrors;
    });
  };

  const handlePhoneInput = (e) => {
    const { name, value } = e.target;
    const filteredValue = value
      .replace(/[^0-9+]/g, "")
      .replace(/(^\+[^0-9])|(\+.*\+)/g, (match, p1) => (p1 ? "" : "+"));

    setFormData((prevData) => ({
      ...prevData,
      contactInfo: {
        ...prevData.contactInfo,
        [name]: filteredValue,
      },
    }));
  };

  const handlePrivacyConsentChange = (e) => {
    setPrivacyConsent(e.target.checked);
    setErrors((prev) => {
      const updatedErrors = { ...prev };
      if (e.target.checked && updatedErrors.privacyConsent) {
        delete updatedErrors.privacyConsent;
      }
      return updatedErrors;
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    let newErrors = {};

    if (!formData.contactInfo.name.trim()) {
      newErrors.name = "Il nome è obbligatorio";
    }
    if (!formData.contactInfo.email.trim()) {
      newErrors.email = "L'email è obbligatoria";
    } else if (!/\S+@\S+\.\S+/.test(formData.contactInfo.email)) {
      newErrors.email = "Inserisci un'email valida";
    }

    if (!privacyConsent) {
      newErrors.privacyConsent = "Devi accettare la Privacy Policy";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    handleSubmitContactInfo(e);
  };

  return (
    <form className="contact-form fade-in" onSubmit={handleSubmit} noValidate>
      <h2 className="contact-cta">
        Ci siamo! Lascia i tuoi contatti e ci sentiamo presto –{" "}
        <span>niente spam, promesso!</span>
      </h2>
      <div className="form-group">
        <input
          type="text"
          id="name"
          name="name"
          value={formData.contactInfo.name}
          onChange={handleChange}
          placeholder="Nome *"
          required
          className="form-input"
        />
        {errors.name && (
          <span className="error-message">
            <FaExclamationCircle className="error-icon" />
            {errors.name}
          </span>
        )}
      </div>
      <div className="form-group">
        <input
          type="email"
          id="email"
          name="email"
          value={formData.contactInfo.email}
          onChange={handleChange}
          placeholder="Email *"
          required
          className="form-input"
        />
        {errors.email && (
          <span className="error-message">
            <FaExclamationCircle className="error-icon" />
            {errors.email}
          </span>
        )}
      </div>
      <div className="form-group">
        <input
          type="tel"
          id="phone"
          name="phone"
          value={formData.contactInfo.phone}
          onChange={handlePhoneInput}
          placeholder="Telefono"
          pattern="[0-9]*|(\+[0-9]+)"
          className="form-input"
        />
      </div>
      <div className="form-actions">
        <div className="privacy-consent">
          <label className="privacy-consent-label">
            <input
              type="checkbox"
              checked={privacyConsent}
              onChange={handlePrivacyConsentChange}
              required
            />
            <span className="consent-text">Accetto il trattamento dei miei dati personali ai sensi della <Link to="/privacy-policy">Privacy Policy</Link>.</span>
          </label>
          {errors.privacyConsent && (
            <span className="error-message">
              <FaExclamationCircle className="error-icon" />
              {errors.privacyConsent}
            </span>
          )}
        </div>
        <button type="submit" className="contact-submit-btn" disabled={loading}>
          {loading ? "Invio..." : "Invia"}
        </button>
      </div>
    </form>
  );
};

ContactForm.propTypes = {
  formData: PropTypes.object.isRequired,
  setFormData: PropTypes.func.isRequired,
  handleSubmitContactInfo: PropTypes.func.isRequired,
  loading: PropTypes.bool.isRequired,
  errors: PropTypes.object,
  setErrors: PropTypes.func.isRequired,
};

export default ContactForm;