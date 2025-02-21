// src/components/dynamic-form/DynamicForm.jsx
import { useState, useCallback } from "react";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import "./DynamicForm.css";
import InitialForm from "../initial-form/InitialForm";
import QuestionForm from "../question-form/QuestionForm";
import ContactForm from "../contact-form/ContactForm";
import ThankYouMessage from "../thank-you-message/ThankYouMessage";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

const DynamicForm = () => {
  const [sessionId, setSessionId] = useState(uuidv4());
  const [selectedCategories, setSelectedCategories] = useState([]);
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
  const [isLogoSelected, setIsLogoSelected] = useState(false);
  const [isFontQuestionAsked, setIsFontQuestionAsked] = useState(false);

  const businessFields = ["Seleziona un settore", "Tecnologia", "Moda", "Alimentare", "Altro"];

  const services = {
    Branding: ["Logo", "Brand Identity", "Packaging"],
    Social: ["Content Creation", "Social Media Management", "Advertising"],
    Photo: ["Product Photography", "Fashion Photography", "Event Photography"],
    Video: ["Promo Video", "Social Video", "Motion Graphics"],
    Web: ["Website Design", "E-commerce", "Landing Page"],
    App: ["Mobile App", "Web App", "UI/UX Design"],
  };

  const categoriesRequiringBrand = ["Branding", "Web", "App"];

  const handleRestart = () => {
    setSessionId(uuidv4());
    setSelectedCategories([]);
    setSelectedServices([]);
    setCurrentQuestion(null);
    setQuestionNumber(0);
    setIsCompleted(false);
    setShowThankYou(false);
    setLoading(false);
    setFormData({
      brandName: "",
      projectType: "new",
      businessField: "",
      otherBusinessField: "",
      projectObjectives: "",
      contactInfo: { name: "", email: "", phone: "" },
    });
    setAnswers({});
    setIsLogoSelected(false);
    setIsFontQuestionAsked(false);
  };

  const toggleCategory = useCallback((category) => {
    setSelectedCategories((prev) => {
      const wasSelected = prev.includes(category);
      const newCategories = wasSelected
        ? prev.filter((c) => c !== category)
        : [...prev, category];
      return newCategories;
    });
    setSelectedServices((prev) => {
      const allServices = services[category];
      const wasSelected = allServices.every((service) => prev.includes(service));
      if (wasSelected) {
        return prev.filter((s) => !allServices.includes(s));
      } else {
        return [...new Set([...prev, ...allServices])];
      }
    });
  }, [services]);

  const toggleService = useCallback((service) => {
    setSelectedServices((prev) => {
      const newServices = prev.includes(service)
        ? prev.filter((s) => s !== service)
        : [...prev, service];
      return newServices;
    });
  }, []);

  const handleFormInputChange = useCallback((e) => {
    e.preventDefault();
    const { name, value, type } = e.target;
    if (type === "file") {
      const file = e.target.files[0];
      setFormData((prev) => ({ ...prev, [name]: file }));
    } else {
      setFormData((prev) => {
        const updatedFormData = { ...prev, [name]: value };
        if (name === "businessField" && value !== "Altro") {
          updatedFormData.otherBusinessField = "";
        }
        return updatedFormData;
      });
    }
  }, []);

  const handleAnswerChange = (e) => {
    const { value, checked } = e.target;
    const questionText = currentQuestion.question;
    setAnswers((prev) => {
      const prevOptions = prev[questionText]?.options || [];
      const newOptions = checked
        ? [...prevOptions, value]
        : prevOptions.filter((opt) => opt !== value);
      return { ...prev, [questionText]: { ...prev[questionText], options: newOptions } };
    });
  };

  const handleInputChange = (e) => {
    const { value } = e.target;
    const questionText = currentQuestion.question;
    setAnswers((prev) => ({
      ...prev,
      [questionText]: { ...prev[questionText], input: value },
    }));
  };

  const debounce = (func, wait) => {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  };

  const generateFirstQuestion = useCallback(
    debounce(async () => {
      if (selectedServices.length === 0) {
        alert("Devi selezionare almeno un servizio.");
        return;
      }
      if (!formData.businessField || formData.businessField === "Seleziona un settore") {
        alert("Per favore, seleziona il settore aziendale.");
        return;
      }
      if (formData.businessField === "Altro" && !formData.otherBusinessField.trim()) {
        alert("Per favore, specifica il tuo settore aziendale.");
        return;
      }
  
      setLoading(true);
      try {
        const formDataToSend = new FormData();
        formDataToSend.append("servicesSelected", JSON.stringify(selectedServices));
        formDataToSend.append("sessionId", sessionId);
        for (const key in formData) {
          if (Object.prototype.hasOwnProperty.call(formData, key)) {
            if (key === "currentLogo" && formData[key]) {
              formDataToSend.append(key, formData[key]);
            } else if (key === "contactInfo") {
              formDataToSend.append(key, JSON.stringify(formData[key]));
            } else {
              formDataToSend.append(key, formData[key]);
            }
          }
        }
  
        const response = await axios.post(
          `${API_URL.replace(/\/$/, "")}/api/generate`,
          formDataToSend,
          { headers: { "Content-Type": "multipart/form-data" } }
        );
  
        if (response.data.question && response.data.question.type === "font_selection") {
          setIsFontQuestionAsked(true);
        }
        setCurrentQuestion(response.data.question);
        setQuestionNumber(1);
      } catch (error) {
        console.error("Errore nella generazione della prima domanda AI:", error);
        alert("Errore nella generazione della domanda. Riprova più tardi.");
      } finally {
        setLoading(false);
      }
    }, 300),
    [selectedServices, selectedCategories, formData, sessionId]
  );

  const fetchNextQuestion = async () => {
    setLoading(true);
    try {
      const userAnswer = { [currentQuestion.question]: answers[currentQuestion.question] };
      const response = await axios.post(
        `${API_URL.replace(/\/$/, "")}/api/nextQuestion`,
        { currentAnswer: userAnswer, sessionId },
        { headers: { "Content-Type": "application/json" } }
      );

      const nextQuestion = response.data.question;
      if (!nextQuestion) {
        if (isLogoSelected && !isFontQuestionAsked) {
          const fontQuestion = {
            question: "Quale tipo di font preferisci?",
            type: "font_selection",
            options: ["Serif", "Sans-serif", "Script", "Monospaced", "Manoscritto", "Decorativo"],
            requiresInput: false,
          };
          setCurrentQuestion(fontQuestion);
          setQuestionNumber((prev) => prev + 1);
          setIsFontQuestionAsked(true);
        } else {
          setIsCompleted(true);
          setCurrentQuestion(null);
        }
      } else {
        if (nextQuestion.type === "font_selection") {
          setIsFontQuestionAsked(true);
        }
        setCurrentQuestion(nextQuestion);
        setQuestionNumber((prev) => prev + 1);
      }
    } catch (error) {
      console.error("Errore nel recupero della prossima domanda:", error);
      alert("Errore nel recupero della prossima domanda. Riprova più tardi.");
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

    if (currentQuestion.type === "font_selection") {
      if (selectedOptions.length === 0 && inputAnswer.trim() === "") {
        alert("Per favore, seleziona un font o inserisci il nome di uno.");
        return;
      }
    } else if (currentQuestion.requiresInput) {
      if (inputAnswer.trim() === "") {
        alert("Per favore, inserisci una risposta.");
        return;
      }
    } else {
      if (selectedOptions.length === 0 && inputAnswer.trim() === "") {
        alert("Per favore, seleziona almeno una risposta o inserisci un commento.");
        return;
      }
    }
    fetchNextQuestion();
  };

  const handleSubmitContactInfo = async (e) => {
    e.preventDefault();
    if (!formData.contactInfo.name || !formData.contactInfo.email) {
      alert("Nome ed email sono obbligatori!");
      return;
    }
    setLoading(true);
    try {
      await axios.post(
        `${API_URL.replace(/\/$/, "")}/api/submitLog`,
        { contactInfo: formData.contactInfo, sessionId },
        { headers: { "Content-Type": "application/json" } }
      );
      setShowThankYou(true);
    } catch (error) {
      console.error("Errore nell'invio dei contatti:", error);
      alert("Errore nell'invio dei contatti. Riprova più tardi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dynamic-form">
      <h2>Pronto a Fare Sul Serio?</h2>
      <p><span>Categoria, servizi, clic: fatto.</span> Semplice, no?</p>
      {showThankYou ? (
        <ThankYouMessage handleRestart={handleRestart} />
      ) : isCompleted ? (
        <ContactForm
          formData={formData}
          setFormData={setFormData}
          handleSubmitContactInfo={handleSubmitContactInfo}
          loading={loading}
        />
      ) : currentQuestion ? (
        <QuestionForm
          currentQuestion={currentQuestion}
          questionNumber={questionNumber}
          answers={answers}
          handleAnswerSubmit={handleAnswerSubmit}
          handleInputChange={handleInputChange}
          handleAnswerChange={handleAnswerChange}
          loading={loading}
        />
      ) : (
        <div>
          <InitialForm
            formData={formData}
            handleFormInputChange={handleFormInputChange}
            businessFields={businessFields}
            selectedCategories={selectedCategories}
            toggleCategory={toggleCategory}
            selectedServices={selectedServices}
            toggleService={toggleService}
            services={services}
            categoriesRequiringBrand={categoriesRequiringBrand}
          />
          {selectedCategories.length > 0 && (
            <div className="form-actions">
              <button
                className="submit-btn"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  generateFirstQuestion();
                }}
                disabled={loading}
              >
                {loading ? "Caricamento..." : "Inizia"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DynamicForm;