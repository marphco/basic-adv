import PropTypes from "prop-types";
import "./ContactForm.css";

const ContactForm = ({ formData, setFormData, handleSubmitContactInfo, loading }) => {
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      contactInfo: {
        ...prevData.contactInfo,
        [name]: value,
      },
    }));
  };

  return (
    <form className="contact-form" onSubmit={handleSubmitContactInfo}>
      <div>
        <label htmlFor="name">Nome:</label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.contactInfo.name}
          onChange={handleChange}
          required
        />
      </div>
      <div>
        <label htmlFor="email">Email:</label>
        <input
          type="email"
          id="email"
          name="email"
          value={formData.contactInfo.email}
          onChange={handleChange}
          required
        />
      </div>
      <div>
        <label htmlFor="phone">Telefono:</label>
        <input
          type="tel"
          id="phone"
          name="phone"
          value={formData.contactInfo.phone}
          onChange={handleChange}
        />
      </div>
      <button type="submit" className="submit-btn" disabled={loading}>
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