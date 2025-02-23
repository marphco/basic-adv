import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import PropTypes from "prop-types";
import "../dynamic-form/DynamicForm.css";
import "./Login.css";

const Login = ({ isDark }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:8080").replace(/\/$/, "");
  const loginUrl = `${API_URL}/api/login`;

  useEffect(() => {
    // Blocca lo scroll orizzontale solo su questa pagina
    document.body.style.overflowX = "hidden";
    return () => {
      document.body.style.overflowX = "auto"; // Ripristina esplicitamente per la homepage
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("Invio richiesta a:", loginUrl);
    console.log("Dati inviati:", { username, password });
    try {
      const response = await axios.post(loginUrl, { username, password });
      console.log("Risposta ricevuta:", response.data);
      localStorage.setItem("token", response.data.token);
      navigate("/dashboard");
    } catch (err) {
      setError("Credenziali non valide");
      console.error("Errore:", err.message, err.response?.data || "Nessun dato di risposta");
    }
  };

  return (
    <div className="login-page">
      <div className={`dynamic-form ${isDark ? "dark-theme" : "light-theme"}`}>
        <h2>Login Admin</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              className="form-input"
            />
          </div>
          <div className="form-group">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="form-input"
            />
          </div>
          {error && <p className="error-message">{error}</p>}
          <div className="form-actions">
            <button type="submit" className="submit-btn">
              Accedi
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

Login.propTypes = {
  isDark: PropTypes.bool.isRequired,
};

export default Login;