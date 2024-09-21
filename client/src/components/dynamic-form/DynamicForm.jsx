import { useState } from 'react';
import axios from 'axios';
import './DynamicForm.css'; // Ensure your styles are applied

const DynamicForm = () => {
  const [selectedServices, setSelectedServices] = useState([]);
  const [aiQuestion, setAiQuestion] = useState('');
  const [isCompleted, setIsCompleted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    brandName: '',
    projectType: 'new',  // new or restyling
    businessField: '',
    otherBusinessField: '', // if 'Altro' is selected
    projectObjectives: '',
  });

  const services = ['Logo', 'Website', 'App'];
  const businessFields = ['Tecnologia', 'Moda', 'Alimentare', 'Altro'];

  // Handle toggling service selection
  const toggleService = (service) => {
    if (selectedServices.includes(service)) {
      setSelectedServices(selectedServices.filter((s) => s !== service));
    } else {
      setSelectedServices([...selectedServices, service]);
    }
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  // Make API call to your backend server
  const generateAIQuestion = async () => {
    setLoading(true);
    try {
      const response = await axios.post(
        'http://localhost:5001/api/generate',  // Make sure this points to your backend
        {
          servicesSelected: selectedServices,
          formData,  // Send the form data along with selected services
        }
      );
      setAiQuestion(response.data.question);
      setIsCompleted(true);
    } catch (error) {
      console.error('Error generating AI question:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle "Next" button click
  const handleNext = () => {
    generateAIQuestion();
  };

  return (
    <div className="dynamic-form">
      <h2>Client Acquisition Form</h2>
      {!isCompleted ? (
        <div>
          <p>What services are you interested in?</p>
          <div className="selectable-buttons">
            {services.map((service) => (
              <button
                key={service}
                className={`service-btn ${selectedServices.includes(service) ? 'selected' : ''}`}
                onClick={() => toggleService(service)}
              >
                {service}
              </button>
            ))}
          </div>

          {/* Brand or Company Name */}
          <div className="form-group">
            <label>Nome del brand o azienda:</label>
            <input
              type="text"
              name="brandName"
              value={formData.brandName}
              onChange={handleInputChange}
              placeholder="Inserisci il nome del brand o azienda"
            />
          </div>

          {/* Project Type */}
          <div className="form-group">
            <label>Nuovo progetto o restyling?</label>
            <select name="projectType" value={formData.projectType} onChange={handleInputChange}>
              <option value="new">Nuovo</option>
              <option value="restyling">Restyling</option>
            </select>
          </div>

          {/* Business Field */}
          <div className="form-group">
            <label>Settore aziendale:</label>
            <select
              name="businessField"
              value={formData.businessField}
              onChange={handleInputChange}
            >
              {businessFields.map((field) => (
                <option key={field} value={field}>
                  {field}
                </option>
              ))}
              <option value="Altro">Altro</option>
            </select>

            {/* Show input field for 'Altro' */}
            {formData.businessField === 'Altro' && (
              <input
                type="text"
                name="otherBusinessField"
                value={formData.otherBusinessField}
                onChange={handleInputChange}
                placeholder="Descrivi la tua idea di business/brand"
              />
            )}
          </div>

          {/* Submit Button */}
          <button className="submit-btn" onClick={handleNext} disabled={loading}>
            {loading ? 'Loading...' : 'Next'}
          </button>
        </div>
      ) : (
        <div>
          <h3>AI Question:</h3>
          <p>{aiQuestion}</p>
        </div>
      )}
    </div>
  );
};

export default DynamicForm;
