import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
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
  admin: { label: "all'admin", icon: faUserShield },
  operators: { label: "agli operatori", icon: faUsers },
};

// Tutti gli invii, mese per mese e in ordine di data. È il contenuto della
// scheda "Tutti i mesi" dello storico: nessuna cornice, la finestra la mette
// il componente che lo ospita.
const NotificationLog = ({ clientId, clientName }) => {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState("");
  const [onlyClient, setOnlyClient] = useState(true);
  const [onlyToClient, setOnlyToClient] = useState(true);

  useEffect(() => {
    let alive = true;
    setRows(null);
    setError("");
    api
      .listNotifications({ clientId: onlyClient ? clientId : undefined })
      .then((r) => alive && setRows(r))
      .catch(() => alive && setError("Storico non disponibile."));
    return () => {
      alive = false;
    };
  }, [clientId, onlyClient]);

  const visible = (rows || []).filter((r) => !onlyToClient || r.kind === "client");

  // Ultimi 12 mesi (più eventuali mesi inviati ancora più vecchi): per ognuno
  // l'invio più recente, o niente.
  const monthSummary = () => {
    const byMonth = new Map();
    (rows || [])
      .filter((r) => r.kind === "client")
      .forEach((r) => {
        const k = `${r.year}-${r.month}`;
        const prev = byMonth.get(k);
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
    <>
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
              <span className="ep-month-cell-info">
                {row
                  ? `${fmt(row.at)}${row.by ? ` · ${row.by}` : ""}`
                  : "mai inviato"}
              </span>
            </div>
          ))}
        </div>
      )}

      {rows === null && !error ? (
        <p className="ep-share-hint">Caricamento…</p>
      ) : visible.length === 0 ? (
        <p className="ep-share-hint">Nessun invio registrato.</p>
      ) : (
        <ul className="ep-log-list">
          {visible.map((r) => (
            <li key={r.id} className="ep-log-row">
              <span className="ep-log-date">{fmt(r.at)}</span>
              <span className="ep-log-main">
                <FontAwesomeIcon icon={(KIND[r.kind] || KIND.client).icon} />{" "}
                <strong>{r.clientName}</strong> · {MONTHS_IT[r.month - 1]}{" "}
                {r.year} · {(KIND[r.kind] || KIND.client).label}
                {r.by ? ` · ${r.by}` : ""}
              </span>
              <span className="ep-log-to">
                {r.recipients.map((d) => (
                  <span
                    key={d.email}
                    className={`ep-client-chip ${d.ok ? "" : "ep-chip-fail"}`}
                    title={d.ok ? "Consegnata al mailer" : d.error || "Non riuscito"}
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

      {rows !== null && rows.length > 0 && (
        <p className="ep-share-hint">
          Data e ora del click su “Invia al cliente”. Registro attivo dal{" "}
          {fmt(rows[rows.length - 1].at)}.
        </p>
      )}
    </>
  );
};

export default NotificationLog;
