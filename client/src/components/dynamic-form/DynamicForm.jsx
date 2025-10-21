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
// import { FaExclamationCircle, FaSpinner } from "react-icons/fa";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
gsap.registerPlugin(ScrollTrigger);
import { useTranslation } from "react-i18next";
import PropTypes from "prop-types";

// const useIsomorphicLayoutEffect =
//   typeof window !== "undefined" ? useLayoutEffect : useEffect;

const isValidUrl = (v) => {
  if (!v) return true; // opzionale -> vuoto ok
  try {
    const u = new URL(v.trim());
    return !!u.protocol && !!u.host;
  } catch {
    return false;
  }
};

// Sentinelle stabili per i placeholder (valori non visibili all’utente)
const PT_PH = "__pick_project_type__";
const BF_PH = "__pick_business_field__";

// Valori business field “canonici” (non localizzati)
const BUSINESS_FIELDS = [
  "Tech",
  "Food",
  "Shop",
  "Events",
  "Services",
  "Production",
  "Other",
];

// Regole upload logo (riusabili)
const ALLOWED_LOGO_TYPES = Object.freeze([
  "image/jpeg",
  "image/png",
  "image/tiff",
  "image/svg+xml",
  "application/pdf",
  "image/heic",
  "image/heif",
]);
const MAX_LOGO_BYTES = 5 * 1024 * 1024; // 5 MB

// const useIsMobile = () => {
//   const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
//   useEffect(() => {
//     const onResize = () => setIsMobile(window.innerWidth < 768);
//     window.addEventListener("resize", onResize);
//     return () => window.removeEventListener("resize", onResize);
//   }, []);
//   return isMobile;
// };

const API_BASE = (
  import.meta.env.VITE_API_URL || "http://localhost:8080"
).replace(/\/$/, "");
const api = axios.create({
  baseURL: `${API_BASE}/api`, // sempre verso il dominio API
});

// Invia sempre la lingua in header (oltre che nel body, dove già c'è)
const guessLang = () =>
  (navigator.language || "").toLowerCase().startsWith("it") ? "it" : "en";

