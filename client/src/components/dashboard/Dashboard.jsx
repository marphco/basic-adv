import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import PropTypes from "prop-types";
import "./Dashboard.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHome,
  faList,
  faCheck,
  faTimes,
  faFolder,
  faSignOutAlt,
  faTrash,
  faPaperclip,
  faUser,
  faEnvelope,
  faCalendar,
  faChartLine,
  faThumbsUp,
  faSortUp,
  faSortDown,
} from "@fortawesome/free-solid-svg-icons";
import SearchBar from "./SearchBar";
import ConfirmModal from "./ConfirmModal";
import LogoIcon from "../../assets/icon-white.svg";

const formatDate = (date) => {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

// Funzione per convertire il budget in formato "K"
const formatBudget = (budget) => {
    if (budget === "unknown") return { text: "Non lo so", className: "budget-unknown" };
    const budgetNum = parseFloat(budget);
    if (isNaN(budgetNum)) return { text: "-", className: "budget-unknown" };
    if (budgetNum <= 1000) return { text: "0-1K", className: "budget-0-1k" };
    if (budgetNum <= 5000) return { text: "1-5K", className: "budget-1-5k" };
    if (budgetNum <= 10000) return { text: "5-10K", className: "budget-5-10k" };
    return { text: "10K+", className: "budget-10k-plus" };
  };
  

// Componente DashboardHome (invariato)
const DashboardHome = ({ handleSectionChange, requests }) => {
  const totalRequests = requests.length;
  const completedRequests = requests.filter((req) => req.projectPlan).length;
  const abandonedRequests = totalRequests - completedRequests;

  return (
    <div className="dashboard-home">
      <div className="stat-card" onClick={() => handleSectionChange("all")}>
        <h3>Totale Richieste</h3>
        <p>{totalRequests}</p>
      </div>
      <div
        className="stat-card"
        onClick={() => handleSectionChange("completed")}
      >
        <h3>Completate</h3>
        <p>{completedRequests}</p>
      </div>
      <div
        className="stat-card"
        onClick={() => handleSectionChange("abandoned")}
      >
        <h3>Abbandonate</h3>
        <p>{abandonedRequests}</p>
      </div>
    </div>
  );
};

DashboardHome.propTypes = {
  handleSectionChange: PropTypes.func.isRequired,
  requests: PropTypes.arrayOf(PropTypes.object).isRequired,
};

// Componente RequestList
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
                    className={`sort-icon ${
                      sortField === "name" && sortDirection === "asc"
                        ? "active"
                        : ""
                    }`}
                  />
                  <FontAwesomeIcon
                    icon={faSortDown}
                    className={`sort-icon ${
                      sortField === "name" && sortDirection === "desc"
                        ? "active"
                        : ""
                    }`}
                  />
                </span>
              </th>
              <th onClick={() => handleSort("email")}>
                <FontAwesomeIcon icon={faEnvelope} className="header-icon" />{" "}
                Email
                <span className="sort-icons">
                  <FontAwesomeIcon
                    icon={faSortUp}
                    className={`sort-icon ${
                      sortField === "email" && sortDirection === "asc"
                        ? "active"
                        : ""
                    }`}
                  />
                  <FontAwesomeIcon
                    icon={faSortDown}
                    className={`sort-icon ${
                      sortField === "email" && sortDirection === "desc"
                        ? "active"
                        : ""
                    }`}
                  />
                </span>
              </th>
              <th onClick={() => handleSort("createdAt")}>
                <FontAwesomeIcon icon={faCalendar} className="header-icon" /> Data
                <span className="sort-icons">
                  <FontAwesomeIcon
                    icon={faSortUp}
                    className={`sort-icon ${
                      sortField === "createdAt" && sortDirection === "asc"
                        ? "active"
                        : ""
                    }`}
                  />
                  <FontAwesomeIcon
                    icon={faSortDown}
                    className={`sort-icon ${
                      sortField === "createdAt" && sortDirection === "desc"
                        ? "active"
                        : ""
                    }`}
                  />
                </span>
              </th>
              {selectedSection === "all" ? (
                <>
                  <th className="centered" onClick={() => handleSort("budget")}>
                    Budget
                    <span className="sort-icons">
                      <FontAwesomeIcon
                        icon={faSortUp}
                        className={`sort-icon ${
                          sortField === "budget" && sortDirection === "asc"
                            ? "active"
                            : ""
                        }`}
                      />
                      <FontAwesomeIcon
                        icon={faSortDown}
                        className={`sort-icon ${
                          sortField === "budget" && sortDirection === "desc"
                            ? "active"
                            : ""
                        }`}
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
                        className={`sort-icon ${
                          sortField === "attachment" && sortDirection === "asc"
                            ? "active"
                            : ""
                        }`}
                      />
                      <FontAwesomeIcon
                        icon={faSortDown}
                        className={`sort-icon ${
                          sortField === "attachment" && sortDirection === "desc"
                            ? "active"
                            : ""
                        }`}
                      />
                    </span>
                  </th>
                  <th className="centered" onClick={() => handleSort("status")}>
                    <FontAwesomeIcon icon={faChartLine} className="header-icon" />{" "}
                    Stato
                    <span className="sort-icons">
                      <FontAwesomeIcon
                        icon={faSortUp}
                        className={`sort-icon ${
                          sortField === "status" && sortDirection === "asc"
                            ? "active"
                            : ""
                        }`}
                      />
                      <FontAwesomeIcon
                        icon={faSortDown}
                        className={`sort-icon ${
                          sortField === "status" && sortDirection === "desc"
                            ? "active"
                            : ""
                        }`}
                      />
                    </span>
                  </th>
                </>
              ) : (
                <>
                  <th className="centered" onClick={() => handleSort("budget")}>
                    Budget
                    <span className="sort-icons">
                      <FontAwesomeIcon
                        icon={faSortUp}
                        className={`sort-icon ${
                          sortField === "budget" && sortDirection === "asc"
                            ? "active"
                            : ""
                        }`}
                      />
                      <FontAwesomeIcon
                        icon={faSortDown}
                        className={`sort-icon ${
                          sortField === "budget" && sortDirection === "desc"
                            ? "active"
                            : ""
                        }`}
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
                        className={`sort-icon ${
                          sortField === "attachment" && sortDirection === "asc"
                            ? "active"
                            : ""
                        }`}
                      />
                      <FontAwesomeIcon
                        icon={faSortDown}
                        className={`sort-icon ${
                          sortField === "attachment" && sortDirection === "desc"
                            ? "active"
                            : ""
                        }`}
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
                    className={`sort-icon ${
                      sortField === "feedback" && sortDirection === "asc"
                        ? "active"
                        : ""
                    }`}
                  />
                  <FontAwesomeIcon
                    icon={faSortDown}
                    className={`sort-icon ${
                      sortField === "feedback" && sortDirection === "desc"
                        ? "active"
                        : ""
                    }`}
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

// Componente RequestDetails
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
            {request.formData.contactInfo.name || "Info Utente"}
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
          <div>
            <h2>{request.formData.contactInfo.name || "Nome non fornito"}</h2>
            <p>
              <strong>Email:</strong>{" "}
              {request.formData.contactInfo.email || "-"}
            </p>
            <p>
              <strong>Telefono:</strong>{" "}
              {request.formData.contactInfo.phone || "-"}
            </p>
            <p>
              <strong>Budget:</strong>{" "}
              {request.formData.budget === "unknown"
                ? "Non lo so"
                : request.formData.budget}
            </p>
            <p>
              <strong>Data:</strong>{" "}
              {request.createdAt &&
              (request.createdAt.$date || typeof request.createdAt === "string")
                ? new Date(
                    request.createdAt.$date || request.createdAt
                  ).toLocaleDateString()
                : "Data non disponibile"}
            </p>
            <p>
              <strong>Stato:</strong>{" "}
              {request.projectPlan ? "Completata" : "In attesa"}
            </p>
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

// Componente FileListSection
const FileListSection = ({ fileList, deleteFile, API_URL }) => (
  <div className="file-list-section">
    <h3>Lista Allegati</h3>
    {fileList.length > 0 ? (
      <ul>
        {fileList.map((file, index) => (
          <li key={index}>
            {file.name} - {Math.round(file.size / 1024)} KB -{" "}
            {new Date(file.lastModified).toLocaleDateString()}
            <a
              href={`${API_URL}/api/download/${file.name}`}
              download
              style={{ marginLeft: "10px" }}
            >
              Scarica
            </a>
            <button
              onClick={() => deleteFile(file.name)}
              style={{ marginLeft: "10px" }}
            >
              Cancella
            </button>
          </li>
        ))}
      </ul>
    ) : (
      <p>Nessun file presente nella cartella uploads</p>
    )}
  </div>
);

FileListSection.propTypes = {
  fileList: PropTypes.arrayOf(PropTypes.object).isRequired,
  deleteFile: PropTypes.func.isRequired,
  API_URL: PropTypes.string.isRequired,
};

// Componente principale Dashboard
const Dashboard = ({ isDark, toggleSidebar, isSidebarOpen }) => {
    const [requests, setRequests] = useState([]);
    const [selectedSection, setSelectedSection] = useState("home");
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [fileList, setFileList] = useState([]);
    const [activeKey, setActiveKey] = useState(Date.now());
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [requestToDelete, setRequestToDelete] = useState(null);
    const [sortField, setSortField] = useState("createdAt");
    const [sortDirection, setSortDirection] = useState("desc");
    const navigate = useNavigate();
  
    const API_URL = (
      import.meta.env.VITE_API_URL || "http://localhost:8080"
    ).replace(/\/$/, "");
    const requestsUrl = `${API_URL}/api/getRequests`;
  
    const handleSort = (field) => {
      if (sortField === field) {
        setSortDirection(sortDirection === "asc" ? "desc" : "asc");
      } else {
        setSortField(field);
        setSortDirection("asc");
      }
    };

    const fetchRequests = async () => {
        try {
          const token = localStorage.getItem("token");
          const response = await axios.get(requestsUrl, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const sortedRequests = response.data
            .map((req) => ({
              ...req,
              feedback: req.feedback !== undefined ? req.feedback : false,
            }))
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          setRequests(sortedRequests);
        } catch (err) {
          console.error("Errore nel caricamento delle richieste:", err);
          localStorage.removeItem("token");
          navigate("/login");
        }
      };
    
      useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) {
          navigate("/login");
          return;
        }
        fetchRequests();
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [navigate]);

  const fetchFileList = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_URL}/api/uploads/list`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setFileList(response.data.files);
      setActiveKey(Date.now());
      setSelectedSection("fileList");
      setSelectedRequest(null);
      toggleSidebar();
    } catch (error) {
      console.error("Errore nel recupero della lista dei file:", error);
      alert("Errore nel caricamento della lista dei file");
    }
  };

  const deleteFile = async (filename) => {
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API_URL}/api/uploads/delete/${filename}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setFileList(fileList.filter((file) => file.name !== filename));
      alert(`File ${filename} cancellato con successo!`);
    } catch (error) {
      console.error("Errore nella cancellazione del file:", error);
      alert("Errore nella cancellazione del file");
    }
  };

  const updateFeedback = async (sessionId, newFeedback) => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.put(
        `${API_URL}/api/requests/${sessionId}/feedback`,
        { feedback: newFeedback },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log("Risposta dal server:", response.data); // Debug

      // Ricarica i dati dal server per garantire sincronizzazione
      await fetchRequests();
    } catch (err) {
      console.error("Errore nell'aggiornamento del feedback:", err);
      alert("Errore nell'aggiornamento del feedback");
    }
  };

  const confirmDelete = (sessionId) => {
    setRequestToDelete(sessionId);
    setIsModalOpen(true);
  };

  const deleteRequest = async () => {
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API_URL}/api/requests/${requestToDelete}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRequests(requests.filter((req) => req.sessionId !== requestToDelete));
      if (selectedRequest?.sessionId === requestToDelete) {
        setSelectedRequest(null);
      }
    } catch (err) {
      console.error("Errore nella cancellazione della richiesta:", err);
      alert("Errore nella cancellazione della richiesta");
    } finally {
      setIsModalOpen(false);
      setRequestToDelete(null);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  const handleSectionChange = (section) => {
    setActiveKey(Date.now());
    setSelectedSection(section);
    setSelectedRequest(null);
    if (window.innerWidth <= 768 && isSidebarOpen) {
      toggleSidebar();
    }
  };

  const getFilteredRequests = () => {
    let filtered = requests;
    if (selectedSection === "completed") {
      filtered = requests.filter((req) => req.projectPlan);
    } else if (selectedSection === "abandoned") {
      filtered = requests.filter((req) => !req.projectPlan);
    }
    if (searchTerm) {
      filtered = filtered.filter((req) =>
        req.formData.contactInfo.name
          .toLowerCase()
          .includes(searchTerm.toLowerCase())
      );
    }
    return filtered.sort((a, b) => {
      if (sortField === "name") {
        const nameA = a.formData.contactInfo.name || "-";
        const nameB = b.formData.contactInfo.name || "-";
        return sortDirection === "asc"
          ? nameA.localeCompare(nameB)
          : nameB.localeCompare(nameA);
      } else if (sortField === "email") {
        const emailA = a.formData.contactInfo.email || "-";
        const emailB = b.formData.contactInfo.email || "-";
        return sortDirection === "asc"
          ? emailA.localeCompare(emailB)
          : emailB.localeCompare(emailA);
      } else if (sortField === "createdAt") {
        // Gestione di createdAt undefined
        const dateA = a.createdAt
          ? new Date(a.createdAt.$date || a.createdAt)
          : new Date(0); // Fallback a epoch (1970-01-01) se undefined
        const dateB = b.createdAt
          ? new Date(b.createdAt.$date || b.createdAt)
          : new Date(0); // Fallback a epoch (1970-01-01) se undefined
        return sortDirection === "asc" ? dateA - dateB : dateB - dateA;
      } else if (sortField === "status") {
        const statusA = a.projectPlan ? 1 : 0;
        const statusB = b.projectPlan ? 1 : 0;
        return sortDirection === "asc" ? statusA - statusB : statusB - statusA;
      } else if (sortField === "budget") {
        const budgetA = a.formData.budget === "unknown" ? -1 : parseFloat(a.formData.budget) || 0;
        const budgetB = b.formData.budget === "unknown" ? -1 : parseFloat(b.formData.budget) || 0;
        return sortDirection === "asc" ? budgetA - budgetB : budgetB - budgetA;
      } else if (sortField === "attachment") {
        const attachmentA = a.formData.currentLogo ? 1 : 0;
        const attachmentB = b.formData.currentLogo ? 1 : 0;
        return sortDirection === "asc"
          ? attachmentA - attachmentB
          : attachmentB - attachmentA;
      } else if (sortField === "feedback") {
        const feedbackA = a.feedback ? 1 : 0;
        const feedbackB = b.feedback ? 1 : 0;
        return sortDirection === "asc"
          ? feedbackA - feedbackB
          : feedbackB - feedbackA;
      }
      return 0;
    });
  };

  return (
    <div className={`dashboard ${isDark ? "dark-theme" : "light-theme"}`}>
      {isSidebarOpen && (
        <div className="sidebar-overlay" onClick={toggleSidebar}></div>
      )}
      <div className={`sidebar ${isSidebarOpen ? "open" : ""}`}>
        <ul>
          <li className="sidebar-logo">
            <Link to="/">
              <img src={LogoIcon} alt="Home Logo" className="logo-icon" />
            </Link>
          </li>
          <li
            key={`dashboard-home-${activeKey}`}
            className={selectedSection === "home" ? "active" : ""}
            onClick={(event) => {
              event.stopPropagation();
              handleSectionChange("home");
            }}
          >
            <span className="active-before"></span>
            <span className="active-after"></span>
            <div className="icon">
              <FontAwesomeIcon icon={faHome} />
            </div>
            <div className="text">Home</div>
          </li>
          <li
            key={`all-${activeKey}`}
            className={selectedSection === "all" ? "active" : ""}
            onClick={(event) => {
              event.stopPropagation();
              handleSectionChange("all");
            }}
          >
            <span className="active-before"></span>
            <span className="active-after"></span>
            <div className="icon">
              <FontAwesomeIcon icon={faList} />
            </div>
            <div className="text">Tutte le Richieste</div>
          </li>
          <li
            key={`completed-${activeKey}`}
            className={selectedSection === "completed" ? "active" : ""}
            onClick={(event) => {
              event.stopPropagation();
              handleSectionChange("completed");
            }}
          >
            <span className="active-before"></span>
            <span className="active-after"></span>
            <div className="icon">
              <FontAwesomeIcon icon={faCheck} />
            </div>
            <div className="text">Completate</div>
          </li>
          <li
            key={`abandoned-${activeKey}`}
            className={selectedSection === "abandoned" ? "active" : ""}
            onClick={(event) => {
              event.stopPropagation();
              handleSectionChange("abandoned");
            }}
          >
            <span className="active-before"></span>
            <span className="active-after"></span>
            <div className="icon">
              <FontAwesomeIcon icon={faTimes} />
            </div>
            <div className="text">Abbandonate</div>
          </li>
          <li
            key={`fileList-${activeKey}`}
            className={selectedSection === "fileList" ? "active" : ""}
            onClick={(event) => {
              event.stopPropagation();
              fetchFileList();
            }}
          >
            <span className="active-before"></span>
            <span className="active-after"></span>
            <div className="icon">
              <FontAwesomeIcon icon={faFolder} />
            </div>
            <div className="text">Lista Allegati</div>
          </li>
          <li key={`logout-${activeKey}`} onClick={handleLogout}>
            <div className="icon">
              <FontAwesomeIcon icon={faSignOutAlt} />
            </div>
            <div className="text">Logout</div>
          </li>
        </ul>
      </div>

      <div className="main-area">
        {selectedSection !== "home" && selectedSection !== "fileList" && (
          <SearchBar onSearch={setSearchTerm} />
        )}
        {selectedRequest ? (
          <RequestDetails
            request={selectedRequest}
            setSelectedRequest={setSelectedRequest}
            API_URL={API_URL}
          />
        ) : selectedSection === "home" ? (
          <DashboardHome
            handleSectionChange={handleSectionChange}
            requests={requests}
          />
        ) : selectedSection === "fileList" ? (
          <FileListSection
            fileList={fileList}
            deleteFile={deleteFile}
            API_URL={API_URL}
          />
        ) : (
          <RequestList
            getFilteredRequests={getFilteredRequests}
            setSelectedRequest={setSelectedRequest}
            selectedSection={selectedSection}
            updateFeedback={updateFeedback}
            confirmDelete={confirmDelete}
            sortField={sortField}
            sortDirection={sortDirection}
            handleSort={handleSort}
          />
        )}
      </div>

      <ConfirmModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={deleteRequest}
        message="Sei sicuro di voler eliminare questa richiesta?"
      />
    </div>
  );
};

Dashboard.propTypes = {
  isDark: PropTypes.bool.isRequired,
  toggleSidebar: PropTypes.func.isRequired,
  isSidebarOpen: PropTypes.bool.isRequired,
};

export default Dashboard;