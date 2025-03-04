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
} from "@fortawesome/free-solid-svg-icons";
import ReactMarkdown from "react-markdown"; // Importa la libreria

const RequestDetails = ({ request, setSelectedRequest, API_URL }) => {
  const [activeTab, setActiveTab] = useState("info");

  // Funzione per normalizzare il valore di projectType
  const getProjectTypeDisplay = (projectType) => {
    if (!projectType) return "Non specificato";
    const typeLower = projectType.toLowerCase();
    if (typeLower.includes("new") || typeLower.includes("nuovo"))
      return "Ex Novo";
    if (typeLower.includes("restyling")) return "Restyling";
    return projectType; // Se non è né "new/nuovo" né "restyling", mostra il valore originale
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
                  ? new Date(
                      request.createdAt.$date || request.createdAt
                    ).toLocaleDateString()
                  : "Data non disponibile"}
              </span>
            </div>
            <div className="info-item">
              <FontAwesomeIcon icon={faChartLine} className="info-icon" />
              <span>{request.projectPlan ? "Completata" : "In attesa"}</span>
            </div>
          </div>
        )}
        {activeTab === "services" && (
          <div className="info-section">
            <h2>Servizi Richiesti</h2>
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
          <div>
            <h2>Domande e Risposte</h2>
            {request.questions.map((q, index) => (
              <div key={index} className="question-answer">
                <p>
                  <strong>{`${index + 1}. ${q.question}`}</strong>
                </p>
                {q.options.length > 0 ? (
                  <ul>
                    {q.options.map((option, optIndex) => {
                      const isSelected =
                        request.answers[q.question]?.options?.includes(option);
                      return (
                        <li
                          key={optIndex}
                          className={
                            isSelected
                              ? "answer-badge selected"
                              : "answer-badge"
                          }
                        >
                          {option}
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p
                    className={
                      request.answers[q.question]?.input ||
                      request.answers[q.question]?.options?.length > 0
                        ? "answer-badge selected"
                        : "answer-badge"
                    }
                  >
                    {request.answers[q.question]?.input ||
                      request.answers[q.question]?.options?.[0] ||
                      "Nessuna risposta"}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
        {activeTab === "plan" && (
          <div className="piano">
            <h2>Piano d’Azione</h2>
            <ReactMarkdown>
              {request.projectPlan || "Non ancora generato"}
            </ReactMarkdown>
          </div>
        )}
        {activeTab === "attachments" && (
          <div className="attachments-section">
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
