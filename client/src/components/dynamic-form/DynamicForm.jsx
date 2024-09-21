import { useState } from 'react';
import axios from 'axios';
import './DynamicForm.css'; // Ensure your styles are applied

const DynamicForm = () => {
  const [selectedServices, setSelectedServices] = useState([]);
  const [aiQuestion, setAiQuestion] = useState('');
  const [isCompleted, setIsCompleted] = useState(false);
  const [loading, setLoading] = useState(false);

  const services = ['Logo', 'Website', 'App'];

  // Handle toggling service selection
  const toggleService = (service) => {
    if (selectedServices.includes(service)) {
      setSelectedServices(selectedServices.filter((s) => s !== service));
    } else {
      setSelectedServices([...selectedServices, service]);
    }
  };

  // Make API call to your backend server
  const generateAIQuestion = async (servicesSelected) => {
    setLoading(true);
    try {
      const response = await axios.post(
        'http://localhost:5000/api/generate',  // Make sure this points to your backend
        {
          servicesSelected
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
    generateAIQuestion(selectedServices);
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
          <button className="submit-btn" onClick={handleNext} disabled={selectedServices.length === 0}>
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
