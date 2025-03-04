import PropTypes from "prop-types";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUser,
  faEnvelope,
  faCalendar,
  faEuroSign,
  faPaperclip,
  faChartLine,
  faThumbsUp,
  faThumbsDown,
  faSortUp,
  faSortDown,
  faCheck,
  faTimes,
  faTrash,
} from "@fortawesome/free-solid-svg-icons";
import { formatDate, formatBudget } from "./DashboardUtils";

const RequestList = ({
  getFilteredRequests,
  setSelectedRequest,
  selectedSection,
  updateFeedback,
  confirmDelete,
  sortField,
  sortDirection,
  handleSort,
}) => {
  // Funzione per gestire il cambio di ordinamento dal dropdown
  const handleSortChange = (event) => {
    const [field, direction] = event.target.value.split("-");
    if (sortField !== field || sortDirection !== direction) {
      handleSort(field);
      if (sortDirection !== direction) {
        handleSort(field); // Chiamiamo due volte per invertire la direzione se necessario
      }
    }
  };

  return (
    <div className="requests-table">
      {/* Visualizzazione desktop (tabella) */}
      <table className="desktop-table">
        <thead>
          <tr>
            <th onClick={() => handleSort("name")}>
              <FontAwesomeIcon icon={faUser} className="header-icon" /> Nome
              <span className="sort-icons">
                <FontAwesomeIcon
                  icon={faSortUp}
                  className={`sort-icon ${sortField === "name" && sortDirection === "asc" ? "active" : ""}`}
                />
                <FontAwesomeIcon
                  icon={faSortDown}
                  className={`sort-icon ${sortField === "name" && sortDirection === "desc" ? "active" : ""}`}
                />
              </span>
            </th>
            <th onClick={() => handleSort("email")}>
              <FontAwesomeIcon icon={faEnvelope} className="header-icon" />{" "}
              Email
              <span className="sort-icons">
                <FontAwesomeIcon
                  icon={faSortUp}
                  className={`sort-icon ${sortField === "email" && sortDirection === "asc" ? "active" : ""}`}
                />
                <FontAwesomeIcon
                  icon={faSortDown}
                  className={`sort-icon ${sortField === "email" && sortDirection === "desc" ? "active" : ""}`}
                />
              </span>
            </th>
            <th onClick={() => handleSort("createdAt")}>
              <FontAwesomeIcon icon={faCalendar} className="header-icon" /> Data
              <span className="sort-icons">
                <FontAwesomeIcon
                  icon={faSortUp}
                  className={`sort-icon ${sortField === "createdAt" && sortDirection === "asc" ? "active" : ""}`}
                />
                <FontAwesomeIcon
                  icon={faSortDown}
                  className={`sort-icon ${sortField === "createdAt" && sortDirection === "desc" ? "active" : ""}`}
                />
              </span>
            </th>
            {selectedSection === "all" ? (
              <>
                <th className="centered" onClick={() => handleSort("budget")}>
                  <FontAwesomeIcon icon={faEuroSign} className="header-icon" />{" "}
                  Budget
                  <span className="sort-icons">
                    <FontAwesomeIcon
                      icon={faSortUp}
                      className={`sort-icon ${sortField === "budget" && sortDirection === "asc" ? "active" : ""}`}
                    />
                    <FontAwesomeIcon
                      icon={faSortDown}
                      className={`sort-icon ${sortField === "budget" && sortDirection === "desc" ? "active" : ""}`}
                    />
                  </span>
                </th>
                <th
                  className="centered"
                  onClick={() => handleSort("attachment")}
                >
                  <FontAwesomeIcon icon={faPaperclip} className="header-icon" />{" "}
                  Allegati
                  <span className="sort-icons">
                    <FontAwesomeIcon
                      icon={faSortUp}
                      className={`sort-icon ${sortField === "attachment" && sortDirection === "asc" ? "active" : ""}`}
                    />
                    <FontAwesomeIcon
                      icon={faSortDown}
                      className={`sort-icon ${sortField === "attachment" && sortDirection === "desc" ? "active" : ""}`}
                    />
                  </span>
                </th>
                <th className="centered" onClick={() => handleSort("status")}>
                  <FontAwesomeIcon icon={faChartLine} className="header-icon" />{" "}
                  Stato
                  <span className="sort-icons">
                    <FontAwesomeIcon
                      icon={faSortUp}
                      className={`sort-icon ${sortField === "status" && sortDirection === "asc" ? "active" : ""}`}
                    />
                    <FontAwesomeIcon
                      icon={faSortDown}
                      className={`sort-icon ${sortField === "status" && sortDirection === "desc" ? "active" : ""}`}
                    />
                  </span>
                </th>
              </>
            ) : (
              <>
                <th className="centered" onClick={() => handleSort("budget")}>
                  <FontAwesomeIcon icon={faEuroSign} className="header-icon" />{" "}
                  Budget
                  <span className="sort-icons">
                    <FontAwesomeIcon
                      icon={faSortUp}
                      className={`sort-icon ${sortField === "budget" && sortDirection === "asc" ? "active" : ""}`}
                    />
                    <FontAwesomeIcon
                      icon={faSortDown}
                      className={`sort-icon ${sortField === "budget" && sortDirection === "desc" ? "active" : ""}`}
                    />
                  </span>
                </th>
                <th
                  className="centered"
                  onClick={() => handleSort("attachment")}
                >
                  <FontAwesomeIcon icon={faPaperclip} className="header-icon" />{" "}
                  Allegati
                  <span className="sort-icons">
                    <FontAwesomeIcon
                      icon={faSortUp}
                      className={`sort-icon ${sortField === "attachment" && sortDirection === "asc" ? "active" : ""}`}
                    />
                    <FontAwesomeIcon
                      icon={faSortDown}
                      className={`sort-icon ${sortField === "attachment" && sortDirection === "desc" ? "active" : ""}`}
                    />
                  </span>
                </th>
              </>
            )}
            <th className="centered" onClick={() => handleSort("feedback")}>
              <FontAwesomeIcon icon={faThumbsUp} className="header-icon" />{" "}
              Feedback
              <span className="sort-icons">
                <FontAwesomeIcon
                  icon={faSortUp}
                  className={`sort-icon ${sortField === "feedback" && sortDirection === "asc" ? "active" : ""}`}
                />
                <FontAwesomeIcon
                  icon={faSortDown}
                  className={`sort-icon ${sortField === "feedback" && sortDirection === "desc" ? "active" : ""}`}
                />
              </span>
            </th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {getFilteredRequests().map((req) => {
            const budgetData = formatBudget(req.formData.budget);
            return (
              <tr
                key={req.sessionId}
                onClick={() => setSelectedRequest(req)}
                className="request-row"
              >
                <td>{req.formData.contactInfo.name || "-"}</td>
                <td>{req.formData.contactInfo.email || "-"}</td>
                <td>
                  {req.createdAt &&
                  (req.createdAt.$date || typeof req.createdAt === "string")
                    ? formatDate(new Date(req.createdAt.$date || req.createdAt))
                    : "Data non disponibile"}
                </td>
                {selectedSection === "all" ? (
                  <>
                    <td className="centered">
                      <span className={`budget-badge ${budgetData.className}`}>
                        {budgetData.text}
                      </span>
                    </td>
                    <td className="centered">
                      {req.formData.currentLogo ? (
                        <FontAwesomeIcon
                          icon={faPaperclip}
                          className="attachment-icon"
                        />
                      ) : (
                        ""
                      )}
                    </td>
                    <td className="centered">
                      <span
                        className={`status-badge ${
                          req.projectPlan ? "completed" : "pending"
                        }`}
                      >
                        {req.projectPlan ? "Completa" : "Incompleta"}
                      </span>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="centered">
                      <span className={`budget-badge ${budgetData.className}`}>
                        {budgetData.text}
                      </span>
                    </td>
                    <td className="centered">
                      {req.formData.currentLogo ? (
                        <FontAwesomeIcon
                          icon={faPaperclip}
                          className="attachment-icon"
                        />
                      ) : (
                        ""
                      )}
                    </td>
                  </>
                )}
                <td className="centered">
                  <button
                    className={`feedback-btn ${
                      req.feedback ? "worked" : "not-worked"
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      updateFeedback(req.sessionId, !req.feedback);
                    }}
                  >
                    <FontAwesomeIcon icon={req.feedback ? faCheck : faTimes} />
                  </button>
                </td>
                <td>
                  <button
                    className="delete-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      confirmDelete(req.sessionId);
                    }}
                  >
                    <FontAwesomeIcon icon={faTrash} />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Visualizzazione mobile (card) */}
      <div className="mobile-cards">
        {/* Dropdown di ordinamento */}
        <div className="sort-dropdown">
          <select
            onChange={handleSortChange}
            value={`${sortField}-${sortDirection}`} // Valore corrente per il select
          >
            <option value="name-asc">Ordina per Nome (A-Z)</option>
            <option value="name-desc">Ordina per Nome (Z-A)</option>
            <option value="email-asc">Ordina per Email (A-Z)</option>
            <option value="email-desc">Ordina per Email (Z-A)</option>
            <option value="createdAt-asc">Ordina per Data (più vecchia)</option>
            <option value="createdAt-desc">Ordina per Data (più recente)</option>
            <option value="budget-asc">Ordina per Budget (crescente)</option>
            <option value="budget-desc">Ordina per Budget (decrescente)</option>
            <option value="attachment-asc">Ordina per Allegati (no)</option>
            <option value="attachment-desc">Ordina per Allegati (sì)</option>
            {selectedSection === "all" && (
              <>
                <option value="status-asc">Ordina per Stato (incompleta)</option>
                <option value="status-desc">Ordina per Stato (completa)</option>
              </>
            )}
            <option value="feedback-asc">Ordina per Feedback (no)</option>
            <option value="feedback-desc">Ordina per Feedback (sì)</option>
          </select>
        </div>

        {getFilteredRequests().map((req) => {
          const budgetData = formatBudget(req.formData.budget);
          return (
            <div
              key={req.sessionId}
              className="request-card"
              onClick={() => setSelectedRequest(req)}
            >
              <div className="card-content">
                <div className="card-item">
                  <strong>
                    <FontAwesomeIcon icon={faUser} className="card-icon" /> Nome:
                  </strong>{" "}
                  {req.formData.contactInfo.name || "-"}
                </div>
                <div className="card-item">
                  <strong>
                    <FontAwesomeIcon icon={faEnvelope} className="card-icon" /> Email:
                  </strong>{" "}
                  {req.formData.contactInfo.email || "-"}
                </div>
                <div className="card-item">
                  <strong>
                    <FontAwesomeIcon icon={faCalendar} className="card-icon" /> Data:
                  </strong>{" "}
                  {req.createdAt &&
                  (req.createdAt.$date || typeof req.createdAt === "string")
                    ? formatDate(new Date(req.createdAt.$date || req.createdAt))
                    : "Data non disponibile"}
                </div>
                <div className="card-item">
                  <strong>
                    <FontAwesomeIcon icon={faEuroSign} className="card-icon" /> Budget:
                  </strong>{" "}
                  <span className={`budget-badge ${budgetData.className}`}>
                    {budgetData.text}
                  </span>
                </div>
                <div className="card-item">
                  <strong>
                    <FontAwesomeIcon icon={faPaperclip} className="card-icon" /> Allegati:
                  </strong>{" "}
                  {req.formData.currentLogo ? (
                    <FontAwesomeIcon icon={faPaperclip} className="attachment-icon" />
                  ) : (
                    "-"
                  )}
                </div>
                {selectedSection === "all" && (
                  <div className="card-item">
                    <strong>
                      <FontAwesomeIcon icon={faChartLine} className="card-icon" /> Stato:
                    </strong>{" "}
                    <span
                      className={`status-badge ${
                        req.projectPlan ? "completed" : "pending"
                      }`}
                    >
                      {req.projectPlan ? "Completa" : "Incompleta"}
                    </span>
                  </div>
                )}
              </div>
              <div className="card-actions">
                <button
                  className={`feedback-btn ${
                    req.feedback ? "worked" : "not-worked"
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    updateFeedback(req.sessionId, !req.feedback);
                  }}
                >
                  <FontAwesomeIcon icon={req.feedback ? faThumbsUp : faThumbsDown} />
                </button>
                <button
                  className="delete-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    confirmDelete(req.sessionId);
                  }}
                >
                  <FontAwesomeIcon icon={faTrash} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

RequestList.propTypes = {
  getFilteredRequests: PropTypes.func.isRequired,
  setSelectedRequest: PropTypes.func.isRequired,
  selectedSection: PropTypes.string.isRequired,
  updateFeedback: PropTypes.func.isRequired,
  confirmDelete: PropTypes.func.isRequired,
  sortField: PropTypes.string.isRequired,
  sortDirection: PropTypes.string.isRequired,
  handleSort: PropTypes.func.isRequired,
};

export default RequestList;