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
} from "@fortawesome/free-solid-svg-icons";
import SearchBar from "./SearchBar";
import LogoIcon from "../../assets/icon-white.svg";

// Componente DashboardHome
const DashboardHome = ({ handleSectionChange, requests }) => {
  const totalRequests = requests.length;
  const completedRequests = requests.filter((req) => req.projectPlan).length;
  const abandonedRequests = totalRequests - completedRequests;

  return (
    <div className="dashboard-home">
      <div className="stat-card" onClick={() => handleSectionChange("all")}>
        <h3>Numero Richieste</h3>
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
const RequestList = ({ getFilteredRequests, setSelectedRequest }) => (
  <div className="requests-table">
    <table>
      <thead>
        <tr>
          <th>Nome</th>
          <th>Email</th>
          <th>Data</th>
          <th>Stato</th>
          <th>Azioni</th>
        </tr>
      </thead>
      <tbody>
        {getFilteredRequests().map((req) => (
          <tr key={req.sessionId}>
            <td>{req.formData.contactInfo.name || "Utente Sconosciuto"}</td>
            <td>{req.formData.contactInfo.email}</td>
            <td>
              {req.createdAt &&
              (req.createdAt.$date || typeof req.createdAt === "string")
                ? new Date(
                    req.createdAt.$date || req.createdAt
                  ).toLocaleDateString()
                : "Data non disponibile"}
            </td>
            <td>
              {req.projectPlan ? (
                <span className="status-icon completed">✅ Completata</span>
              ) : (
                <span className="status-icon pending">⏳ In attesa</span>
              )}
            </td>
            <td>
              <button
                className="details-btn"
                onClick={() => setSelectedRequest(req)}
              >
                Dettagli
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

RequestList.propTypes = {
  getFilteredRequests: PropTypes.func.isRequired,
  setSelectedRequest: PropTypes.func.isRequired,
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
            {request.formData.contactInfo.name || "Utente Sconosciuto"}
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
            <h2>{request.formData.contactInfo.name || "Utente Sconosciuto"}</h2>
            <p>
              <strong>Email:</strong>{" "}
              {request.formData.contactInfo.email || "Non fornito"}
            </p>
            <p>
              <strong>Telefono:</strong>{" "}
              {request.formData.contactInfo.phone || "Non fornito"}
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
  const navigate = useNavigate();

  const API_URL = (
    import.meta.env.VITE_API_URL || "http://localhost:8080"
  ).replace(/\/$/, "");
  const requestsUrl = `${API_URL}/api/getRequests`;

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    const fetchRequests = async () => {
      try {
        const response = await axios.get(requestsUrl, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const sortedRequests = response.data.sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        );
        setRequests(sortedRequests);
      } catch (err) {
        console.error("Errore nel caricamento delle richieste:", err);
        localStorage.removeItem("token");
        navigate("/login");
      }
    };

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
    return filtered;
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
          />
        )}
      </div>
    </div>
  );
};

Dashboard.propTypes = {
  isDark: PropTypes.bool.isRequired,
  toggleSidebar: PropTypes.func.isRequired,
  isSidebarOpen: PropTypes.bool.isRequired,
};

export default Dashboard;
