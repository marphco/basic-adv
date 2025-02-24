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
        const sortedRequests = response.data.sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        );
        console.log(
          "Chiavi della prima richiesta:",
          Object.keys(sortedRequests[0])
        ); // Log per debug
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
    console.log("Richiesta selezionata:", request);
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
    <div className="dashboard-page">
      <div
        className={`dashboard-container ${
          isDark ? "dark-theme" : "light-theme"
        }`}
      >
        <h2>Dashboard Richieste</h2>
        <button className="logout-btn" onClick={handleLogout}>
          Logout
        </button>
        {error && <p className="error-message">{error}</p>}
        <div className="requests-list">
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Nome</th>
                <th>Email</th>
                <th>Stato</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((req) => (
                <tr
                  key={req.sessionId}
                  onClick={() => handleRowClick(req)}
                  className="request-row"
                >
                  <td>{new Date(req.createdAt).toLocaleDateString()}</td>
                  <td>{req.formData.contactInfo.name || "N/D"}</td>
                  <td>{req.formData.contactInfo.email || "N/D"}</td>
                  <td>{req.projectPlan ? "Completata" : "In attesa"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Modale per i dettagli */}
        {selectedRequest && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            {/* Aggiungi i console.log qui dentro */}
            {console.log("selectedRequest.questions:", selectedRequest.questions)}
            {console.log("Array.isArray(selectedRequest.questions):", Array.isArray(selectedRequest.questions))}
            {console.log("selectedRequest.questions.length:", selectedRequest.questions ? selectedRequest.questions.length : "undefined")}
              <button className="modal-close-btn" onClick={closeModal}>
                Chiudi
              </button>
              <h3>Dettagli Richiesta</h3>
              <p>
                <strong>Session ID:</strong>{" "}
                {selectedRequest.sessionId || "N/D"}
              </p>

              <h4>Informazioni di contatto</h4>
              <ul>
                <li>
                  <strong>Nome:</strong>{" "}
                  {selectedRequest.formData?.contactInfo?.name || "N/D"}
                </li>
                <li>
                  <strong>Email:</strong>{" "}
                  {selectedRequest.formData?.contactInfo?.email || "N/D"}
                </li>
                <li>
                  <strong>Telefono:</strong>{" "}
                  {selectedRequest.formData?.contactInfo?.phone || "N/D"}
                </li>
              </ul>

              <h4>Dati del progetto</h4>
              <ul>
                <li>
                  <strong>Brand:</strong>{" "}
                  {selectedRequest.formData?.brandName || "N/D"}
                </li>
                <li>
                  <strong>Tipo:</strong>{" "}
                  {selectedRequest.formData?.projectType || "N/D"}
                </li>
                <li>
                  <strong>Settore:</strong>{" "}
                  {selectedRequest.formData?.businessField || "N/D"}
                </li>
                {selectedRequest.formData?.currentLogo && (
                  <li>
                    <strong>Logo attuale:</strong>{" "}
                    <a href={selectedRequest.formData.currentLogo} download>
                      Scarica
                    </a>
                  </li>
                )}
              </ul>

              <h4>Domande e Risposte</h4>
              <pre>{JSON.stringify(selectedRequest.questions, null, 2)}</pre>
              <pre>{JSON.stringify(selectedRequest.answers, null, 2)}</pre>
              {selectedRequest.questions &&
              Array.isArray(selectedRequest.questions) &&
              selectedRequest.questions.length > 0 ? (
                <ul>
                  {selectedRequest.questions.map((q, index) => {
                    const answer =
                      selectedRequest.answers &&
                      selectedRequest.answers[q.question];
                    return (
                      <li key={index}>
                        <strong>{q.question}</strong>
                        {q.options && Array.isArray(q.options) ? (
                          <ul>
                            {q.options.map((option, optIndex) => (
                              <li
                                key={optIndex}
                                className={
                                  answer &&
                                  answer.options &&
                                  answer.options.includes(option)
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
                            Risposta:{" "}
                            {answer && answer.input
                              ? answer.input
                              : "Nessuna risposta"}
                          </p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p>Nessuna domanda disponibile</p>
              )}

              <h4>Piano d’azione</h4>
              <pre>{JSON.stringify(selectedRequest.projectPlan, null, 2)}</pre>

              <pre>{selectedRequest.projectPlan || "Non ancora generato"}</pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

Dashboard.propTypes = {
  isDark: PropTypes.bool.isRequired,
};

export default Dashboard;
