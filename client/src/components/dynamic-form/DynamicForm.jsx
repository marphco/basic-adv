import { useState } from 'react';
import axios from 'axios';
import './DynamicForm.css';

const DynamicForm = () => {
  const [selectedServices, setSelectedServices] = useState([]);
  const [aiQuestions, setAiQuestions] = useState([]);
  const [isCompleted, setIsCompleted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    brandName: '',
    projectType: 'new',
    businessField: '',
    otherBusinessField: '',
    projectObjectives: '',
    contactInfo: { name: '', email: '', phone: '' },
  });
  const [answers, setAnswers] = useState({});
  const [questionCount, setQuestionCount] = useState(0);

  const maxQuestionsPerStep = 4;  // 4 questions per step
  const maxQuestions = 10; // Limit total number of questions
  const services = ['Logo', 'Website', 'App'];
  const businessFields = ['Tecnologia', 'Moda', 'Alimentare', 'Altro'];

  const toggleService = (service) => {
    if (selectedServices.includes(service)) {
      setSelectedServices(selectedServices.filter((s) => s !== service));
    } else {
      setSelectedServices([...selectedServices, service]);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleAnswerChange = (e, questionText) => {
    const { type, value, checked } = e.target;
    if (type === 'checkbox') {
      setAnswers((prev) => ({
        ...prev,
        [questionText]: {
          ...(prev[questionText] || {}),
          [value]: checked,
        },
      }));
    } else {
      setAnswers({ ...answers, [questionText]: value });
    }
  };

  const generateAIQuestion = async () => {
    setLoading(true);
    try {
      const response = await axios.post(
        'http://localhost:5001/api/generate',
        {
          servicesSelected: selectedServices,
          formData,
        }
      );
      setAiQuestions(response.data.questions || []);
      setQuestionCount(1); // Start counting questions
    } catch (error) {
      console.error('Error generating AI questions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNextQuestion = async () => {
    if (questionCount * maxQuestionsPerStep >= maxQuestions) {
      setIsCompleted(true); // End questioning after the set number of questions
      return;
    }
    setLoading(true);
    try {
      const response = await axios.post(
        'http://localhost:5001/api/nextQuestion',
        {
          currentAnswers: answers,
        }
      );
      setAiQuestions(response.data.questions || []);
      setQuestionCount(questionCount + 1); // Increase question count for the next step
    } catch (error) {
      console.error('Error sending answer and generating next question:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitContactInfo = async () => {
    // Send contact information and log
    try {
      await axios.post('http://localhost:5001/api/submitLog', {
        answers,
        contactInfo: formData.contactInfo,
      });
      alert('Thank you! We will reach out to you.');
      // Clear form after submission
      setSelectedServices([]);
      setAiQuestions([]);
      setFormData({
        brandName: '',
        projectType: 'new',
        businessField: '',
        otherBusinessField: '',
        projectObjectives: '',
        contactInfo: { name: '', email: '', phone: '' },
      });
      setAnswers({});
      setQuestionCount(0);
      setIsCompleted(false);
    } catch (error) {
      console.error('Error submitting log:', error);
    }
  };

  return (
    <div className="dynamic-form">
      <h2>Client Acquisition Form</h2>
      {!isCompleted && questionCount === 0 ? (
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

          <div className="form-group">
            <label>Nuovo progetto o restyling?</label>
            <select name="projectType" value={formData.projectType} onChange={handleInputChange}>
              <option value="new">Nuovo</option>
              <option value="restyling">Restyling</option>
            </select>
          </div>

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

          <button className="submit-btn" onClick={generateAIQuestion} disabled={loading}>
            {loading ? 'Loading...' : 'Next'}
          </button>
        </div>
      ) : isCompleted ? (
        <div>
          <h3>Thank you! Please provide your contact info.</h3>
          <div className="form-group">
            <label>Nome:</label>
            <input
              type="text"
              name="name"
              value={formData.contactInfo.name}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  contactInfo: { ...formData.contactInfo, name: e.target.value },
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
                  contactInfo: { ...formData.contactInfo, email: e.target.value },
                })
              }
              placeholder="Inserisci il tuo email"
            />
          </div>

          <div className="form-group">
            <label>Phone (optional):</label>
            <input
              type="tel"
              name="phone"
              value={formData.contactInfo.phone}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  contactInfo: { ...formData.contactInfo, phone: e.target.value },
                })
              }
              placeholder="Inserisci il tuo numero di telefono (facoltativo)"
            />
          </div>

          <button className="submit-btn" onClick={handleSubmitContactInfo} disabled={loading}>
            {loading ? 'Submitting...' : 'Submit'}
          </button>
        </div>
      ) : (
        <div>
          <h3>AI Questions:</h3>
          {aiQuestions.length > 0 ? (
            <form>
              {aiQuestions.slice(0, maxQuestionsPerStep).map((question, index) => (
                <div key={index}>
                  <p>{question.text}</p>
                  {question.type === 'text' && (
                    <input
                      type="text"
                      placeholder="Answer here..."
                      onChange={(e) => handleAnswerChange(e, question.text)}
                    />
                  )}
                  {question.type === 'multiple-choice' && (
                    question.options.map((option, i) => (
                      <div key={i}>
                        <input
                          type="radio"
                          id={option}
                          name={question.text}
                          value={option}
                          onChange={(e) => handleAnswerChange(e, question.text)}
                        />
                        <label htmlFor={option}>{option}</label>
                      </div>
                    ))
                  )}
                  {question.type === 'checkbox' && (
                    question.options.map((option, i) => (
                      <div key={i}>
                        <input
                          type="checkbox"
                          id={option}
                          value={option}
                          onChange={(e) => handleAnswerChange(e, question.text)}
                        />
                        <label htmlFor={option}>{option}</label>
                      </div>
                    ))
                  )}
                </div>
              ))}
              <button className="submit-btn" type="button" onClick={handleNextQuestion}>
                Next Question
              </button>
            </form>
          ) : (
            <p>No questions generated yet.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default DynamicForm;
