import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTimes,
  faPaperPlane,
  faUserShield,
  faUsers,
  faTriangleExclamation,
} from "@fortawesome/free-solid-svg-icons";
import { api } from "./api";

const MONTHS_IT = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre",
];

// Data e ora in fuso italiano: è la riga che si mostra al cliente.
const fmt = (d) =>
  new Date(d).toLocaleString("it-IT", {
    timeZone: "Europe/Rome",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const KIND = {
  client: { label: "al cliente", icon: faPaperPlane },
  admin: { label: "all'admin di revisione", icon: faUserShield },
  operators: { label: "agli operatori", icon: faUsers },
};

// Storico piatto di TUTTI gli invii, dal più recente. Nessuna navigazione per
// mese: qui si vede in un colpo d'occhio quando un piano è stato mandato, da
// chi e a quale indirizzo.
const NotificationLogModal = ({ clientId, clientName, onClose }) => {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState("");
  const [onlyClient, setOnlyClient] = useState(true); // solo il cliente aperto
  const [onlyToClient, setOnlyToClient] = useState(true); // niente invii interni

  useEffect(() => {
    let alive = true;
    setRows(null);
    setError("");
    api
      .listNotifications({ clientId: onlyClient ? clientId : undefined })
      .then((r) => alive && setRows(r))
      .catch(() => alive && setError("Impossibile caricare lo storico degli invii."));
    return () => {
      alive = false;
    };
  }, [clientId, onlyClient]);

  const visible = (rows || []).filter((r) => !onlyToClient || r.kind === "client");

  // Riepilogo MESE PER MESE (solo su un singolo cliente): a colpo d'occhio si
  // vede quali mesi sono stati mandati e quali no. Copre gli ultimi 12 mesi più
  // eventuali mesi più vecchi che risultano già inviati.
  const monthSummary = () => {
    const byMonth = new Map();
    (rows || [])
      .filter((r) => r.kind === "client")
      .forEach((r) => {
        const k = `${r.year}-${r.month}`;
        const prev = byMonth.get(k);
        // tengo l'invio più recente del mese
        if (!prev || new Date(r.at) > new Date(prev.at)) byMonth.set(k, r);
      });

    const now = new Date();
    const keys = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      keys.push(`${d.getFullYear()}-${d.getMonth() + 1}`);
    }
    [...byMonth.keys()].forEach((k) => !keys.includes(k) && keys.push(k));

    return keys
      .map((k) => {
        const [y, m] = k.split("-").map(Number);
        return { year: y, month: m, row: byMonth.get(k) || null };
      })
      .sort((a, b) => b.year - a.year || b.month - a.month);
  };

  return (
    <div className="ep-modal-overlay" onClick={onClose}>
      <div className="ep-modal ep-modal--share" onClick={(e) => e.stopPropagation()}>
        <div className="ep-modal-head">
          <h3>Storico invii</h3>
          <button className="ep-icon-btn" onClick={onClose} aria-label="Chiudi">
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>
        <div className="ep-modal-body">
          <div className="ep-log-filters">
            <label className="ep-op-item">
              <input
                type="checkbox"
                checked={onlyClient}
                onChange={() => setOnlyClient((v) => !v)}
              />
              <span className="ep-op-name">Solo {clientName}</span>
            </label>
            <label className="ep-op-item">
              <input
                type="checkbox"
                checked={onlyToClient}
                onChange={() => setOnlyToClient((v) => !v)}
              />
              <span className="ep-op-name">Solo invii al cliente</span>
            </label>
          </div>

          {error && (
            <div className="ep-share-warning">
              <FontAwesomeIcon icon={faTriangleExclamation} /> {error}
            </div>
          )}

          {/* Colpo d'occhio: un mese per riga, inviato o no */}
          {rows !== null && onlyClient && (
            <div className="ep-month-grid">
              {monthSummary().map(({ year, month, row }) => (
                <div
                  key={`${year}-${month}`}
                  className={`ep-month-cell ${row ? "sent" : "missing"}`}
                >
                  <span className="ep-month-cell-name">
                    {MONTHS_IT[month - 1]} {year}
                  </span>
                  {row ? (
                    <span className="ep-month-cell-info">
                      {row.atUpperBound ? (
                        <>
                          inviato non oltre il {fmt(row.at)}
                          <span className="ep-hist-badge">ricostruita</span>
                        </>
                      ) : (
                        <>
                          inviato il {fmt(row.at)}
                          {row.by ? ` da ${row.by}` : ""}
                        </>
                      )}
                    </span>
                  ) : (
                    <span className="ep-month-cell-info">mai inviato</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {rows === null && !error ? (
            <p className="ep-share-hint">Caricamento…</p>
          ) : visible.length === 0 ? (
            <p className="ep-share-hint">
              Nessun invio registrato. Gli invii vengono registrati da quando la
              funzione è attiva: quelli precedenti non sono ricostruibili se il
              cliente non ha lasciato tracce (approvazioni o note).
            </p>
          ) : (
            <ul className="ep-log-list">
              {visible.map((r) => (
                <li key={r.id} className="ep-log-row">
                  <span className="ep-log-date">
                    {r.atUpperBound ? "entro il " : ""}
                    {fmt(r.at)}
                  </span>
                  <span className="ep-log-main">
                    <FontAwesomeIcon icon={(KIND[r.kind] || KIND.client).icon} />{" "}
                    <strong>{r.clientName}</strong> — piano di{" "}
                    {MONTHS_IT[r.month - 1]} {r.year}, inviato{" "}
                    {(KIND[r.kind] || KIND.client).label}
                    {r.by ? ` da ${r.by}` : ""}
                    {r.source === "inferred" && (
                      <span className="ep-hist-badge">ricostruita</span>
                    )}
                  </span>
                  <span className="ep-log-to">
                    {r.recipients.map((d) => (
                      <span
                        key={d.email}
                        className={`ep-client-chip ${d.ok ? "" : "ep-chip-fail"}`}
                        title={
                          d.ok
                            ? `Consegnata al mailer${d.sentAt ? ` il ${fmt(d.sentAt)}` : ""}`
                            : d.error || "Invio non riuscito"
                        }
                      >
                        {d.email}
                        {!d.ok && " ✕"}
                      </span>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationLogModal;
