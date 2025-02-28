import PropTypes from "prop-types";
import "./ContactForm.css";
import { FaExclamationCircle } from "react-icons/fa";

const ContactForm = ({
  formData,
  setFormData,
  handleSubmitContactInfo,
  loading,
  errors = {},
  setErrors,
}) => {
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

  return (
    <form
      className="contact-form fade-in" // Aggiunto fade-in
      onSubmit={handleSubmitContactInfo}
      noValidate
    >
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
          onChange={handleChange}
          placeholder="Telefono"
          className="form-input"
        />
      </div>
      <div className="form-actions">
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