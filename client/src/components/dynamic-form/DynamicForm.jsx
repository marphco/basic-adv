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

const DynamicForm = () => {
  // Stati principali
  const [sessionId] = useState(uuidv4()); // ID univoco per la sessione
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

  // Dati statici
  const services = ["Logo", "Website", "App"];
  const businessFields = ["Tecnologia", "Moda", "Alimentare", "Altro"];

  // Funzione per gestire la selezione dei servizi
  const toggleService = (service) => {
    if (selectedServices.includes(service)) {
      setSelectedServices(selectedServices.filter((s) => s !== service));
    } else {
      setSelectedServices([...selectedServices, service]);
    }
  };

  // Funzione per gestire i cambiamenti negli input del modulo iniziale
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

  // Funzione per generare la prima domanda
  const generateFirstQuestion = async () => {
    if (selectedServices.length === 0) {
      alert("Devi selezionare almeno un servizio.");
      return;
    }

    setLoading(true);
    try {
      const formDataToSend = { ...formData };

      const response = await axios.post("http://localhost:5001/api/generate", {
        servicesSelected: selectedServices,
        formData: formDataToSend,
        sessionId,
      });

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
        "http://localhost:5001/api/nextQuestion",
        {
          currentAnswer: userAnswer,
          sessionId,
        }
      );

      const nextQuestion = response.data.question;

      if (!nextQuestion) {
        // Controlla se "Logo" è selezionato e se la domanda sui font non è ancora stata posta
        if (selectedServices.includes("Logo") && !answers["Seleziona i font desiderati."]) {
          const fontQuestion = {
            question: "Seleziona i font desiderati.",
            type: "font_selection",
            options: ["Serif", "Sans-serif", "Script", "Monospaced", "Manoscritto", "Decorativo"],
            requiresInput: true, // Impostato a true per gestire anche font personalizzati
          };
          setCurrentQuestion(fontQuestion);
          setQuestionNumber((prev) => prev + 1);
        } else {
          // Non ci sono più domande
          setIsCompleted(true);
          setCurrentQuestion(null);
        }
      } else {
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
        alert("Per favore, seleziona almeno una risposta o inserisci un commento.");
        return;
      }
    }

    fetchNextQuestion();
  };

  // Funzione per inviare le informazioni di contatto
  const handleSubmitContactInfo = async () => {
    setLoading(true);
    try {
      await axios.post("http://localhost:5001/api/submitLog", {
        contactInfo: formData.contactInfo, // Assicurati che formData.contactInfo sia gestito correttamente
        sessionId,
      });
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
        <ThankYouMessage />
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
      ) : isCompleted ? (
        // Mostra il form per le informazioni di contatto
        <ContactForm
          formData={formData}
          setFormData={setFormData}
          handleSubmitContactInfo={handleSubmitContactInfo}
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

// Definizione delle propTypes (vuote in questo caso)
DynamicForm.propTypes = {};

export default DynamicForm;