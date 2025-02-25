import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import PropTypes from "prop-types";
import "./Dashboard.css";
import SearchBar from "./SearchBar";

// Nuovo componente SearchWrapper per isolare lo stato della searchbar
const SearchWrapper = ({ onSearch }) => {
  // eslint-disable-next-line no-unused-vars
  const [searchTerm, setSearchTerm] = useState("");

  // Gestisce l'input e chiama la funzione onSearch del genitore
  const handleSearch = useCallback((term) => {
    setSearchTerm(term);
    onSearch(term);
  }, [onSearch]);

  return <SearchBar onSearch={handleSearch} />;
};

SearchWrapper.propTypes = {
  onSearch: PropTypes.func.isRequired,
};

const Dashboard = ({ isDark }) => {
  const [requests, setRequests] = useState([]);
  const [selectedSection, setSelectedSection] = useState("home");
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(""); // Stato gestito dal genitore
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

  // Stabilizza la funzione per aggiornare searchTerm
  const handleSearch = useCallback((term) => setSearchTerm(term), []);

  // Funzione per filtrare le richieste in base alla sezione e al termine di ricerca
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
            <th>.Status</th>
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
        {/* Usa SearchWrapper invece di SearchBar direttamente */}
        {selectedSection !== "home" && <SearchWrapper onSearch={handleSearch} />}
        {selectedRequest ? (
          <div className="request-details">
            <h2>{selectedRequest.formData.contactInfo.name}</h2>
            <button onClick={() => setSelectedRequest(null)}>Chiudi</button>
            <p>Dettagli da implementare...</p>
          </div>
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