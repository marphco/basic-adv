import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import PropTypes from "prop-types";
import "../dynamic-form/DynamicForm.css";

const Dashboard = ({ isDark }) => {
  const [requests, setRequests] = useState([]);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  // Fallback per l'URL, senza slash finale
  const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:8080").replace(/\/$/, "");
  const requestsUrl = `${API_URL}/api/getRequests`;

  useEffect(() => {
    const token = localStorage.getItem("token");
    console.log("Token trovato:", token);
    if (!token) {
      navigate("/login");
      return;
    }

    const fetchRequests = async () => {
      try {
        const response = await axios.get(requestsUrl, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setRequests(response.data);
      } catch (err) {
        setError("Errore nel caricamento delle richieste: " + (err.response?.data?.error || err.message));
        localStorage.removeItem("token");
        navigate("/login");
      }
    };

    fetchRequests();
  }, [navigate, requestsUrl]);

  return (
    <div className={`dynamic-form ${isDark ? "dark-theme" : "light-theme"}`}>
      <h2>Dashboard Richieste</h2>
      {error && <p className="error-message">{error}</p>}
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th>Session ID</th>
            <th>Nome</th>
            <th>Email</th>
            <th>Data</th>
          </tr>
        </thead>
        <tbody>
          {requests.map((req) => (
            <tr key={req.sessionId}>
              <td>{req.sessionId}</td>
              <td>{req.formData.contactInfo.name}</td>
              <td>{req.formData.contactInfo.email}</td>
              <td>{new Date(req.createdAt).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

Dashboard.propTypes = {
  isDark: PropTypes.bool.isRequired,
};

export default Dashboard;