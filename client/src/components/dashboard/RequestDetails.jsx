import { useState, useEffect } from "react";
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
  faMinus,
} from "@fortawesome/free-solid-svg-icons";
import ReactMarkdown from "react-markdown";
import axios from "axios";

const RequestDetails = ({ request, setSelectedRequest, API_URL, onRatingsPatch }) => {
  const [activeTab, setActiveTab] = useState("info");

  const [localRatings, setLocalRatings] = useState({});

   // patcha anche il selectedRequest nel parent, così rimane “in memoria”
  const patchParentRatings = (key, field, value) => {
    setSelectedRequest((prev) => {
      if (!prev) return prev;
      // normalizza eventuale Map -> object
      const prevRatings =
        prev.ratings && !(prev.ratings instanceof Map)
          ? prev.ratings
          : Object.fromEntries(prev.ratings || []);
      const nextRatings = {
        ...prevRatings,
        [key]: { ...(prevRatings?.[key] || {}), [field]: value },
      };
      return { ...prev, ratings: nextRatings };
    });
    if (onRatingsPatch) {
    onRatingsPatch(request.sessionId, key, field, value);
  }
  };

  // Normalizza "projectType" per la UI
  const getProjectTypeDisplay = (projectType) => {
    if (!projectType) return "Non specificato";
    const typeLower = projectType.toLowerCase();
    if (typeLower.includes("new") || typeLower.includes("nuovo"))
      return "Ex Novo";
    if (typeLower.includes("restyling")) return "Restyling";
    return projectType;
  };

  // Normalizza chiave domanda (match con sanitizeKey lato server)
  const normalizeQuestionKey = (question) =>
    question.replace(/\./g, "_").replace(/\?$/, "");

  const formatDate = (date) => {
    if (!date) return "Data non disponibile";
    const d = new Date(date.$date || date);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // === RL rating helpers =====================================================

  // Costruisce lo "state" da inviare al servizio RL
  const buildRlState = () => {
    const service =
      (request.servicesQueue && request.servicesQueue[0]) || "Logo";
    return {
      service,
      budget: request.formData?.budget || "unknown",
      industry: request.formData?.businessField || "Altro",
      brandNameKnown: !!request.formData?.brandName,
      isRestyling: /restyling/i.test(request.formData?.projectType || ""),
    };
  };

  const sendRate = async (q, { questionReward, optionsReward } = {}) => {
    const state = buildRlState();
    const payload = {
      sessionId: request.sessionId,
      state,
      question: q.question,
      options: Array.isArray(q.options) ? q.options : [],
      timestamp: new Date(),
    };
    if (questionReward !== undefined) payload.questionReward = questionReward; // incluso anche se null (clear)
    if (optionsReward !== undefined) payload.optionsReward = optionsReward; // incluso anche se null (clear)

    await axios.put(`${API_URL}/api/rl/rate`, payload, {
      headers: { "Content-Type": "application/json" },
      withCredentials: false,
    });
  };

  const rateQuestion = async (q, val) => {
    const key = normalizeQuestionKey(q.question);
    const current = localRatings[key]?.q ?? null;
    const nextVal = current === val ? null : val; // toggle → null
    await sendRate(q, { questionReward: nextVal }); // <-- NON mandiamo optionsReward
    setLocalRatings((prev) => ({
      ...prev,
      [key]: { ...(prev[key] || {}), q: nextVal },
    }));
    patchParentRatings(key, "q", nextVal);
  };

  const rateOptions = async (q, val) => {
    const key = normalizeQuestionKey(q.question);
    const current = localRatings[key]?.o ?? null;
    const nextVal = current === val ? null : val; // toggle → null
    await sendRate(q, { optionsReward: nextVal }); // <-- NON mandiamo questionReward
    setLocalRatings((prev) => ({
      ...prev,
      [key]: { ...(prev[key] || {}), o: nextVal },
    }));
    patchParentRatings(key, "o", nextVal);
  };

  useEffect(() => {
    const src = request.ratings || {};
    const obj = src instanceof Map ? Object.fromEntries(src) : src;
    setLocalRatings(obj);
  }, [request.sessionId, request.ratings]);

  // ===========================================================================
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

            {request.questions.map((q, index) => {
              const k = normalizeQuestionKey(q.question);
              const ans =
                request.answers?.[k] || request.answers?.[q.question] || {};

              return (
                <div key={k} className="question-answer">
                  <p>
                    <strong>{`${index + 1}. ${q.question}`}</strong>
                  </p>

                  {Array.isArray(q.options) && q.options.length > 0 ? (
                    <>
                      <ul>
                        {q.options.map((option, optIndex) => {
                          const isSelected =
                            Array.isArray(ans.options) &&
                            ans.options.includes(option);
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
                      {ans.input && (
                        <p className="answer-badge selected">{ans.input}</p>
                      )}
                    </>
                  ) : (
                    <p
                      className={
                        ans.input || (ans.options && ans.options.length)
                          ? "answer-badge selected"
                          : "answer-badge"
                      }
                    >
                      {ans.input ||
                        (ans.options && ans.options[0]) ||
                        "Nessuna risposta"}
                    </p>
                  )}

                  <div className="rating-row" style={{ marginTop: 10 }}>
                    {/* Domanda */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        flexWrap: "wrap",
                      }}
                    >
                      <span className="rating-label">Valuta la domanda</span>
                      <button
                        className={`chip ${
                          localRatings[k]?.q === 1 ? "active" : ""
                        }`}
                        title="Buona (+1)"
                        onClick={() => rateQuestion(q, 1)}
                      >
                        <FontAwesomeIcon icon={faThumbsUp} />
                      </button>
                      <button
                        className={`chip ${
                          localRatings[k]?.q === 0 ? "active" : ""
                        }`}
                        title="Ok (0)"
                        onClick={() => rateQuestion(q, 0)}
                      >
                        <FontAwesomeIcon icon={faMinus} />
                      </button>
                      <button
                        className={`chip ${
                          localRatings[k]?.q === -1 ? "active" : ""
                        }`}
                        title="Scarta (-1)"
                        onClick={() => rateQuestion(q, -1)}
                      >
                        <FontAwesomeIcon icon={faThumbsDown} />
                      </button>
                    </div>

                    {/* Opzioni */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        flexWrap: "wrap",
                        marginTop: 8,
                      }}
                    >
                      <span className="rating-label">Valuta le opzioni</span>
                      <button
                        className={`chip ${
                          localRatings[k]?.o === 1 ? "active" : ""
                        }`}
                        title="Buone (+1)"
                        onClick={() => rateOptions(q, 1)}
                      >
                        <FontAwesomeIcon icon={faThumbsUp} />
                      </button>
                      <button
                        className={`chip ${
                          localRatings[k]?.o === 0 ? "active" : ""
                        }`}
                        title="Ok (0)"
                        onClick={() => rateOptions(q, 0)}
                      >
                        <FontAwesomeIcon icon={faMinus} />
                      </button>
                      <button
                        className={`chip ${
                          localRatings[k]?.o === -1 ? "active" : ""
                        }`}
                        title="Scarta (-1)"
                        onClick={() => rateOptions(q, -1)}
                      >
                        <FontAwesomeIcon icon={faThumbsDown} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
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
                href={`${API_URL}/api/download/${encodeURIComponent(
                  request.formData.currentLogo
                )}`}
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
  onRatingsPatch: PropTypes.func,
};

export default RequestDetails;
