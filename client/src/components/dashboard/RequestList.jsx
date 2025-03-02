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
  return (
    <div className="requests-table">
      <table>
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