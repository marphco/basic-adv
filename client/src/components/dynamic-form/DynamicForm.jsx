import { useState } from "react";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import "./DynamicForm.css";

const DynamicForm = () => {
  const [sessionId] = useState(uuidv4());
  const [selectedServices, setSelectedServices] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [questionNumber, setQuestionNumber] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [showThankYou, setShowThankYou] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    brandName: "",
    projectType: "new",
    businessField: "",
    otherBusinessField: "",
    projectObjectives: "",
    contactInfo: { name: "", email: "", phone: "" },
  });
  const [answers, setAnswers] = useState({});

  const services = ["Logo", "Website", "App"];
  const businessFields = ["Tecnologia", "Moda", "Alimentare", "Altro"];

  const toggleService = (service) => {
    if (selectedServices.includes(service)) {
      setSelectedServices(selectedServices.filter((s) => s !== service));
    } else {
      setSelectedServices([...selectedServices, service]);
    }
  };

  const handleFormInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // Funzione per gestire le selezioni multiple con checkbox
  const handleAnswerChange = (e) => {
    const { value, checked } = e.target;
    const questionText = currentQuestion.question;

    setAnswers((prevAnswers) => {
      const prevOptions = prevAnswers[questionText]?.options || [];
      const newOptions = checked
        ? [...prevOptions, value]
        : prevOptions.filter((option) => option !== value);

      return {
        ...prevAnswers,
        [questionText]: {
          ...prevAnswers[questionText],
          options: newOptions,
        },
      };
    });
  };

  // Funzione per gestire l'input testuale
  const handleInputChange = (e) => {
    const { value } = e.target;
    const questionText = currentQuestion.question;

    setAnswers((prevAnswers) => ({
      ...prevAnswers,
      [questionText]: {
        ...prevAnswers[questionText],
        input: value,
      },
    }));
  };

  const generateFirstQuestion = async () => {
    if (selectedServices.length === 0) {
      alert("Devi selezionare almeno un servizio.");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post("http://localhost:5001/api/generate", {
        servicesSelected: selectedServices,
        formData,
        sessionId,
      });

      setCurrentQuestion(response.data.question);
      setQuestionNumber(1);
    } catch (error) {
      console.error("Errore nella generazione della prima domanda AI:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchNextQuestion = async () => {
    setLoading(true);
    try {
      const userAnswer = {
        [currentQuestion.question]: answers[currentQuestion.question],
      };

      const response = await axios.post(
        "http://localhost:5001/api/nextQuestion",
        {
          currentAnswer: userAnswer,
          sessionId,
        }
      );

      const nextQuestion = response.data.question;

      if (questionNumber >= 10 || !nextQuestion) {
        // Abbiamo raggiunto il limite di domande o non ci sono più domande
        setIsCompleted(true);
        setCurrentQuestion(null);
      } else {
        setCurrentQuestion(nextQuestion);
        setQuestionNumber((prev) => prev + 1);
      }
    } catch (error) {
      console.error("Errore nel recupero della prossima domanda:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSubmit = (e) => {
    e.preventDefault();

    const questionText = currentQuestion.question;
    const userAnswer = answers[questionText] || {};
    const selectedOptions = userAnswer.options || [];
    const inputAnswer = userAnswer.input || "";

    // Validazione delle risposte
    if (currentQuestion.requiresInput) {
      if (inputAnswer.trim() === "") {
        alert("Per favore, inserisci una risposta.");
        return;
      }
    } else {
      if (selectedOptions.length === 0 && inputAnswer.trim() === "") {
        alert(
          "Per favore, seleziona almeno una risposta o inserisci un commento."
        );
        return;
      }
    }

    fetchNextQuestion();
  };

  const handleSubmitContactInfo = async () => {
    setLoading(true);
    try {
      await axios.post("http://localhost:5001/api/submitLog", {
        contactInfo: formData.contactInfo,
        sessionId,
      });
      setShowThankYou(true);
    } catch (error) {
      console.error("Errore nell'invio dei contatti:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dynamic-form">
      <h2>Client Acquisition Form</h2>
      {showThankYou ? (
        <div>
          <h3>Grazie! Ti contatteremo a breve.</h3>
        </div>
      ) : currentQuestion ? (
        <div>
          <h3>{currentQuestion.question}</h3>
          <form onSubmit={handleAnswerSubmit}>
            {currentQuestion.requiresInput ? (
              // Mostra solo il campo di input
              <div className="form-group">
                <label>Risposta:</label>
                <textarea
                  name="inputAnswer"
                  placeholder="Inserisci la tua risposta qui..."
                  value={answers[currentQuestion.question]?.input || ""}
                  onChange={handleInputChange}
                ></textarea>
              </div>
            ) : (
              <>
                {/* Mostra le opzioni con i checkbox */}
                {currentQuestion.options &&
                  currentQuestion.options.length > 0 &&
                  currentQuestion.options.map((option, index) => (
                    <div key={index}>
                      <input
                        type="checkbox"
                        id={`option_${index}`}
                        name={`answer_${questionNumber}`}
                        value={option}
                        checked={
                          answers[currentQuestion.question]?.options
                            ? answers[currentQuestion.question].options.includes(
                                option
                              )
                            : false
                        }
                        onChange={handleAnswerChange}
                      />
                      <label htmlFor={`option_${index}`}>{option}</label>
                    </div>
                  ))}

                {/* Campo di input opzionale */}
                <div className="form-group">
                  <label>Vuoi aggiungere qualcosa?</label>
                  <textarea
                    name="inputAnswer"
                    placeholder="Inserisci ulteriori dettagli qui..."
                    value={answers[currentQuestion.question]?.input || ""}
                    onChange={handleInputChange}
                  ></textarea>
                </div>
              </>
            )}

            {loading ? (
              <p>Caricamento...</p>
            ) : (
              <button className="submit-btn" type="submit">
                Invia
              </button>
            )}
          </form>
        </div>
      ) : isCompleted ? (
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
      ) : (
        <div>
          {/* Form iniziale */}
          <p>Quali servizi ti interessano?</p>
          <div className="selectable-buttons">
            {services.map((service) => (
              <button
                key={service}
                className={`service-btn ${
                  selectedServices.includes(service) ? "selected" : ""
                }`}
                onClick={() => toggleService(service)}
              >
                {service}
              </button>
            ))}
          </div>

          {/* Nome del brand o azienda */}
          <div className="form-group">
            <label>Nome del brand o azienda:</label>
            <input
              type="text"
              name="brandName"
              value={formData.brandName}
              onChange={handleFormInputChange}
              placeholder="Inserisci il nome del brand o azienda"
            />
          </div>

          {/* Tipo di progetto */}
          <div className="form-group">
            <label>Nuovo progetto o restyling?</label>
            <select
              name="projectType"
              value={formData.projectType}
              onChange={handleFormInputChange}
            >
              <option value="new">Nuovo</option>
              <option value="restyling">Restyling</option>
            </select>
          </div>

          {/* Settore aziendale */}
          <div className="form-group">
            <label>Settore aziendale:</label>
            <select
              name="businessField"
              value={formData.businessField}
              onChange={handleFormInputChange}
            >
              {businessFields.map((field) => (
                <option key={field} value={field}>
                  {field}
                </option>
              ))}
            </select>

            {formData.businessField === "Altro" && (
              <input
                type="text"
                name="otherBusinessField"
                value={formData.otherBusinessField}
                onChange={handleFormInputChange}
                placeholder="Descrivi la tua idea di business/brand"
              />
            )}
          </div>

          <button
            className="submit-btn"
            onClick={generateFirstQuestion}
            disabled={loading}
          >
            {loading ? "Caricamento..." : "Inizia"}
          </button>
        </div>
      )}
    </div>
  );
};

export default DynamicForm;
