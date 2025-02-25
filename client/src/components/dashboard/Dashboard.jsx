import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import PropTypes from "prop-types";
import "./Dashboard.css";
import SearchBar from "./SearchBar";

const Dashboard = ({ isDark }) => {
  const [requests, setRequests] = useState([]);
  const [selectedSection, setSelectedSection] = useState("home");
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
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
        console.error(
          "Errore nel caricamento delle richieste: ",
          err.response?.data?.error || err.message
        );
        localStorage.removeItem("token");
        navigate("/login");
      }
    };

    fetchRequests();
  }, [navigate, requestsUrl]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

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

  const DashboardHome = () => {
    const totalRequests = requests.length;
    const completedRequests = requests.filter((req) => req.projectPlan).length;
    const abandonedRequests = totalRequests - completedRequests;

    return (
      <div className="dashboard-home">
        <div
          className="stat-card"
          onClick={() => {
            setSelectedSection("all");
            setSelectedRequest(null);
          }}
        >
          <h3>Numero Richieste</h3>
          <p>{totalRequests}</p>
        </div>
        <div
          className="stat-card"
          onClick={() => {
            setSelectedSection("completed");
            setSelectedRequest(null);
          }}
        >
          <h3>Completate</h3>
          <p>{completedRequests}</p>
        </div>
        <div
          className="stat-card"
          onClick={() => {
            setSelectedSection("abandoned");
            setSelectedRequest(null);
          }}
        >
          <h3>Abbandonate</h3>
          <p>{abandonedRequests}</p>
        </div>
      </div>
    );
  };

  const RequestList = () => (
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
              <td>{req.formData.contactInfo.name}</td>
              <td>{req.formData.contactInfo.email}</td>
              <td>{new Date(req.createdAt.$date).toLocaleDateString()}</td>
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

  const RequestDetails = ({ request }) => {
    const [activeTab, setActiveTab] = useState("info");

    return (
      <div className="request-details">
        <div className="details-sidebar">
          <button onClick={() => setSelectedRequest(null)} className="close-btn">Chiudi</button>
          <ul>
            <li
              className={activeTab === "info" ? "active" : ""}
              onClick={() => setActiveTab("info")}
            >
              {request.formData.contactInfo.name}
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
              <h2>{request.formData.contactInfo.name}</h2>
              <p><strong>Email:</strong> {request.formData.contactInfo.email}</p>
              <p><strong>Telefono:</strong> {request.formData.contactInfo.phone}</p>
              <p><strong>Budget:</strong> {request.formData.budget}</p>
              <p><strong>Data:</strong> {new Date(request.createdAt.$date).toLocaleDateString()}</p>
              <p><strong>Stato:</strong> {request.projectPlan ? "Completata" : "In attesa"}</p>
            </div>
          )}
          {activeTab === "services" && (
            <div>
              <h3>Servizi Richiesti</h3>
              <ul>
                {request.servicesQueue.map((service, index) => (
                  <li key={index}>{service}</li>
                ))}
              </ul>
            </div>
          )}
          {activeTab === "questions" && (
            <div>
              <h3>Domande e Risposte</h3>
              {request.questions.map((q, index) => (
                <div key={index} className="question-answer">
                  <p><strong>{q.question}</strong></p>
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
                    <p>{request.answers[q.question]?.input || "Nessuna risposta"}</p>
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
                <a href={request.formData.currentLogo} download>Scarica Logo Attuale</a>
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
  };

  return (
    <div className={`dashboard ${isDark ? "dark-theme" : "light-theme"}`}>
      <button className="sidebar-toggle" onClick={toggleSidebar}>
        ☰
      </button>

      <div className={`sidebar ${isSidebarOpen ? "open" : ""}`}>
        <button className="sidebar-close" onClick={toggleSidebar}>
          ×
        </button>
        <ul>
          <li
            onClick={(event) => {
              event.stopPropagation();
              setSelectedSection("home");
              setSelectedRequest(null);
              setIsSidebarOpen(false);
            }}
          >
            Home
          </li>
          <li
            onClick={(event) => {
              event.stopPropagation();
              setSelectedSection("all");
              setSelectedRequest(null);
              setIsSidebarOpen(false);
            }}
          >
            Tutte le Richieste
          </li>
          <li
            onClick={(event) => {
              event.stopPropagation();
              setSelectedSection("completed");
              setSelectedRequest(null);
              setIsSidebarOpen(false);
            }}
          >
            Completate
          </li>
          <li
            onClick={(event) => {
              event.stopPropagation();
              setSelectedSection("abandoned");
              setSelectedRequest(null);
              setIsSidebarOpen(false);
            }}
          >
            Abbandonate
          </li>
          <li onClick={handleLogout}>Logout</li>
        </ul>
      </div>

      <div className="main-area">
        {selectedSection !== "home" && <SearchBar onSearch={setSearchTerm} />}
        {selectedRequest ? (
          <RequestDetails request={selectedRequest} />
        ) : selectedSection === "home" ? (
          <DashboardHome />
        ) : (
          <RequestList />
        )}
      </div>
    </div>
  );
};

Dashboard.propTypes = {
  isDark: PropTypes.bool.isRequired,
};

export default Dashboard;