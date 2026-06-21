import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTimes,
  faPlus,
  faTrash,
  faPen,
  faUserShield,
  faUser,
} from "@fortawesome/free-solid-svg-icons";

const emptyForm = {
  username: "",
  name: "",
  email: "",
  password: "",
  role: "member",
  assignedClients: [],
};

// Gestione utenti (solo admin): lista + creazione + modifica (incl. assegnazione clienti).
const UserManagementModal = ({
  users,
  clients,
  currentUserId,
  onClose,
  onCreate,
  onUpdate,
  onDelete,
}) => {
  // editing: null | "new" | <userId>
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && (editing ? setEditing(null) : onClose());
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, editing]);

  const clientName = (id) => clients.find((c) => c.id === id)?.name || id;

  const startCreate = () => {
    setForm(emptyForm);
    setEditing("new");
  };
  const startEdit = (u) => {
    setForm({
      username: u.username,
      name: u.name || "",
      email: u.email || "",
      password: "",
      role: u.role,
      assignedClients: u.assignedClients || [],
    });
    setEditing(u.id);
  };

  const isNew = editing === "new";
  const canSave =
    form.name.trim() &&
    (isNew ? form.username.trim() && form.password.trim() : true);

  const submit = () => {
    // NB: l'assegnazione clienti (operatore) si gestisce dalla scheda Cliente,
    // non qui — quindi NON inviamo assignedClients (il server non lo tocca).
    if (isNew) {
      onCreate({
        username: form.username.trim(),
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
      });
    } else {
      const data = {
        name: form.name.trim(),
        email: form.email.trim(),
        role: form.role,
      };
      if (form.password) data.password = form.password; // vuoto = non cambiare
      onUpdate(editing, data);
    }
    setEditing(null);
    setForm(emptyForm);
  };

  return (
    <div className="ep-modal-overlay" onClick={onClose}>
      <div className="ep-modal ep-modal--share" onClick={(e) => e.stopPropagation()}>
        <div className="ep-modal-head">
          <h3>Utenti</h3>
          <button className="ep-icon-btn" onClick={onClose} aria-label="Chiudi">
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>

        <div className="ep-modal-body">
          {/* Lista utenti */}
          <div className="ep-user-list">
            {users.map((u) => (
              <div key={u.id} className="ep-user-row">
                <span className={`ep-user-ava ${u.role}`}>
                  <FontAwesomeIcon icon={u.role === "admin" ? faUserShield : faUser} />
                </span>
                <div className="ep-user-info">
                  <div className="ep-user-name">
                    {u.name}
                    <span className="ep-user-handle">@{u.username}</span>
                    <span className={`ep-role-badge ${u.role}`}>
                      {u.role === "admin" ? "Admin" : "Operatore"}
                    </span>
                  </div>
                  {u.email && <div className="ep-user-email">{u.email}</div>}
                  {u.role === "member" && (
                    <div className="ep-user-clients">
                      {u.assignedClients && u.assignedClients.length ? (
                        u.assignedClients.map((cid) => (
                          <span key={cid} className="ep-client-chip">
                            {clientName(cid)}
                          </span>
                        ))
                      ) : (
                        <span className="ep-user-noclients">
                          Nessun cliente assegnato
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div className="ep-user-actions">
                  <button
                    className="ep-icon-btn ep-icon-btn--sm"
                    onClick={() => startEdit(u)}
                    aria-label="Modifica utente"
                  >
                    <FontAwesomeIcon icon={faPen} />
                  </button>
                  {u.id !== currentUserId && (
                    <button
                      className="ep-icon-btn ep-icon-btn--sm"
                      onClick={() => onDelete(u.id)}
                      aria-label="Elimina utente"
                    >
                      <FontAwesomeIcon icon={faTrash} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Form creazione / modifica */}
          {editing === null ? (
            <button className="ep-add-page-btn" onClick={startCreate}>
              <FontAwesomeIcon icon={faPlus} /> Nuovo utente
            </button>
          ) : (
            <div className="ep-user-form">
              <div className="ep-user-form-title">
                {isNew ? "Nuovo utente" : `Modifica · @${form.username}`}
              </div>
              <div className="ep-field-row">
                <div className="ep-field">
                  <label className="ep-field-label">Nome</label>
                  <input
                    className="ep-input"
                    value={form.name}
                    placeholder="Es. Giulia Rossi"
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div className="ep-field">
                  <label className="ep-field-label">Username</label>
                  <input
                    className="ep-input"
                    value={form.username}
                    placeholder="es. giulia"
                    disabled={!isNew}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                  />
                </div>
              </div>
              <div className="ep-field-row">
                <div className="ep-field">
                  <label className="ep-field-label">Email</label>
                  <input
                    className="ep-input"
                    type="email"
                    value={form.email}
                    placeholder="email@agenzia.it"
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
                <div className="ep-field">
                  <label className="ep-field-label">
                    {isNew ? "Password" : "Nuova password (opzionale)"}
                  </label>
                  <input
                    className="ep-input"
                    type="password"
                    value={form.password}
                    placeholder={isNew ? "Password iniziale" : "lascia vuoto per non cambiare"}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                  />
                </div>
              </div>
              <div className="ep-field-row">
                <div className="ep-field">
                  <label className="ep-field-label">Ruolo</label>
                  <select
                    className="ep-select"
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                  >
                    <option value="member">Operatore</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>

              <p className="ep-user-noclients">
                L'assegnazione ai clienti (operatore / admin di revisione) si
                gestisce dalla scheda «Clienti».
              </p>

              <div className="ep-foot-right">
                <button
                  className="ep-btn ep-btn--ghost"
                  onClick={() => {
                    setEditing(null);
                    setForm(emptyForm);
                  }}
                >
                  Annulla
                </button>
                <button
                  className="ep-btn ep-btn--primary"
                  onClick={submit}
                  disabled={!canSave}
                >
                  {isNew ? "Crea utente" : "Salva modifiche"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

UserManagementModal.propTypes = {
  users: PropTypes.array.isRequired,
  clients: PropTypes.array.isRequired,
  currentUserId: PropTypes.string,
  onClose: PropTypes.func.isRequired,
  onCreate: PropTypes.func.isRequired,
  onUpdate: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
};

export default UserManagementModal;
