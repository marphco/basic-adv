import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import PropTypes from "prop-types";
import "../dynamic-form/DynamicForm.css";
import "./Dashboard.css";

const Dashboard = ({ isDark }) => {
  const [requests, setRequests] = useState([]);
  const [error, setError] = useState("");
  const [selectedRequest, setSelectedRequest] = useState(null);
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

  const handleRowClick = (request) => {
    setSelectedRequest(request);
  };

  const closeModal = () => {
    setSelectedRequest(null);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  return (
    <div className="dashboard">
      {/* Lista delle Richieste */}
      <div className="requests-list">
        {requests.map(req => (
          <div
            key={req.sessionId}
            className={`request-item ${selectedRequest?.sessionId === req.sessionId ? 'selected' : ''}`}
            onClick={() => setSelectedRequest(req)}
          >
            <p>{new Date(req.createdAt.$date).toLocaleDateString()}</p>
            <p>{req.formData.contactInfo.name}</p>
            <span>{req.projectPlan ? "✅" : "⏳"}</span>
          </div>
        ))}
      </div>

      {/* Dettagli della Richiesta */}
      {selectedRequest && (
        <div className="request-details">
          <h2>{selectedRequest.formData.contactInfo.name}</h2>
          <p>Email: {selectedRequest.formData.contactInfo.email}</p>
          <p>Telefono: {selectedRequest.formData.contactInfo.phone}</p>
          <p>Budget: {selectedRequest.formData.budget}</p>
          <p>Data: {new Date(selectedRequest.createdAt.$date).toLocaleDateString()}</p>
          <p>Stato: {selectedRequest.projectPlan ? "Completata" : "In attesa"}</p>

          <h3>Domande e Risposte</h3>
          {selectedRequest.questions.map((q, index) => (
            <div key={index} className="question-answer">
              <p><strong>{q.question}</strong></p>
              {q.options.length > 0 ? (
                <ul>
                  {q.options.map((option, optIndex) => (
                    <li
                      key={optIndex}
                      className={selectedRequest.answers[q.question]?.options?.includes(option) ? 'selected' : ''}
                    >
                      {option}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>{selectedRequest.answers[q.question]?.input || "Nessuna risposta"}</p>
              )}
            </div>
          ))}

          <h3>Piano d'Azione</h3>
          <p>{selectedRequest.projectPlan || "Non ancora generato"}</p>
        </div>
      )}
    </div>
  );
};

Dashboard.propTypes = {
  isDark: PropTypes.bool.isRequired,
};

export default Dashboard;