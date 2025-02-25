import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import PropTypes from "prop-types";
import "./Dashboard.css";

const Dashboard = ({ isDark }) => {
  const [requests, setRequests] = useState([]);
  const [error, setError] = useState("");
  const [selectedSection, setSelectedSection] = useState("home"); // Stato per la sezione corrente
  const [selectedRequest, setSelectedRequest] = useState(null); // Stato per la richiesta selezionata
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Stato per sidebar mobile
  const navigate = useNavigate();

  const [filters, setFilters] = useState({ status: "all", dateRange: "all", service: "all" });

  const filteredRequests = requests.filter((request) => {
    if (filters.status !== "all" && (filters.status === "completed" ? !request.projectPlan : request.projectPlan)) {
      return false;
    }
    // Aggiungi ulteriori condizioni per dateRange e service
    return true;
  });


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
        setError(
          "Errore nel caricamento delle richieste: " +
            (err.response?.data?.error || err.message)
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

  // Componente Home con statistiche rapide (lo implementeremo nella Fase 2)
  const DashboardHome = () => {
    const totalRequests = requests.length;
    const completedRequests = requests.filter((req) => req.projectPlan).length;
    const abandonedRequests = totalRequests - completedRequests;
  
    return (
      <div className="dashboard-home">
        <div
          className="stat-card"
          onClick={() => setSelectedSection("all")}
        >
          <h3>Numero Richieste</h3>
          <p>{totalRequests}</p>
        </div>
        <div
          className="stat-card"
          onClick={() => setSelectedSection("completed")}
        >
          <h3>Completate</h3>
          <p>{completedRequests}</p>
        </div>
        <div
          className="stat-card"
          onClick={() => setSelectedSection("abandoned")}
        >
          <h3>Abbandonate</h3>
          <p>{abandonedRequests}</p>
        </div>
      </div>
    );
  };

  // Componente Lista Richieste (lo espanderemo nella Fase 3)
  const RequestList = ({ filteredRequests }) => (
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
          {filteredRequests.map((req) => (
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

  

  return (
    <div className={`dashboard ${isDark ? "dark-theme" : "light-theme"}`}>
      {/* Pulsante per aprire la sidebar su mobile */}
      <button className="sidebar-toggle" onClick={toggleSidebar}>
        ☰
      </button>

      {/* Sidebar */}
      <div className={`sidebar ${isSidebarOpen ? "open" : ""}`}>
        <button className="sidebar-close" onClick={toggleSidebar}>
          ×
        </button>
        <ul>
          <li
            onClick={() => {
              setSelectedSection("home");
              setSelectedRequest(null);
              setIsSidebarOpen(false);
            }}
          >
            Home
          </li>
          <li
            onClick={() => {
              setSelectedSection("all");
              setSelectedRequest(null);
              setIsSidebarOpen(false);
            }}
          >
            Tutte le Richieste
          </li>
          <li
            onClick={() => {
              setSelectedSection("completed");
              setSelectedRequest(null);
              setIsSidebarOpen(false);
            }}
          >
            Completate
          </li>
          <li
            onClick={() => {
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

      {/* Area Principale */}
      <div className="main-area">
        {selectedRequest ? (
          <div className="request-details">
            <h2>{selectedRequest.formData.contactInfo.name}</h2>
            <button onClick={() => setSelectedRequest(null)}>Chiudi</button>
            {/* Qui aggiungeremo i dettagli nella Fase 4 */}
            <p>Dettagli da implementare...</p>
          </div>
        ) : selectedSection === "home" ? (
          <DashboardHome />
        ) : selectedSection === "all" ? (
          <RequestList filteredRequests={requests} />
        ) : selectedSection === "completed" ? (
          <RequestList filteredRequests={requests.filter((req) => req.projectPlan)} />
        ) : selectedSection === "abandoned" ? (
          <RequestList filteredRequests={requests.filter((req) => !req.projectPlan)} />
        ) : null}
      </div>
    </div>
  );
};

Dashboard.propTypes = {
  isDark: PropTypes.bool.isRequired,
};

export default Dashboard;