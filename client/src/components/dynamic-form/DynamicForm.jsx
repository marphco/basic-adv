import {
  useState,
  useCallback,
  useMemo,
  useRef,
  useEffect,
  createRef,
  useLayoutEffect,
} from "react";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import "./DynamicForm.css";
import InitialForm from "../initial-form/InitialForm";
import QuestionForm from "../question-form/QuestionForm";
import ContactForm from "../contact-form/ContactForm";
import ThankYouMessage from "../thank-you-message/ThankYouMessage";
import { CSSTransition, TransitionGroup } from "react-transition-group";
import { FaExclamationCircle, FaSpinner } from "react-icons/fa";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
gsap.registerPlugin(ScrollTrigger);

const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return isMobile;
};

const API_BASE = (
  import.meta.env.VITE_API_URL || "http://localhost:8080"
).replace(/\/$/, "");
const api = axios.create({
  baseURL: `${API_BASE}/api`, // sempre verso il dominio API
});

const debounce = (func, wait) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// === PERSISTENZA STATO ===
const STORAGE_KEY = "ba_form_state_v1";

const guessLang = () =>
  (navigator.language || "").toLowerCase().startsWith("it") ? "it" : "en";

const defaultFormData = {
  brandName: "",
  projectType: "Tipo di progetto",
  businessField: "Ambito",
  otherBusinessField: "",
  projectObjectives: "",
  contactInfo: { name: "", email: "", phone: "" },
  budget: "",
  lang: localStorage.getItem("lang") || guessLang(),
};

