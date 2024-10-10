import PropTypes from "prop-types";
import "./ContactForm.css";

const ContactForm = ({ formData, setFormData, handleSubmitContactInfo, loading }) => {
  const { contactInfo } = formData;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      contactInfo: {
        ...contactInfo,
        [name]: value,
      },
    });
  };

  return (
    <form onSubmit={handleSubmitContactInfo}>
      <div className="form-group">
        <label>Nome:</label>
        <input
          type="text"
          name="name"
          value={contactInfo.name}
          onChange={handleChange}
          placeholder="Inserisci il tuo nome"
          required
        />
      </div>

      <div className="form-group">
        <label>Email:</label>
        <input
          type="email"
          name="email"
          value={contactInfo.email}
          onChange={handleChange}
          placeholder="Inserisci la tua email"
          required
        />
      </div>

      <div className="form-group">
        <label>Telefono:</label>
        <input
          type="tel"
          name="phone"
          value={contactInfo.phone}
          onChange={handleChange}
          placeholder="Inserisci il tuo telefono"
        />
      </div>

      <button type="submit" disabled={loading}>
        {loading ? "Caricamento..." : "Invia"}
      </button>
    </form>
  );
};

ContactForm.propTypes = {
  formData: PropTypes.shape({
    contactInfo: PropTypes.shape({
      name: PropTypes.string.isRequired,
      email: PropTypes.string.isRequired,
      phone: PropTypes.string,
    }).isRequired,
  }).isRequired,
  setFormData: PropTypes.func.isRequired,
  handleSubmitContactInfo: PropTypes.func.isRequired,
  loading: PropTypes.bool.isRequired,
};

export default ContactForm;