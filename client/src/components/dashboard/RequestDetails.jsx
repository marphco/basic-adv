import { useState } from "react";
import PropTypes from "prop-types";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faEnvelope,
  faPhone,
  faEuroSign,
  faCalendar,
  faChartLine,
  faList,
  faRedo,
  faPaperclip,
  faBriefcase,
  faThumbsUp,
  faThumbsDown,
  faTag,
} from "@fortawesome/free-solid-svg-icons";
import ReactMarkdown from "react-markdown";

const RequestDetails = ({ request, setSelectedRequest, API_URL }) => {
  const [activeTab, setActiveTab] = useState("info");

  // Funzione per normalizzare il valore di projectType
  const getProjectTypeDisplay = (projectType) => {
    if (!projectType) return "Non specificato";
    const typeLower = projectType.toLowerCase();
    if (typeLower.includes("new") || typeLower.includes("nuovo"))
      return "Ex Novo";
    if (typeLower.includes("restyling")) return "Restyling";
    return projectType;
  };

  // Funzione per normalizzare le chiavi delle domande (allineata con sanitizeKey)
  const normalizeQuestionKey = (question) => {
    // Sostituiamo i punti con underscore e rimuoviamo il punto interrogativo finale
    return question.replace(/\./g, "_").replace(/\?$/, "");
  };

  const formatDate = (date) => {
    if (!date) return "Data non disponibile";
    const d = new Date(date.$date || date);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  return (
    <div className="request-details">
      <div className="details-sidebar">
        <button onClick={() => setSelectedRequest(null)} className="close-btn">
          Chiudi
        </button>
        <ul>
          <li
            className={activeTab === "info" ? "active" : ""}
            onClick={() => setActiveTab("info")}
          >
            Generali
          </li>
          <li
            className={activeTab === "services" ? "active" : ""}
            onClick={() => setActiveTab("services")}
          >
            Servizi
          </li>
          <li
            className={activeTab === "questions" ? "active" : ""}
            onClick={() => setActiveTab("questions")}
          >
            Domande
          </li>
          <li
            className={activeTab === "plan" ? "active" : ""}
            onClick={() => setActiveTab("plan")}
          >
            Piano d’Azione
          </li>
          <li
            className={activeTab === "attachments" ? "active" : ""}
            onClick={() => setActiveTab("attachments")}
          >
            Allegati
          </li>
        </ul>
      </div>
      <div className="details-content">
        {activeTab === "info" && (
          <div className="info-section">
            <h2>{request.formData.contactInfo.name || "Nome non fornito"}</h2>
            <div className="info-item">
              <FontAwesomeIcon icon={faEnvelope} className="info-icon" />
              <span>{request.formData.contactInfo.email || "-"}</span>
            </div>
            <div className="info-item">
              <FontAwesomeIcon icon={faPhone} className="info-icon" />
              <span>{request.formData.contactInfo.phone || "-"}</span>
            </div>
            <div className="info-item">
              <FontAwesomeIcon icon={faEuroSign} className="info-icon" />
              <span>
                {request.formData.budget === "unknown"
                  ? "Non lo so"
                  : request.formData.budget}
              </span>
            </div>
            <div className="info-item">
              <FontAwesomeIcon icon={faCalendar} className="info-icon" />
              <span>
                {request.createdAt &&
                (request.createdAt.$date ||
                  typeof request.createdAt === "string")
                  ? formatDate(request.createdAt)
                  : "Data non disponibile"}
              </span>
            </div>
            <div className="info-item">
              <FontAwesomeIcon icon={faChartLine} className="info-icon" />
              <span>{request.projectPlan ? "Completa" : "Incompleta"}</span>
            </div>
            <div className="info-item">
              <FontAwesomeIcon
                icon={request.feedback ? faThumbsUp : faThumbsDown}
                className="info-icon"
              />
              <span>
                {request.feedback ? "Visualizzata" : "Non Visualizzata"}
              </span>
            </div>
          </div>
        )}
        {activeTab === "services" && (
          <div className="info-section">
            <h2>Servizi Richiesti</h2>
            {/* Nuova voce per il nome del brand */}
            <div className="info-item">
              <FontAwesomeIcon icon={faTag} className="info-icon" />
              <span>{request.formData.brandName || "Non specificato"}</span>
            </div>
            <div className="info-item">
              <FontAwesomeIcon icon={faList} className="info-icon" />
              <span>
                {request.servicesQueue && request.servicesQueue.length > 0
                  ? request.servicesQueue.join(", ")
                  : "Nessun servizio selezionato"}
              </span>
            </div>
            <div className="info-item">
              <FontAwesomeIcon icon={faRedo} className="info-icon" />
              <span>{getProjectTypeDisplay(request.formData.projectType)}</span>
            </div>
            <div className="info-item">
              <FontAwesomeIcon icon={faPaperclip} className="info-icon" />
              <span>{request.formData.currentLogo ? "Sì" : "No"}</span>
            </div>
            <div className="info-item">
              <FontAwesomeIcon icon={faBriefcase} className="info-icon" />
              <span>{request.formData.businessField || "Non specificato"}</span>
            </div>
          </div>
        )}
        {activeTab === "questions" && (
          <div className="info-section">
            <h2>Domande e Risposte</h2>
            {request.questions.map((q, index) => (
              <div key={index} className="question-answer">
                <p>
                  <strong>{`${index + 1}. ${q.question}`}</strong>
                </p>
                {q.options.length > 0 ? (
                  <>
                    <ul>
                      {q.options.map((option, optIndex) => {
                        const normalizedQuestion = normalizeQuestionKey(q.question);
                        const isSelected =
                          request.answers[normalizedQuestion]?.options?.includes(option);
                        return (
                          <li
                            key={optIndex}
                            className={
                              isSelected ? "answer-badge selected" : "answer-badge"
                            }
                          >
                            {option}
                          </li>
                        );
                      })}
                    </ul>
                    {request.answers[normalizeQuestionKey(q.question)]?.input && (
                      <p className="answer-badge selected">
                        {request.answers[normalizeQuestionKey(q.question)].input}
                      </p>
                    )}
                  </>
                ) : (
                  <p
                    className={
                      request.answers[normalizeQuestionKey(q.question)]?.input ||
                      request.answers[normalizeQuestionKey(q.question)]?.options?.length > 0
                        ? "answer-badge selected"
                        : "answer-badge"
                    }
                  >
                    {request.answers[normalizeQuestionKey(q.question)]?.input ||
                      request.answers[normalizeQuestionKey(q.question)]?.options?.[0] ||
                      "Nessuna risposta"}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
        {activeTab === "plan" && (
          <div className="info-section piano">
            <h2>Piano d’Azione</h2>
            <ReactMarkdown>
              {request.projectPlan || "Non ancora generato"}
            </ReactMarkdown>
          </div>
        )}
        {activeTab === "attachments" && (
          <div className="info-section attachments-section">
            <h2>Allegati</h2>
            {request.formData.currentLogo ? (
              <a
                href={`${API_URL}/api/download/${request.formData.currentLogo}`}
                download
                className="download-btn"
              >
                Scarica Logo Attuale
              </a>
            ) : (
              <p>Nessun allegato disponibile</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

RequestDetails.propTypes = {
  request: PropTypes.object.isRequired,
  setSelectedRequest: PropTypes.func.isRequired,
  API_URL: PropTypes.string.isRequired,
};

export default RequestDetails;