const DynamicForm = () => {
  const isMobile = useIsMobile();
  const railRef = useRef(null);

  const [sessionId, setSessionId] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      return saved.sessionId || uuidv4();
    } catch {
      return uuidv4();
    }
  });

  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedServices, setSelectedServices] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [questionNumber, setQuestionNumber] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [showThankYou, setShowThankYou] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState(defaultFormData);

  const [answers, setAnswers] = useState({});
  // eslint-disable-next-line no-unused-vars
  const [isLogoSelected, setIsLogoSelected] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [isFontQuestionAsked, setIsFontQuestionAsked] = useState(false);
  const [errors, setErrors] = useState({});

  // eslint-disable-next-line no-unused-vars
  const questionRef = useRef(null);

  const businessFields = [
    "Ambito",
    "Tech",
    "Food",
    "Shop",
    "Eventi",
    "Servizi",
    "Produzione",
    "Altro",
  ];

  const refsByKey = useRef(new Map());
  const getRefForKey = (key) => {
    if (!refsByKey.current.has(key)) {
      refsByKey.current.set(key, createRef());
    }
    return refsByKey.current.get(key);
  };

  useLayoutEffect(() => {
    const railEl = railRef.current;
    const txt = railEl?.querySelector(".form-rail-text");
    if (!txt) return;

    const ctx = gsap.context(() => {
      if (isMobile) {
        gsap.set(txt, { x: "90vw" });
        gsap.to(txt, {
          x: -200,
          ease: "none",
          scrollTrigger: {
            trigger: txt,
            start: "top 100%",
            end: "top 20%",
            scrub: true,
            invalidateOnRefresh: true,
          },
        });
      } else {
        const railEl = railRef.current;
        gsap.to(txt, {
          yPercent: 30,
          ease: "none",
          scrollTrigger: {
            trigger: railEl, // la sezione, come in Portfolio
            start: "center top",
            end: "bottom top",
            scrub: 2,
            invalidateOnRefresh: true,
          },
        });
      }
    }, railRef);

    return () => ctx.revert();
  }, [isMobile]);

  // Hydration: ricostruisce lo stato se il sito si ricarica/ridimensiona
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      if (!saved || !saved.sessionId) return;

      setSelectedCategories(saved.selectedCategories || []);
      setSelectedServices(saved.selectedServices || []);
      setCurrentQuestion(saved.currentQuestion || null);
      setQuestionNumber(saved.questionNumber || 0);
      setIsCompleted(!!saved.isCompleted);
      setShowThankYou(!!saved.showThankYou);
      setFormData(
        saved.formData
          ? { ...defaultFormData, ...saved.formData }
          : defaultFormData
      );
      setAnswers(saved.answers || {});
      // eslint-disable-next-line no-empty
    } catch {}
  }, []); // una sola volta al mount

  // Salvataggio debounced su localStorage
  const saveDebounced = useMemo(
    () =>
      debounce((payload) => {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
          // eslint-disable-next-line no-empty
        } catch {}
      }, 300),
    []
  );

  useEffect(() => {
    // Evita di serializzare eventuali File (non serializzabili)
    const safeFormData = { ...formData };
    if (safeFormData.currentLogo instanceof File) {
      safeFormData.currentLogo = "__uploaded__"; // segnaposto
    }

    saveDebounced({
      version: 1,
      ts: Date.now(),
      sessionId,
      selectedCategories,
      selectedServices,
      currentQuestion,
      questionNumber,
      isCompleted,
      showThankYou,
      formData: safeFormData,
      answers,
    });
  }, [
    sessionId,
    selectedCategories,
    selectedServices,
    currentQuestion,
    questionNumber,
    isCompleted,
    showThankYou,
    formData,
    answers,
    saveDebounced,
  ]);

  const services = useMemo(
    () => ({
      Branding: ["Logo", "Brand Identity", "Packaging"],
      Social: ["Content Creation", "Social Media Management", "Advertising"],
      Photo: [
        "Product Photography",
        "Fashion Photography",
        "Event Photography",
      ],
      Video: ["Promo Video", "Corporate Video", "Motion Graphics"],
      Web: ["Website Design", "E-commerce", "Landing Page"],
      App: ["Mobile App", "Web App", "UI/UX Design"],
    }),
    []
  );

  // eslint-disable-next-line react-hooks/exhaustive-deps
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
      projectType: "Tipo di progetto",
      businessField: "Ambito",
      otherBusinessField: "",
      projectObjectives: "",
      contactInfo: { name: "", email: "", phone: "" },
      budget: "",
    });
    setAnswers({});
    setIsLogoSelected(false);
    setIsFontQuestionAsked(false);
    setErrors({});
    localStorage.removeItem(STORAGE_KEY);
  };

  const toggleCategory = useCallback(
    (category) => {
      setSelectedCategories((prev) => {
        const wasSelected = prev.includes(category);
        const newCategories = wasSelected
          ? prev.filter((c) => c !== category)
          : [...prev, category];
        return newCategories;
      });
      setSelectedServices((prev) => {
        const allServices = services[category];
        const wasSelected = prev.some((service) =>
          allServices.includes(service)
        );
        if (wasSelected) {
          return prev.filter((s) => !allServices.includes(s));
        }
        return prev;
      });
      setErrors({});
    },
    [services]
  );

  const toggleService = useCallback((service) => {
    setSelectedServices((prev) => {
      const newServices = prev.includes(service)
        ? prev.filter((s) => s !== service)
        : [...prev, service];
      if (!prev.includes(service) && newServices.length > 0) {
        setErrors((prevErrors) => {
          // eslint-disable-next-line no-unused-vars
          const { services, ...rest } = prevErrors;
          return rest;
        });
      }
      return newServices;
    });
    if (service === "Logo") {
      setIsLogoSelected((prev) => !prev);
    }
  }, []);

  const handleFormInputChange = useCallback((e) => {
    if (e.target) {
      const { name, value, type } = e.target;
      if (type === "file") {
        const file = e.target.files && e.target.files[0];
        if (file) {
          setFormData((prev) => ({ ...prev, [name]: file }));
        }
      } else {
        setFormData((prev) => {
          const updatedFormData = { ...prev, [name]: value };
          if (name === "businessField" && value !== "Altro") {
            updatedFormData.otherBusinessField = "";
          }
          return updatedFormData;
        });
      }
      setErrors((prev) => {
        const updatedErrors = { ...prev, [name]: "" };
        if (Object.values(updatedErrors).every((err) => !err)) {
          return {};
        }
        return updatedErrors;
      });
    } else {
      const { name, value } = e;
      setFormData((prev) => ({ ...prev, [name]: value }));
      setErrors((prev) => {
        const updatedErrors = { ...prev, [name]: "" };
        if (Object.values(updatedErrors).every((err) => !err)) {
          return {};
        }
        return updatedErrors;
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
      return {
        ...prev,
        [questionText]: { ...prev[questionText], options: newOptions },
      };
    });
    setErrors((prev) => {
      const updatedErrors = { ...prev };
      if (checked && updatedErrors[questionText]) {
        delete updatedErrors[questionText];
      }
      if (Object.values(updatedErrors).every((err) => !err)) {
        return {};
      }
      return updatedErrors;
    });
  };

  const handleInputChange = (e) => {
    const { value } = e.target;
    const questionText = currentQuestion.question;
    setAnswers((prev) => ({
      ...prev,
      [questionText]: { ...prev[questionText], input: value },
    }));
    setErrors((prev) => {
      const updatedErrors = { ...prev };
      if (value.trim() && updatedErrors[questionText]) {
        delete updatedErrors[questionText];
      }
      if (Object.values(updatedErrors).every((err) => !err)) {
        return {};
      }
      return updatedErrors;
    });
  };

  const generateFirstQuestion = useMemo(
    () =>
      debounce(async () => {
        let newErrors = {};

        if (selectedServices.length === 0) {
          newErrors.services = "Seleziona almeno un servizio.";
        }
        if (formData.businessField === "Ambito") {
          newErrors.businessField = "Seleziona un ambito.";
        }
        if (
          formData.businessField === "Altro" &&
          !formData.otherBusinessField.trim()
        ) {
          newErrors.otherBusinessField = "Specifica l’ambito.";
        }
        // Validazione di projectType solo se almeno una categoria richiede il brand
        const requiresBrand = selectedCategories.some((cat) =>
          categoriesRequiringBrand.includes(cat)
        );
        if (requiresBrand && formData.projectType === "Tipo di progetto") {
          newErrors.projectType = "Seleziona un tipo di progetto.";
        }
        if (
          requiresBrand &&
          formData.projectType === "restyling" &&
          !formData.currentLogo
        ) {
          newErrors.currentLogo = "Carica un’immagine per il restyling.";
        } else if (
          requiresBrand &&
          formData.projectType === "restyling" &&
          formData.currentLogo
        ) {
          const file = formData.currentLogo;
          const allowedTypes = [
            "image/jpeg",
            "image/png",
            "image/tiff",
            "image/svg+xml",
            "application/pdf",
            "image/heic",
            "image/heif",
          ];
          const maxSize = 5 * 1024 * 1024;
          if (!allowedTypes.includes(file.type)) {
            newErrors.currentLogo =
              "Formato non supportato. Usa JPG, PNG, TIFF, SVG, PDF, HEIC o HEIF.";
          } else if (file.size > maxSize) {
            newErrors.currentLogo = "Il file supera i 5MB.";
          }
        }
        if (!formData.budget) {
          newErrors.budget = "Seleziona un budget.";
        }

        if (Object.keys(newErrors).length > 0) {
          setErrors(newErrors);
          setLoading(false);
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

          const response = await api.post("/generate", formDataToSend, {
            headers: {
              "Content-Type": "multipart/form-data",
              "X-Lang": formData.lang,
              "Accept-Language":
                formData.lang === "en" ? "en-US,en;q=0.9" : "it-IT,it;q=0.9",
            },
          });

          // 👇 prende { sessionId, question } dal server
          const { sessionId: sid, question } = response.data || {};

          // 👇 se il backend decide il sessionId (o lo conferma), mettilo nello stato
          if (sid && sid !== sessionId) {
            setSessionId(sid);
          }

          if (question && question.type === "font_selection") {
            setIsFontQuestionAsked(true);
          }
          setCurrentQuestion(question);
          setQuestionNumber(1);

          // console.log(
          //   "[Provider prima domanda]",
          //   question?.__provider || "unknown"
          // );

          setErrors({});
        } catch (error) {
          console.error(
            "Errore nella generazione della prima domanda AI:",
            error
          );
          setErrors({
            general:
              "Errore nella generazione della domanda.<br />Riprova più tardi.",
          });
        } finally {
          setLoading(false);
        }
      }, 300),
    [
      selectedServices,
      selectedCategories,
      formData,
      sessionId,
      categoriesRequiringBrand,
    ]
  );

  const fetchNextQuestion = async () => {
    setLoading(true);
    try {
      const userAnswer = {
        [currentQuestion.question]: answers[currentQuestion.question],
      };
      const response = await api.post(
        "/nextQuestion",
        { currentAnswer: userAnswer, sessionId },
        {
          headers: {
            "Content-Type": "application/json",
            "X-Lang": formData.lang,
            "Accept-Language":
              formData.lang === "en" ? "en-US,en;q=0.9" : "it-IT,it;q=0.9",
          },
        }
      );

      const nextQuestion = response.data.question;

      // console.log(
      //   "[Provider prossima domanda]",
      //   nextQuestion?.__provider || "unknown"
      // );

      if (!nextQuestion || questionNumber >= 10) {
        setIsCompleted(true);
        setCurrentQuestion(null);
      } else {
        if (nextQuestion.type === "font_selection") {
          setIsFontQuestionAsked(true);
        }
        setCurrentQuestion(nextQuestion);
        setQuestionNumber((prev) => prev + 1);
      }
    } catch (error) {
      console.error("Errore nel recupero della prossima domanda:", error);
      setErrors({
        general: "Errore nel recupero della domanda. Riprova più tardi.",
      });
      setLoading(false);
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
    let newErrors = {};

    if (currentQuestion.type === "font_selection") {
      if (selectedOptions.length === 0 && inputAnswer.trim() === "") {
        newErrors[questionText] =
          "Seleziona un font o inserisci il nome di uno.";
      }
    } else if (currentQuestion.requiresInput) {
      if (inputAnswer.trim() === "") {
        newErrors[questionText] = "Inserisci una risposta.";
      }
    } else {
      if (selectedOptions.length === 0 && inputAnswer.trim() === "") {
        newErrors[questionText] =
          "Seleziona almeno una risposta o inserisci un commento.";
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    fetchNextQuestion();
  };

  const handleSubmitContactInfo = async (e) => {
    e.preventDefault();
    let newErrors = {};

    if (!formData.contactInfo.name) {
      newErrors.name = "Il nome è obbligatorio.";
    }
    if (!formData.contactInfo.email) {
      newErrors.email = "L’email è obbligatoria.";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      // 1) Salva sul DB: se va ok, mostra subito il "grazie"
      await api.post(
        "/submitLog",
        { contactInfo: formData.contactInfo, sessionId },
        { headers: { "Content-Type": "application/json" } }
      );

      setShowThankYou(true); // 👈 non aspettiamo le email

      // 2) Prova a mandare le email in background (non blocca la UX)
      api
        .post(
          "/sendEmails",
          { contactInfo: formData.contactInfo, sessionId },
          { headers: { "Content-Type": "application/json" } }
        )
        .catch((err) => {
          console.error(
            "SendEmails failed:",
            err?.response?.data || err?.message
          );
          // opzionale: potresti loggare lato server se ti serve
        });

      // eslint-disable-next-line no-unused-vars
    } catch (error) {
      setErrors({
        general:
          "Errore nell'invio dei contatti o delle email. Riprova più tardi.",
      });
    } finally {
      setLoading(false);
    }
  };

  // Dopo il "grazie", pulisci lo storage
  useEffect(() => {
    if (showThankYou) {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [showThankYou]);

  // === key + ref per l'istanza corrente della domanda ===
  const qKey = currentQuestion
    ? `${currentQuestion.question}-${questionNumber}`
    : "none";

  const nodeRef = currentQuestion ? getRefForKey(qKey) : null;

  return (
    <div className="form-rail-section" ref={railRef}>
      <div className="form-rail">
        <div className="form-rail-text">
          hai scrollato abbastanza: scegli e partiamo.
        </div>
      </div>

      {/* Pannello form (90vw), centrato verticalmente come prima */}
      <div className="dynamic-form">
        {!currentQuestion && !isCompleted && !showThankYou && (
          <div className="dynamic-form-hero">
            <h2>Pronto a fare sul serio?</h2>
            <p>
              <span>Scegli categoria e servizi.</span> Al resto pensiamo noi.
            </p>
          </div>
        )}

        <div>
          {currentQuestion && (
            <TransitionGroup component={null}>
              <CSSTransition
                key={qKey}
                nodeRef={nodeRef}
                classNames="fade-question"
                timeout={350}
                mountOnEnter
                unmountOnExit
              >
                <div ref={nodeRef}>
                  <QuestionForm
                    currentQuestion={currentQuestion}
                    questionNumber={questionNumber}
                    answers={answers}
                    handleAnswerSubmit={handleAnswerSubmit}
                    handleInputChange={handleInputChange}
                    handleAnswerChange={handleAnswerChange}
                    loading={loading}
                    errors={errors}
                    formData={formData}
                  />
                </div>
              </CSSTransition>
            </TransitionGroup>
          )}
        </div>

        {showThankYou ? (
          <ThankYouMessage handleRestart={handleRestart} />
        ) : isCompleted ? (
          <ContactForm
            formData={formData}
            setFormData={setFormData}
            handleSubmitContactInfo={handleSubmitContactInfo}
            loading={loading}
            errors={errors}
            setErrors={setErrors}
          />
        ) : (
          !currentQuestion && (
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
                errors={errors}
              />
              {selectedCategories.length > 0 && (
                <div className="budget-and-submit">
                  <div className="form-group budget-group">
                    <h3 className="budget-title">Qual è il tuo budget?</h3>
                    <div className="budget-circles">
                      {[
                        { label: "Non lo so", value: "unknown" },
                        { label: "0-1.000 €", value: "0-1000" },
                        { label: "1-5.000 €", value: "1000-5000" },
                        { label: "5-10.000 €", value: "5000-10000" },
                        { label: "+10.000 €", value: "10000+" },
                      ].map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          className={`budget-circle ${
                            formData.budget === option.value ? "selected" : ""
                          }`}
                          onClick={() =>
                            handleFormInputChange({
                              target: { name: "budget", value: option.value },
                            })
                          }
                        >
                          <span className="budget-label">{option.label}</span>
                        </button>
                      ))}
                    </div>
                    {errors.budget && (
                      <span className="error-message budget-error">
                        <FaExclamationCircle className="error-icon" />
                        {errors.budget}
                      </span>
                    )}
                  </div>
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
                      {loading ? (
                        <FaSpinner className="spinner" />
                      ) : (
                        "COMINCIAMO!"
                      )}
                    </button>
                    {errors.general && (
                      <span className="error-message">
                        <FaExclamationCircle className="error-icon" />
                        <span
                          dangerouslySetInnerHTML={{ __html: errors.general }}
                        />
                      </span>
                    )}
                    {Object.keys(errors).length > 0 && !errors.general && (
                      <span className="error-message">
                        <FaExclamationCircle className="error-icon" />
                        Errore nel form. Controlla i campi sopra.
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default DynamicForm;
