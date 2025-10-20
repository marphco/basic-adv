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
import {
  FaGlobe,
  FaInstagram,
  FaFacebook,
  FaFolderOpen,
  FaGithub,
  FaApple,
  FaAndroid,
  FaLaptopCode,
  FaLink as FaLinkIcon,
} from "react-icons/fa";
import { SiFigma } from "react-icons/si";
import ReactMarkdown from "react-markdown";
import axios from "axios";

const RequestDetails = ({
  request,
  setSelectedRequest,
  API_URL,
  onRatingsPatch,
}) => {
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
    if (!projectType || projectType === "__pick_project_type__") {
      return "Non specificato";
    }
    const typeLower = projectType.toLowerCase();
    if (
      typeLower.includes("new") ||
      typeLower.includes("nuovo") ||
      typeLower.includes("ex novo") ||
      typeLower.includes("exnovo")
    ) {
      return "Ex Novo";
    }
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
      language: request.formData?.lang === "en" ? "en" : "it",
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
            className={activeTab === "links" ? "active" : ""}
            onClick={() => setActiveTab("links")}
          >
            Link & Piattaforme
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
              <FaGlobe className="info-icon" aria-hidden />
              <span>
                Lingua:{" "}
                <span
                  className={`lang-flag ${
                    request.formData?.lang === "en" ? "en" : "it"
                  }`}
                  title={
                    request.formData?.lang === "en" ? "English" : "Italiano"
                  }
                  aria-label={
                    request.formData?.lang === "en" ? "English" : "Italiano"
                  }
                >
                  {request.formData?.lang === "en" ? "🇺🇸" : "🇮🇹"}
                </span>
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

        {activeTab === "links" && (
          <div className="info-section">
            <h2>Link & Piattaforme</h2>

            {(() => {
              const fd = request.formData || {};

              const midTrunc = (s, n = 40) => {
                if (!s) return "";
                if (s.length <= n) return s;
                const half = Math.floor((n - 1) / 2);
                return s.slice(0, half) + "…" + s.slice(-half);
              };

              const safeUrl = (u) => {
                if (!u) return null;
                try {
                  const url = new URL(u);
                  return {
                    href: u,
                    label:
                      url.hostname.replace(/^www\./, "") || midTrunc(u, 40),
                    full: u,
                  };
                } catch {
                  return { href: u, label: midTrunc(u, 40), full: u };
                }
              };

              const linkItems = [
                { key: "websiteUrl", label: "Sito web", Icon: FaGlobe },
                { key: "instagramUrl", label: "Instagram", Icon: FaInstagram },
                { key: "facebookUrl", label: "Facebook", Icon: FaFacebook },
                { key: "assetsLink", label: "Assets", Icon: FaFolderOpen },
                { key: "designLink", label: "Design (Figma)", Icon: SiFigma },
                { key: "repoUrl", label: "Repository", Icon: FaGithub },
              ];

              const platformDefs = [
                { k: "ios", label: "iOS", Icon: FaApple },
                { k: "android", label: "Android", Icon: FaAndroid },
                { k: "webapp", label: "Web App", Icon: FaLaptopCode },
              ];

              // <- robustifica appPlatforms: array puro, stringa JSON, oppure array con stringa JSON
              const normalizePlatforms = (v) => {
                if (!v) return [];
                if (Array.isArray(v)) {
                  if (
                    v.length === 1 &&
                    typeof v[0] === "string" &&
                    v[0].trim().startsWith("[")
                  ) {
                    try {
                      return JSON.parse(v[0]);
                    } catch {
                      return [];
                    }
                  }
                  return v;
                }
                if (typeof v === "string") {
                  try {
                    return JSON.parse(v);
                  } catch {
                    return v
                      .split(/[,\s]+/)
                      .map((s) => s.trim())
                      .filter(Boolean);
                  }
                }
                return [];
              };
              const platforms = normalizePlatforms(fd.appPlatforms);

              const refs = (fd.referenceUrls || "")
                .split(/[,\s\n]+/)
                .map((s) => s.trim())
                .filter(Boolean);

              const appLinks = [
                { label: "iOS", key: "iosUrl", Icon: FaApple },
                { label: "Android", key: "androidUrl", Icon: FaAndroid },
                { label: "Web App", key: "webappUrl", Icon: FaLaptopCode },
              ];

              return (
                <>
                  {/* LINK */}
                  <h3 className="mt-8">Link</h3>
                  <div className="info-grid">
                    {linkItems.map(({ key, label, Icon }) => {
                      const su = safeUrl(fd[key]);
                      return (
                        <div className="irow" key={key}>
                          <div className="ilabel">
                            <Icon className="iicon" aria-hidden />
                            <span>{label}</span>
                          </div>
                          <div className="ival">
                            {su ? (
                              <>
                                <a
                                  href={su.href}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="pill pill--link"
                                  title={su.full}
                                >
                                  <FaLinkIcon
                                    className="pill-ico"
                                    aria-hidden
                                  />
                                  <span className="pill-text">{su.label}</span>
                                </a>
                              </>
                            ) : (
                              <span>—</span>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {/* Riferimenti multipli */}
                    <div className="irow">
                      <div className="ilabel">
                        <FaLinkIcon className="iicon" aria-hidden />
                        <span>Riferimenti</span>
                      </div>
                      <div className="ival">
                        {refs.length ? (
                          <div className="pill-wrap">
                            {refs.map((u) => {
                              const su = safeUrl(u);
                              return (
                                <span key={u} className="pill-group">
                                  <a
                                    href={su.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="pill pill--link"
                                    title={su.full}
                                  >
                                    <FaLinkIcon
                                      className="pill-ico"
                                      aria-hidden
                                    />
                                    <span className="pill-text">
                                      {su.label}
                                    </span>
                                  </a>
                                </span>
                              );
                            })}
                          </div>
                        ) : (
                          <span>—</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* PIATTAFORME */}
                  <h3 className="mt-24">Piattaforme</h3>
                  <div className="pill-wrap">
                    {platformDefs.map(({ k, label, Icon }) => {
                      const on = platforms.includes(k);
                      return (
                        <span
                          key={k}
                          className={`pill ${on ? "pill--on" : "pill--off"}`}
                        >
                          <Icon className="pill-ico" aria-hidden />
                          <span>{label}</span>
                        </span>
                      );
                    })}
                  </div>

                  {/* URL specifici delle piattaforme */}
                  <div className="info-grid mt-12">
                    {appLinks.map(({ label, key, Icon }) => {
                      const su = safeUrl(fd[key]);
                      return (
                        <div className="irow" key={key}>
                          <div className="ilabel">
                            <Icon className="iicon" aria-hidden />
                            <span>{`URL ${label}`}</span>
                          </div>
                          <div className="ival">
                            {su ? (
                              <>
                                <a
                                  href={su.href}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="pill pill--link"
                                  title={su.full}
                                >
                                  <FaLinkIcon
                                    className="pill-ico"
                                    aria-hidden
                                  />
                                  <span className="pill-text">{su.label}</span>
                                </a>
                              </>
                            ) : (
                              <span>—</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              );
            })()}
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
