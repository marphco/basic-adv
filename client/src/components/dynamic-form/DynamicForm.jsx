// src/components/dynamic-form/DynamicForm.jsx
// import PropTypes from "prop-types";
import { useState } from "react";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import "./DynamicForm.css";

// Importa i componenti figli
import ServiceSelection from "../service-selection/ServiceSelection";
import InitialForm from "../initial-form/InitialForm";
import QuestionForm from "../question-form/QuestionForm";
import ContactForm from "../contact-form/ContactForm";
import ThankYouMessage from "../thank-you-message/ThankYouMessage";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5001";

const DynamicForm = () => {
  // Stati principali
  const [sessionId, setSessionId] = useState(uuidv4()); // ID univoco per la sessione
  const [selectedServices, setSelectedServices] = useState([]); // Servizi selezionati dall'utente
  const [currentQuestion, setCurrentQuestion] = useState(null); // Domanda corrente
  const [questionNumber, setQuestionNumber] = useState(0); // Numero della domanda corrente
  const [isCompleted, setIsCompleted] = useState(false); // Indica se il questionario è completato
  const [showThankYou, setShowThankYou] = useState(false); // Indica se mostrare il messaggio di ringraziamento
  const [loading, setLoading] = useState(false); // Stato di caricamento
  const [formData, setFormData] = useState({
    brandName: "",
    projectType: "new",
    businessField: "",
    otherBusinessField: "",
    projectObjectives: "",
    contactInfo: { name: "", email: "", phone: "" },
  }); // Dati del modulo iniziale
  const [answers, setAnswers] = useState({}); // Risposte dell'utente alle domande

  // **Nuovi Stati**
  const [isLogoSelected, setIsLogoSelected] = useState(false); // Traccia se "logo" è selezionato
  const [isFontQuestionAsked, setIsFontQuestionAsked] = useState(false); // Traccia se la domanda sui font è stata posta

  // Dati statici
  const services = ["Logo", "Website", "App"];
  const businessFields = [
    "Seleziona un settore",
    "Tecnologia",
    "Moda",
    "Alimentare",
    "Altro",
  ];

  // Funzione per resettare lo stato e tornare all'inizio
  const handleRestart = () => {
    // Resetta tutti gli stati ai valori iniziali
    setSessionId(uuidv4());
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

    // Chiama onRestart per informare App.jsx di resettare lo stato
    // if (onRestart) {
    //   onRestart();
    // }
  };

  // Funzione per gestire la selezione dei servizi
  const toggleService = (service) => {
    if (selectedServices.includes(service)) {
      setSelectedServices(selectedServices.filter((s) => s !== service));
      if (service === "Logo") {
        setIsLogoSelected(false);
      }
    } else {
      setSelectedServices([...selectedServices, service]);
      if (service === "Logo") {
        setIsLogoSelected(true);
      }
    }
  };

  // Funzione per gestire i cambiamenti negli input del modulo iniziale
  const handleFormInputChange = (e) => {
    const { name, value, type } = e.target;

    if (type === "file") {
      // Se l'input è di tipo file, ottieni il file selezionato
      const file = e.target.files[0]; // Prende il primo file selezionato
      setFormData((prevFormData) => ({
        ...prevFormData,
        [name]: file,
      }));
    } else {
      setFormData((prevFormData) => {
        const updatedFormData = {
          ...prevFormData,
          [name]: value,
        };

        // Reset di otherBusinessField se businessField cambia e non è "Altro"
        if (name === "businessField" && value !== "Altro") {
          updatedFormData.otherBusinessField = "";
        }

        return updatedFormData;
      });
    }
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

  // Funzione per generare la prima domanda
  const generateFirstQuestion = async () => {
    if (selectedServices.length === 0) {
      alert("Devi selezionare almeno un servizio.");
      return;
    }

    // Validazione dei campi obbligatori
    if (!formData.brandName.trim()) {
      alert("Per favore, inserisci il nome del brand.");
      return;
    }

    if (
      !formData.businessField ||
      formData.businessField === "Seleziona un settore"
    ) {
      alert("Per favore, seleziona il settore aziendale.");
      return;
    }

    if (
      formData.businessField === "Altro" &&
      !formData.otherBusinessField.trim()
    ) {
      alert("Per favore, specifica il tuo settore aziendale.");
      return;
    }

    setLoading(true);
    try {
      const formDataToSend = new FormData();
      formDataToSend.append(
        "servicesSelected",
        JSON.stringify(selectedServices)
      );
      formDataToSend.append("sessionId", sessionId);

      // Aggiungi tutti i campi di formData
      for (const key in formData) {
        if (Object.prototype.hasOwnProperty.call(formData, key)) {
          if (key === "currentLogo" && formData[key]) {
            // Aggiungi il file
            formDataToSend.append(key, formData[key]);
          } else if (key === "contactInfo") {
            // Serializza contactInfo
            formDataToSend.append(key, JSON.stringify(formData[key]));
          } else {
            formDataToSend.append(key, formData[key]);
          }
        }
      }

      const response = await axios.post(
        `${API_URL.replace(/\/$/, "")}/api/generate`,
        formDataToSend,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      // **Aggiorna lo stato se la domanda sui font è inclusa**
      if (
        response.data.question &&
        response.data.question.type === "font_selection"
      ) {
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
  };

  // Funzione per recuperare la domanda successiva
  const fetchNextQuestion = async () => {
    setLoading(true);
    try {
      const userAnswer = {
        [currentQuestion.question]: answers[currentQuestion.question],
      };

      const response = await axios.post(
        `${API_URL.replace(/\/$/, "")}/api/nextQuestion`,
        {
          currentAnswer: userAnswer,
          sessionId,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const nextQuestion = response.data.question;

      if (!nextQuestion) {
        // **Controlla se è necessario aggiungere la domanda sui font**
        if (isLogoSelected && !isFontQuestionAsked) {
          // Definisci la domanda sui font
          const fontQuestion = {
            question: "Quale tipo di font preferisci?",
            type: "font_selection",
            options: [
              "Serif",
              "Sans-serif",
              "Script",
              "Monospaced",
              "Manoscritto",
              "Decorativo",
            ],
            requiresInput: false,
          };

          // Aggiorna lo stato
          setCurrentQuestion(fontQuestion);
          setQuestionNumber((prev) => prev + 1);
          setIsFontQuestionAsked(true);
        } else {
          // Non ci sono più domande
          setIsCompleted(true);
          setCurrentQuestion(null);
        }
      } else {
        // **Aggiorna lo stato se la domanda sui font è inclusa**
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

  // Funzione per gestire l'invio della risposta alla domanda corrente
  const handleAnswerSubmit = (e) => {
    e.preventDefault();

    const questionText = currentQuestion.question;
    const userAnswer = answers[questionText] || {};
    const selectedOptions = userAnswer.options || [];
    const inputAnswer = userAnswer.input || "";

    // Validazione delle risposte
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
        alert(
          "Per favore, seleziona almeno una risposta o inserisci un commento."
        );
        return;
      }
    }

    fetchNextQuestion();
  };

  // Funzione per inviare le informazioni di contatto
  const handleSubmitContactInfo = async (e) => {
    e.preventDefault(); // Assicurati che venga preventDefault per evitare il reload
    setLoading(true);

    try {
      await axios.post(
        `${API_URL.replace(/\/$/, "")}/api/submitLog`,
        {
          contactInfo: formData.contactInfo,
          sessionId,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      
      setShowThankYou(true);
    } catch (error) {
      console.error("Errore nell'invio dei contatti:", error);
      alert("Errore nell'invio dei contatti. Riprova più tardi.");
    } finally {
      setLoading(false);
    }
  };

  // Rendering del componente
  return (
    <div className="dynamic-form">
      <h2>Client Acquisition Form</h2>
      {showThankYou ? (
        // Mostra il messaggio di ringraziamento
        <ThankYouMessage handleRestart={handleRestart} />
      ) : isCompleted ? (
        // Mostra il form per le informazioni di contatto
        <ContactForm
          formData={formData}
          setFormData={setFormData}
          handleSubmitContactInfo={handleSubmitContactInfo}
          loading={loading}
        />
      ) : currentQuestion ? (
        // Mostra il form della domanda corrente
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
        // Mostra il form iniziale
        <div>
          <ServiceSelection
            services={services}
            selectedServices={selectedServices}
            toggleService={toggleService}
          />
          <InitialForm
            formData={formData}
            handleFormInputChange={handleFormInputChange}
            businessFields={businessFields}
          />
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

// DynamicForm.propTypes = {
//   onRestart: PropTypes.func.isRequired,
// };

export default DynamicForm;
