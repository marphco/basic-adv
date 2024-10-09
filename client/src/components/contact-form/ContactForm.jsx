import PropTypes from "prop-types";
import "./ContactForm.css";

const ContactForm = ({
  formData,
  setFormData,
  handleSubmitContactInfo,
  loading,
}) => (
  <div>
    <h3>Grazie! Inserisci i tuoi contatti.</h3>
    {/* Form per i contatti */}
    <div className="form-group">
      <label>Nome:</label>
      <input
        type="text"
        name="name"
        value={formData.contactInfo.name}
        onChange={(e) =>
          setFormData({
            ...formData,
            contactInfo: {
              ...formData.contactInfo,
              name: e.target.value,
            },
          })
        }
        placeholder="Inserisci il tuo nome"
      />
    </div>

    <div className="form-group">
      <label>Email:</label>
      <input
        type="email"
        name="email"
        value={formData.contactInfo.email}
        onChange={(e) =>
          setFormData({
            ...formData,
            contactInfo: {
              ...formData.contactInfo,
              email: e.target.value,
            },
          })
        }
        placeholder="Inserisci la tua email"
      />
    </div>

    <div className="form-group">
      <label>Telefono (facoltativo):</label>
      <input
        type="tel"
        name="phone"
        value={formData.contactInfo.phone}
        onChange={(e) =>
          setFormData({
            ...formData,
            contactInfo: {
              ...formData.contactInfo,
              phone: e.target.value,
            },
          })
        }
        placeholder="Inserisci il tuo numero di telefono (facoltativo)"
      />
    </div>

    <button
      className="submit-btn"
      onClick={handleSubmitContactInfo}
      disabled={loading}
    >
      {loading ? "Invio..." : "Invia"}
    </button>
  </div>
);

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
