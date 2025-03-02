import { useState } from "react";
import PropTypes from "prop-types";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faEnvelope,
  faPhone,
  faEuroSign,
  faCalendar,
  faChartLine,
} from "@fortawesome/free-solid-svg-icons";

const RequestDetails = ({ request, setSelectedRequest, API_URL }) => {
  const [activeTab, setActiveTab] = useState("info");

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
            Info Generali {/* Fissato a "Info Generali" */}
          </li>
          <li
            className={activeTab === "services" ? "active" : ""}
            onClick={() => setActiveTab("services")}
          >
            Servizi Richiesti
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
                (request.createdAt.$date || typeof request.createdAt === "string")
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
          <div>
            <h3>Servizi Richiesti</h3>
            {request.servicesQueue && request.servicesQueue.length > 0 ? (
              <ul>
                {Array.isArray(request.servicesQueue) ? (
                  request.servicesQueue.map((service, index) => (
                    <li key={index}>{service}</li>
                  ))
                ) : (
                  <li>{String(request.servicesQueue)}</li>
                )}
              </ul>
            ) : (
              <p>Nessun servizio richiesto disponibile</p>
            )}
          </div>
        )}
        {activeTab === "questions" && (
          <div>
            <h3>Domande e Risposte</h3>
            {request.questions.map((q, index) => (
              <div key={index} className="question-answer">
                <p>
                  <strong>{q.question}</strong>
                </p>
                {q.options.length > 0 ? (
                  <ul>
                    {q.options.map((option, optIndex) => (
                      <li
                        key={optIndex}
                        className={
                          request.answers[q.question]?.options?.includes(option)
                            ? "selected"
                            : ""
                        }
                      >
                        {option}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>
                    {request.answers[q.question]?.input || "Nessuna risposta"}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
        {activeTab === "plan" && (
          <div>
            <h3>Piano d’Azione</h3>
            <pre>{request.projectPlan || "Non ancora generato"}</pre>
          </div>
        )}
        {activeTab === "attachments" && (
          <div>
            <h3>Allegati</h3>
            {request.formData.currentLogo ? (
              <a
                href={`${API_URL}/api/download/${request.formData.currentLogo}`}
                download
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