api.interceptors.request.use((config) => {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    const bodyLang =
      stored?.formData?.lang || localStorage.getItem("lang") || guessLang();
    const lang = (bodyLang || "en").toLowerCase();
    config.headers = {
      ...(config.headers || {}),
      "X-Lang": lang,
      "Accept-Language": lang,
    };
  } catch {
    // fallback minimale
    const lang = (localStorage.getItem("lang") || guessLang()).toLowerCase();
    config.headers = {
      ...(config.headers || {}),
      "X-Lang": lang,
      "Accept-Language": lang,
    };
  }
  return config;
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

const defaultFormData = {
  brandName: "",
  projectType: PT_PH,
  businessField: BF_PH,
  otherBusinessField: "",
  projectObjectives: "",
  contactInfo: { name: "", email: "", phone: "" },
  budget: "",
  lang: localStorage.getItem("lang") || guessLang(),
  websiteUrl: "",
  instagramUrl: "",
  facebookUrl: "",
  assetsLink: "", // link a Drive/Dropbox per materiali
  referenceUrls: "", // uno o più URL separati da virgola
  iosUrl: "",
  androidUrl: "",
  webappUrl: "",
  repoUrl: "",
  designLink: "",
  appPlatforms: [], // ["ios","android","webapp"]
};

const DynamicForm = ({ scrollTween = null, isMobile = false }) => {
  // const isMobile = useIsMobile();
  const railRef = useRef(null);
  const { t } = useTranslation(["common"]);
  // Converte gli errori: se è una chiave i18n ("form.*") la traduce, altrimenti la lascia com'è.
  const translateErrors = useCallback(
    (errs) => {
      if (!errs) return errs;
      const out = {};
      for (const [k, v] of Object.entries(errs)) {
        out[k] = typeof v === "string" && v.startsWith("form.") ? t(v) : v;
      }
      return out;
    },
    [t]
  );

  const [errors, setErrors] = useState({});

  const normalizePlaceholders = (fd) => {
    const out = { ...fd };

    // Project type
    if (
      out.projectType === "Tipo di progetto" ||
      out.projectType === "Project type" ||
      out.projectType === "Seleziona il tipo di progetto" ||
      out.projectType === "Select project type"
    ) {
      out.projectType = PT_PH;
    }

    // Business field
    if (
      out.businessField === "Ambito" ||
      out.businessField === "Business field" ||
      out.businessField === "Seleziona l’ambito" ||
      out.businessField === "Seleziona l'ambito" || // apostrofi diversi
      out.businessField === "Select business field"
    ) {
      out.businessField = BF_PH;
    }

    return out;
  };

  // Versione localizzata di errors usata SOLO a render time / passaggio ai figli
  const i18nErrors = useMemo(
    () => translateErrors(errors),
    [errors, translateErrors]
  );

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
  const [startLocked, setStartLocked] = useState(false);

  const [answers, setAnswers] = useState({});

  const businessFields = BUSINESS_FIELDS;

  const refsByKey = useRef(new Map());
  const getRefForKey = (key) => {
    if (!refsByKey.current.has(key)) {
      refsByKey.current.set(key, createRef());
    }
    return refsByKey.current.get(key);
  };

  useLayoutEffect(() => {
   const sectionEl = railRef.current;                   // == portfolioElem
   const banner = sectionEl?.querySelector(".form-rail-text"); // == portfolio-text
   if (!sectionEl || !banner) return;

   const ctx = gsap.context(() => {
     if (isMobile) {
       gsap.set(banner, { x: "90vw" });
       gsap.to(banner, {
         x: -200,
         ease: "none",
         scrollTrigger: {
           trigger: banner,
           start: "top 100%",
           end: "top 20%",
           scrub: true,
           invalidateOnRefresh: true,
         },
       });
     } else {
       gsap.set(banner, { willChange: "transform" });
       gsap.to(banner, {
         yPercent: 90,
         ease: "none",
         scrollTrigger: {
           trigger: sectionEl,
           containerAnimation: scrollTween, // CHIAVE identica a Portfolio
           start: "left center",
           end: "right center",
           scrub: 2,
           invalidateOnRefresh: true,
           // markers: true,
         },
       });
     }
   }, railRef);
   return () => ctx.revert();
 }, [isMobile, scrollTween]);

  useEffect(() => {
  // assicura il calcolo corretto dopo mount/resize
  ScrollTrigger.refresh();
}, [isMobile, scrollTween]);

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
          ? { ...defaultFormData, ...normalizePlaceholders(saved.formData) }
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

  // Branding è l'unica categoria che richiede info di brand/logo
  const requiresBrand = selectedCategories.includes("Branding");

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
      projectType: PT_PH,
      businessField: BF_PH,
      otherBusinessField: "",
      projectObjectives: "",
      contactInfo: { name: "", email: "", phone: "" },
      budget: "",
      lang: localStorage.getItem("lang") || guessLang(),
    });

    setAnswers({});
    setErrors({});
    localStorage.removeItem(STORAGE_KEY);
  };

  const toggleCategory = useCallback(
    (category) => {
      setSelectedCategories((prev) => {
        const wasSelected = prev.includes(category);
        const next = wasSelected
          ? prev.filter((c) => c !== category)
          : [...prev, category];

        // se sto togliendo Branding, pulisco i campi collegati
        if (category === "Branding" && wasSelected) {
          setFormData((fd) => ({
            ...fd,
            brandName: "",
            projectType: PT_PH,
            currentLogo: "",
          }));
        }
        return next;
      });

      setSelectedServices((prev) => {
        const allServices = services[category];
        const wasSelected = prev.some((service) =>
          allServices.includes(service)
        );
        return wasSelected
          ? prev.filter((s) => !allServices.includes(s))
          : prev;
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
  }, []);

  // const touchPlatform = (setFn, plat, hasValue) => {
  //   setFn((prev) => {
  //     const set = new Set(prev.appPlatforms || []);
  //     hasValue ? set.add(plat) : set.delete(plat);
  //     return { ...prev, appPlatforms: Array.from(set) };
  //   });
  // };

  const handleFormInputChange = useCallback((e) => {
    // Supporta sia eventi nativi che oggetti {name, value}
    const isEvt = !!e?.target;
    const name = isEvt ? e.target.name : e.name;
    const value = isEvt
      ? e.target.type === "file"
        ? (e.target.files && e.target.files[0]) || ""
        : e.target.value
      : e.value;

    setFormData((prev) => {
      // Copia base
      const next = { ...prev, [name]: value };

      // Reset "other" se cambio ambito
      if (name === "businessField" && value !== "Other") {
        next.otherBusinessField = "";
      }

      // Aggiorna appPlatforms in modo atomico nella stessa setState
      if (["iosUrl", "androidUrl", "webappUrl"].includes(name)) {
        const plat =
          name === "iosUrl"
            ? "ios"
            : name === "androidUrl"
            ? "android"
            : "webapp";
        const set = new Set(prev.appPlatforms || []);
        if (value) set.add(plat);
        else set.delete(plat);
        next.appPlatforms = Array.from(set);
      }

      // Se sto “svuotando” il file logo via pulsante, porta a stringa vuota
      if (name === "currentLogo" && value === "") {
        next.currentLogo = "";
      }

      return next;
    });

    // pulizia errori sul campo toccato
    setErrors((prev) => {
      const updated = { ...prev, [name]: "" };
      return Object.values(updated).every((v) => !v) ? {} : updated;
    });
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

        // ✅ normalizza una sola volta
        const fd = normalizePlaceholders(formData);

        // --- VALIDAZIONE (usa fd, NON formData) ---
        if (selectedServices.length === 0) {
          newErrors.services = "form.errors.services";
        }

        if (fd.businessField === BF_PH) {
          newErrors.businessField = "form.errors.businessField";
        }

        if (fd.businessField === "Other" && !fd.otherBusinessField?.trim()) {
          newErrors.otherBusinessField = "form.errors.otherBusinessField";
        }

        if (requiresBrand && fd.projectType === PT_PH) {
          newErrors.projectType = "form.errors.projectType";
        }

        if (
          requiresBrand &&
          fd.projectType === "restyling" &&
          !fd.currentLogo
        ) {
          newErrors.currentLogo = "form.errors.currentLogo.type";
        } else if (
          requiresBrand &&
          fd.projectType === "restyling" &&
          fd.currentLogo
        ) {
          const file = fd.currentLogo;
          if (!ALLOWED_LOGO_TYPES.includes(file.type)) {
            newErrors.currentLogo = "form.errors.currentLogo.type";
          } else if (file.size > MAX_LOGO_BYTES) {
            newErrors.currentLogo = "form.errors.currentLogo.size";
          }
        }

        if (selectedCategories.includes("App")) {
          if (!Array.isArray(fd.appPlatforms) || fd.appPlatforms.length === 0) {
            newErrors.appPlatforms = "form.errors.appPlatforms";
          }
          if (fd.iosUrl && !isValidUrl(fd.iosUrl))
            newErrors.iosUrl = "form.errors.url";
          if (fd.androidUrl && !isValidUrl(fd.androidUrl))
            newErrors.androidUrl = "form.errors.url";
          if (fd.webappUrl && !isValidUrl(fd.webappUrl))
            newErrors.webappUrl = "form.errors.url";
          if (fd.repoUrl && !isValidUrl(fd.repoUrl))
            newErrors.repoUrl = "form.errors.url";
          if (fd.designLink && !isValidUrl(fd.designLink))
            newErrors.designLink = "form.errors.url";
        }

        if (!fd.budget) {
          newErrors.budget = "form.errors.budget";
        }
        // URL opzionali ma, se presenti, devono essere validi
        if (fd.websiteUrl && !isValidUrl(fd.websiteUrl)) {
          newErrors.websiteUrl = "form.errors.url";
        }
        if (fd.instagramUrl && !isValidUrl(fd.instagramUrl)) {
          newErrors.instagramUrl = "form.errors.url";
        }
        if (fd.facebookUrl && !isValidUrl(fd.facebookUrl)) {
          newErrors.facebookUrl = "form.errors.url";
        }
        if (fd.assetsLink && !isValidUrl(fd.assetsLink)) {
          newErrors.assetsLink = "form.errors.url";
        }
        if (fd.referenceUrls) {
          const bad = fd.referenceUrls
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
            .some((u) => !isValidUrl(u));
          if (bad) newErrors.referenceUrls = "form.errors.urlList";
        }
        // --- FINE VALIDAZIONE ---

        if (Object.keys(newErrors).length > 0) {
          setErrors(newErrors);
          return;
        }

        setLoading(true);
        try {
          // ⛔️ Lascia QUI tutto com'è: usa ancora formData per invio
          const formDataToSend = new FormData();
          formDataToSend.append(
            "servicesSelected",
            JSON.stringify(selectedServices)
          );
          formDataToSend.append("sessionId", sessionId);
          for (const key in formData) {
            if (!Object.prototype.hasOwnProperty.call(formData, key)) continue;
            const val = formData[key];

            if (key === "currentLogo" && val) {
              formDataToSend.append(key, val); // File
            } else if (key === "contactInfo") {
              formDataToSend.append(key, JSON.stringify(val));
            } else if (Array.isArray(val)) {
              formDataToSend.append(key, JSON.stringify(val)); // ← importante per appPlatforms
            } else {
              formDataToSend.append(key, val ?? "");
            }
          }

          const response = await api.post("/generate", formDataToSend, {
            headers: { "Content-Type": "multipart/form-data" },
          });

          const { sessionId: sid, question } = response.data || {};
          if (sid && sid !== sessionId) setSessionId(sid);

          setCurrentQuestion(question);
          setQuestionNumber(1);
          setErrors({});
        } catch (error) {
          console.error(
            "Errore nella generazione della prima domanda AI:",
            error
          );
          setErrors({ general: "form.errors.backend.generate" });
        } finally {
          setLoading(false);
        }
      }, 300),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedServices, selectedCategories, formData, sessionId, t]
  );

  const handleStart = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();

      // se è già in corso o già “armato”, ignora
      if (loading || startLocked) return;

      // blocca subito, prima che scatti il debounce interno
      setStartLocked(true);

      // avvia la catena
      generateFirstQuestion();

      // piccola finestra di lock: si sblocca quando loading cambia
      // come rete di sicurezza, lo sblocchiamo comunque dopo ~1s
      setTimeout(() => setStartLocked(false), 1000);
    },
    [loading, startLocked, generateFirstQuestion]
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
        setCurrentQuestion(nextQuestion);
        setQuestionNumber((prev) => prev + 1);
      }
    } catch (error) {
      console.error("Errore nel recupero della prossima domanda:", error);
      setErrors({ general: "form.errors.backend.nextQuestion" });
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSubmit = (e) => {
    e.preventDefault();
    if (!currentQuestion) return;

    const questionText = currentQuestion.question;
    const userAnswer = answers[questionText] || {};
    const selectedOptions = userAnswer.options || [];
    const inputAnswer = (userAnswer.input || "").trim();

    const newErrors = {};

    if (currentQuestion.type === "font_selection") {
      // serve almeno un'opzione selezionata OPPURE un input non vuoto
      if (selectedOptions.length === 0 && inputAnswer === "") {
        newErrors[questionText] = "form.errors.fontOrName";
      }
    } else if (currentQuestion.requiresInput) {
      // serve input non vuoto
      if (inputAnswer === "") {
        newErrors[questionText] = "form.errors.inputRequired";
      }
    } else {
      // serve almeno un'opzione OPPURE un commento
      if (selectedOptions.length === 0 && inputAnswer === "") {
        newErrors[questionText] = "form.errors.answerOrComment";
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
      newErrors.name = "form.errors.contact.nameRequired";
    }
    if (!formData.contactInfo.email) {
      newErrors.email = "form.errors.contact.emailRequired";
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
      setErrors({ general: "form.errors.backend.contact" });
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

  useEffect(() => {
    const onLang = (e) => {
      const lng = e?.detail === "it" ? "it" : "en";
      setFormData((prev) => ({ ...prev, lang: lng }));
    };
    window.addEventListener("basic:lang", onLang);
    return () => window.removeEventListener("basic:lang", onLang);
  }, []);

  return (
    <div className="form-rail-section" ref={railRef}>
      <div className="form-rail">
        <div className="form-rail-text">{t("form.railText")}</div>
      </div>

      {/* Pannello form (90vw), centrato verticalmente come prima */}
      <div className="dynamic-form">
        {!currentQuestion && !isCompleted && !showThankYou && (
          <div className="dynamic-form-hero">
            <h2>{t("form.hero.title")}</h2>
            {/* <p>
              <span>{t("form.hero.subtitlePrefix")}</span>{" "}
              {t("form.hero.subtitleSuffix")}
            </p> */}
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
                    errors={i18nErrors}
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
            errors={i18nErrors}
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
                errors={i18nErrors}
                PT_PH={PT_PH}
                BF_PH={BF_PH}
                onStart={handleStart}          // NEW
  loading={loading}              // NEW
  startLocked={startLocked} 
              />
              
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default DynamicForm;

DynamicForm.propTypes = {
  scrollTween: PropTypes.object,
  isMobile: PropTypes.bool.isRequired,
};
