import { useState, useEffect, useRef } from "react";
import PropTypes from "prop-types";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTimes,
  faPlus,
  faTrash,
  faPen,
  faBuilding,
  faCheck,
  faUserShield,
  faUser,
} from "@fortawesome/free-solid-svg-icons";
import ChannelIcon, { CHANNELS } from "./ChannelIcon";
import { confirmDialog } from "./uiNotify";

const emptyForm = {
  name: "",
  contactName: "",
  emails: [""], // un cliente può avere più email (società con più soci)
  operators: [], // operatore/i (id utente) — almeno uno obbligatorio
  admins: [], // admin di revisione (id) — opzionale; assente se operatore è admin
  pages: [{ name: "", channels: ["instagram"] }],
};

// Gestione clienti (solo admin): lista + creazione + modifica + eliminazione.
// Stesso pattern del modale Utenti. In modifica si preservano gli _id delle
// pagine esistenti: i post puntano alla pagina tramite il suo _id, quindi
// rigenerarli orfanerebbe i post già pubblicati.
const ClientModal = ({
  clients,
  users = [],
  onClose,
  onCreate,
  onUpdate,
  onDelete,
}) => {
  // Tutti gli utenti (operatori = member o admin); admin = solo ruolo admin.
  const adminUsers = users.filter((u) => u.role === "admin");
  const adminIdSet = new Set(adminUsers.map((u) => u.id));
  const operatorIsAdmin = (ids) => ids.some((id) => adminIdSet.has(id));
  // editing: null | "new" | <clientId>
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [initial, setInitial] = useState(emptyForm);

  const isNew = editing === "new";
  const dirty = () =>
    editing !== null && JSON.stringify(form) !== JSON.stringify(initial);

  const cancelEdit = async () => {
    if (
      dirty() &&
      !(await confirmDialog("Hai modifiche non salvate. Annullarle?", {
        danger: true,
        confirmLabel: "Annulla modifiche",
      }))
    )
      return;
    setEditing(null);
    setForm(emptyForm);
  };
  const requestClose = async () => {
    if (
      dirty() &&
      !(await confirmDialog("Hai modifiche non salvate. Chiudere comunque?", {
        danger: true,
        confirmLabel: "Chiudi",
      }))
    )
      return;
    onClose();
  };

  // ESC: se un form è aperto torna alla lista (con conferma se sporco),
  // altrimenti chiude il modale. Ref per evitare closure stantie.
  const escRef = useRef(() => {});
  useEffect(() => {
    escRef.current = () => (editing !== null ? cancelEdit() : onClose());
  });
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && escRef.current();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const startCreate = () => {
    setForm(emptyForm);
    setInitial(emptyForm);
    setEditing("new");
  };
  const startEdit = (c) => {
    const f = {
      name: c.name || "",
      contactName: c.contactName || "",
      emails:
        c.emails && c.emails.length
          ? [...c.emails]
          : c.email
          ? [c.email]
          : [""],
      operators: (c.operators || []).map(String),
      admins: (c.admins || []).map(String),
      pages: (c.pages || []).map((p) => ({
        _id: p._id,
        name: p.name || "",
        channels: p.channels || [],
      })),
    };
    setForm(f);
    setInitial(f);
    setEditing(c.id);
  };

  // --- editor email (lista variabile) ---
  const setEmail = (i, v) =>
    setForm((f) => ({ ...f, emails: f.emails.map((e, idx) => (idx === i ? v : e)) }));
  const addEmail = () => setForm((f) => ({ ...f, emails: [...f.emails, ""] }));
  const removeEmail = (i) =>
    setForm((f) => ({ ...f, emails: f.emails.filter((_, idx) => idx !== i) }));

  // --- operatori (selezione multipla; member o admin) ---
  const toggleOperator = (id) =>
    setForm((f) => ({
      ...f,
      operators: f.operators.includes(id)
        ? f.operators.filter((x) => x !== id)
        : [...f.operators, id],
    }));

  // --- admin di revisione (selezione multipla) ---
  const toggleAdmin = (id) =>
    setForm((f) => ({
      ...f,
      admins: f.admins.includes(id)
        ? f.admins.filter((x) => x !== id)
        : [...f.admins, id],
    }));

  // --- editor pagine ---
  const addPage = () =>
    setForm((f) => ({
      ...f,
      pages: [...f.pages, { name: "", channels: ["instagram"] }],
    }));
  const removePage = (i) =>
    setForm((f) => ({ ...f, pages: f.pages.filter((_, idx) => idx !== i) }));
  const setPageName = (i, v) =>
    setForm((f) => ({
      ...f,
      pages: f.pages.map((pg, idx) => (idx === i ? { ...pg, name: v } : pg)),
    }));
  const toggleChannel = (i, ch) =>
    setForm((f) => ({
      ...f,
      pages: f.pages.map((pg, idx) => {
        if (idx !== i) return pg;
        const has = pg.channels.includes(ch);
        return {
          ...pg,
          channels: has
            ? pg.channels.filter((c) => c !== ch)
            : [...pg.channels, ch],
        };
      }),
    }));

  const canSave =
    form.name.trim() &&
    form.operators.length > 0 &&
    form.pages.length > 0 &&
    form.pages.every((pg) => pg.name.trim() && pg.channels.length);

  const submit = () => {
    // Se un operatore è admin → niente admin di revisione per questo cliente.
    const reviewAdmins = operatorIsAdmin(form.operators) ? [] : form.admins;
    const payload = {
      name: form.name.trim(),
      contactName: form.contactName.trim(),
      emails: form.emails.map((e) => e.trim()).filter(Boolean),
      operators: form.operators,
      admins: reviewAdmins,
      pages: form.pages.map((pg) => ({
        ...(pg._id ? { _id: pg._id } : {}), // preserva l'id pagina in modifica
        name: pg.name.trim(),
        channels: pg.channels,
      })),
    };
    if (isNew) onCreate(payload);
    else onUpdate(editing, payload);
    setEditing(null);
    setForm(emptyForm);
  };

  const handleDelete = async (c) => {
    if (
      await confirmDialog(
        `Eliminare definitivamente "${c.name}" e TUTTI i suoi post? L'operazione non è reversibile.`,
        { danger: true, confirmLabel: "Elimina", title: "Elimina cliente" }
      )
    )
      onDelete(c.id);
  };

  return (
    <div className="ep-modal-overlay" onClick={requestClose}>
      <div className="ep-modal ep-modal--share" onClick={(e) => e.stopPropagation()}>
        <div className="ep-modal-head">
          <h3>Clienti</h3>
          <button className="ep-icon-btn" onClick={requestClose} aria-label="Chiudi">
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>

        <div className="ep-modal-body">
          {/* Lista clienti */}
          <div className="ep-user-list">
            {clients.length === 0 && (
              <p className="ep-user-noclients">
                Nessun cliente ancora. Creane uno qui sotto.
              </p>
            )}
            {clients.map((c) => (
              <div key={c.id} className="ep-user-row">
                <span className="ep-user-ava">
                  <FontAwesomeIcon icon={faBuilding} />
                </span>
                <div className="ep-user-info">
                  <div className="ep-user-name">
                    {c.name}
                    <span className="ep-role-badge">
                      {(c.pages?.length || 0) === 1
                        ? "1 pagina"
                        : `${c.pages?.length || 0} pagine`}
                    </span>
                  </div>
                  {(c.contactName || c.email) && (
                    <div className="ep-user-email">
                      {[c.contactName, c.email].filter(Boolean).join(" · ")}
                    </div>
                  )}
                  <div className="ep-user-clients">
                    {(c.pages || []).map((pg) => (
                      <span
                        key={pg.id || pg.name}
                        className="ep-client-chip ep-client-page-chip"
                      >
                        <span className="ep-tab-dots">
                          {(pg.channels || []).map((ch) => (
                            <ChannelIcon key={ch} channel={ch} />
                          ))}
                        </span>
                        {pg.name}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="ep-user-actions">
                  <button
                    className="ep-icon-btn ep-icon-btn--sm"
                    onClick={() => startEdit(c)}
                    aria-label="Modifica cliente"
                  >
                    <FontAwesomeIcon icon={faPen} />
                  </button>
                  <button
                    className="ep-icon-btn ep-icon-btn--sm"
                    onClick={() => handleDelete(c)}
                    aria-label="Elimina cliente"
                  >
                    <FontAwesomeIcon icon={faTrash} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Form creazione / modifica */}
          {editing === null ? (
            <button className="ep-add-page-btn" onClick={startCreate}>
              <FontAwesomeIcon icon={faPlus} /> Nuovo cliente
            </button>
          ) : (
            <div className="ep-user-form">
              <div className="ep-user-form-title">
                {isNew ? "Nuovo cliente" : `Modifica · ${initial.name}`}
              </div>

              <div className="ep-field">
                <label className="ep-field-label">Nome cliente</label>
                <input
                  className="ep-input"
                  value={form.name}
                  placeholder="Es. Dioniso's Hotels"
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>

              <div className="ep-field">
                <label className="ep-field-label">Referente</label>
                <input
                  className="ep-input"
                  value={form.contactName}
                  placeholder="Es. Sofia Greco"
                  onChange={(e) =>
                    setForm({ ...form, contactName: e.target.value })
                  }
                />
              </div>

              <div className="ep-field-head">
                <label className="ep-field-label">Email cliente</label>
                <span className="ep-media-type">
                  {form.emails.filter((e) => e.trim()).length > 1
                    ? `${form.emails.filter((e) => e.trim()).length} destinatari`
                    : "destinatari del piano"}
                </span>
              </div>
              {form.emails.map((em, i) => (
                <div key={i} className="ep-page-row-top">
                  <input
                    className="ep-input"
                    type="email"
                    value={em}
                    placeholder="email@cliente.it"
                    onChange={(e) => setEmail(i, e.target.value)}
                  />
                  {form.emails.length > 1 && (
                    <button
                      className="ep-icon-btn ep-icon-btn--sm"
                      onClick={() => removeEmail(i)}
                      aria-label="Rimuovi email"
                    >
                      <FontAwesomeIcon icon={faTrash} />
                    </button>
                  )}
                </div>
              ))}
              <button className="ep-add-page-btn" onClick={addEmail}>
                <FontAwesomeIcon icon={faPlus} /> Aggiungi email
              </button>
              <p className="ep-user-noclients">
                Per società con più soci puoi inviare il piano a più indirizzi.
              </p>

              {/* Operatori: chi gestisce il cliente e riceve i suoi feedback */}
              <div className="ep-field-head">
                <label className="ep-field-label">Operatori</label>
                <span className="ep-media-type">
                  {form.operators.length
                    ? `${form.operators.length} selezionat${
                        form.operators.length === 1 ? "o" : "i"
                      }`
                    : "obbligatorio"}
                </span>
              </div>
              {users.length === 0 ? (
                <p className="ep-user-noclients">
                  Nessun utente disponibile. Creane uno nella gestione Utenti.
                </p>
              ) : (
                <div className="ep-admin-picker">
                  {users.map((u) => {
                    const on = form.operators.includes(u.id);
                    const isAdmin = adminIdSet.has(u.id);
                    return (
                      <button
                        type="button"
                        key={u.id}
                        className={`ep-admin-chip ${on ? "on" : ""}`}
                        onClick={() => toggleOperator(u.id)}
                      >
                        <FontAwesomeIcon
                          icon={on ? faCheck : isAdmin ? faUserShield : faUser}
                        />
                        {u.name || u.username}
                        {isAdmin && (
                          <span className="ep-admin-chip-warn">· admin</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
              <p className="ep-user-noclients">
                Chi gestisce il cliente e riceve i suoi feedback. Almeno uno è
                obbligatorio.
              </p>

              {/* Admin di revisione: solo se nessun operatore è già admin */}
              {!operatorIsAdmin(form.operators) ? (
                <>
                  <div className="ep-field-head">
                    <label className="ep-field-label">Admin di revisione</label>
                    <span className="ep-media-type">
                      {form.admins.length
                        ? `${form.admins.length} selezionat${
                            form.admins.length === 1 ? "o" : "i"
                          }`
                        : "facoltativo"}
                    </span>
                  </div>
                  {adminUsers.filter((a) => !form.operators.includes(a.id))
                    .length === 0 ? (
                    <p className="ep-user-noclients">
                      Nessun admin disponibile per la revisione.
                    </p>
                  ) : (
                    <div className="ep-admin-picker">
                      {adminUsers
                        .filter((a) => !form.operators.includes(a.id))
                        .map((a) => {
                          const on = form.admins.includes(a.id);
                          return (
                            <button
                              type="button"
                              key={a.id}
                              className={`ep-admin-chip ${on ? "on" : ""}`}
                              onClick={() => toggleAdmin(a.id)}
                            >
                              <FontAwesomeIcon
                                icon={on ? faCheck : faUserShield}
                              />
                              {a.name || a.username}
                              {!a.email && (
                                <span className="ep-admin-chip-warn">
                                  · senza email
                                </span>
                              )}
                            </button>
                          );
                        })}
                    </div>
                  )}
                  <p className="ep-user-noclients">
                    Riceve il piano «per revisione» quando l'operatore glielo
                    invia (modifiche dirette + note interne).
                  </p>
                </>
              ) : (
                <p className="ep-user-noclients">
                  Un operatore è già admin: per questo cliente non serve un admin
                  di revisione.
                </p>
              )}

              <div className="ep-field-head">
                <label className="ep-field-label">Pagine</label>
                <span className="ep-media-type">
                  {form.pages.length === 1
                    ? "Pagina singola"
                    : `${form.pages.length} pagine`}
                </span>
              </div>

              {form.pages.map((pg, i) => (
                <div key={i} className="ep-page-row">
                  <div className="ep-page-row-top">
                    <input
                      className="ep-input"
                      value={pg.name}
                      placeholder={`Nome pagina ${i + 1} (es. Palazzo Salgar)`}
                      onChange={(e) => setPageName(i, e.target.value)}
                    />
                    {form.pages.length > 1 && (
                      <button
                        className="ep-icon-btn ep-icon-btn--sm"
                        onClick={() => removePage(i)}
                        aria-label="Rimuovi pagina"
                      >
                        <FontAwesomeIcon icon={faTrash} />
                      </button>
                    )}
                  </div>
                  <div className="ep-chan-toggles">
                    {CHANNELS.map((ch) => (
                      <button
                        key={ch}
                        type="button"
                        className={`ep-chan-toggle ${
                          pg.channels.includes(ch) ? "on" : ""
                        }`}
                        onClick={() => toggleChannel(i, ch)}
                      >
                        <ChannelIcon channel={ch} />
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              <button className="ep-add-page-btn" onClick={addPage}>
                <FontAwesomeIcon icon={faPlus} /> Aggiungi pagina
              </button>

              {!isNew && (
                <p className="ep-user-noclients">
                  Rimuovere una pagina nasconde i post già associati a quella
                  pagina.
                </p>
              )}

              <div className="ep-foot-right">
                <button className="ep-btn ep-btn--ghost" onClick={cancelEdit}>
                  Annulla
                </button>
                <button
                  className="ep-btn ep-btn--primary"
                  onClick={submit}
                  disabled={!canSave}
                >
                  {isNew ? "Crea cliente" : "Salva modifiche"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

ClientModal.propTypes = {
  clients: PropTypes.array.isRequired,
  users: PropTypes.array,
  onClose: PropTypes.func.isRequired,
  onCreate: PropTypes.func.isRequired,
  onUpdate: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
};

export default ClientModal;
