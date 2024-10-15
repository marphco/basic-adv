import PropTypes from "prop-types";
import "./ContactForm.css";

const ContactForm = ({ formData, setFormData, handleSubmitContactInfo, loading }) => {
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      contactInfo: {
        ...formData.contactInfo,
        [name]: value,
      },
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleSubmitContactInfo();
  };

  return (
    <form onSubmit={handleSubmit} className="contact-form">
      <h3>Inserisci le tue informazioni di contatto:</h3>
      <div className="form-group">
        <label>Nome:</label>
        <input
          type="text"
          name="name"
          value={formData.contactInfo.name}
          onChange={handleChange}
          required
        />
      </div>
      <div className="form-group">
        <label>Email:</label>
        <input
          type="email"
          name="email"
          value={formData.contactInfo.email}
          onChange={handleChange}
          required
        />
      </div>
      <div className="form-group">
        <label>Telefono:</label>
        <input
          type="tel"
          name="phone"
          value={formData.contactInfo.phone}
          onChange={handleChange}
        />
      </div>
      <button type="submit" disabled={loading}>
        {loading ? "Invio..." : "Invia"}
      </button>
    </form>
  );
};

ContactForm.propTypes = {
  formData: PropTypes.object.isRequired,
  setFormData: PropTypes.func.isRequired,
  handleSubmitContactInfo: PropTypes.func.isRequired,
  loading: PropTypes.bool.isRequired,
};

export default ContactForm;
