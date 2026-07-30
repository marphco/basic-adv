import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTimes,
  faPaperPlane,
  faEnvelopeOpenText,
  faClockRotateLeft,
  faUserShield,
  faUsers,
  faCopy,
  faCheck,
} from "@fortawesome/free-solid-svg-icons";
import NotificationLog from "./NotificationLog";

// Data + ora in fuso ITALIANO (come il banner approvazioni).
const fmt = (d) =>
  new Date(d).toLocaleString("it-IT", {
    timeZone: "Europe/Rome",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

// Con i SECONDI: serve solo nei dettagli tecnici, per cercare un messaggio nei
// log del server di posta.
const fmtPrecise = (d) =>
  new Date(d).toLocaleString("it-IT", {
    timeZone: "Europe/Rome",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

const KIND_LABEL = {
  client: "Al cliente",
  admin: "All'admin",
  operators: "Agli operatori",
};
const KIND_ICON = {
  client: faPaperPlane,
  admin: faUserShield,
  operators: faUsers,
};

const techLine = (r) =>
  [
    r.email,
    r.ok ? "consegnata al mailer" : `ERRORE: ${r.error || "invio non riuscito"}`,
    r.sentAt
      ? `${fmtPrecise(r.sentAt)} (UTC ${new Date(r.sentAt).toISOString()})`
      : "orario non registrato",
    r.providerId ? `id ${r.providerId}` : "",
    r.providerResponse ? `risposta relay: ${r.providerResponse}` : "",
  ]
    .filter(Boolean)
    .join(" · ");

// Una voce di invio: quando, da chi, a quali indirizzi e con quale esito.
const NotificationRow = ({ n, clientName, monthLabel }) => {
  const [copied, setCopied] = useState(false);
  const hasTech = n.recipients.some(
    (r) => r.sentAt || r.providerId || r.providerResponse
  );

  const copyTech = () => {
    const text = [
      `Invio piano editoriale — ${clientName} — ${monthLabel}`,
      `Registrato ${fmtPrecise(n.at)}${n.by ? ` · inviato da ${n.by}` : ""}`,
      ...n.recipients.map((r) => `- ${techLine(r)}`),
    ].join("\n");
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <li className="ep-hist-item">
      <div className="ep-hist-line">
        <FontAwesomeIcon icon={KIND_ICON[n.kind] || faPaperPlane} />
        <strong>{KIND_LABEL[n.kind] || "Invio"}</strong>
        <span className="ep-hist-date">{fmt(n.at)}</span>
        {n.by && <span className="ep-hist-by">· {n.by}</span>}
      </div>
      <div className="ep-hist-recipients">
        {n.recipients.map((r) => (
          <span
            key={r.email}
            className={`ep-client-chip ${r.ok ? "" : "ep-chip-fail"}`}
            title={
              r.ok
                ? `Consegnata al mailer${r.sentAt ? ` il ${fmtPrecise(r.sentAt)}` : ""}`
                : r.error || "Invio non riuscito"
            }
          >
            {r.email}
            {!r.ok && " ✕"}
          </span>
        ))}
      </div>
      {n.message && <p className="ep-hist-msg">“{n.message}”</p>}

      {hasTech && (
        <details className="ep-hist-tech">
          <summary>Dettagli tecnici</summary>
          <ul>
            {n.recipients.map((r) => (
              <li key={r.email}>{techLine(r)}</li>
            ))}
          </ul>
          <button className="ep-btn ep-btn--ghost" onClick={copyTech}>
            <FontAwesomeIcon icon={copied ? faCheck : faCopy} />{" "}
            {copied ? "Copiato" : "Copia"}
          </button>
        </details>
      )}
    </li>
  );
};

// Storico del piano: una sola finestra, due schede.
//  • Questo mese  → invii e aperture del mese aperto
//  • Tutti i mesi → colpo d'occhio e cronologia completa
const PlanHistoryModal = ({
  clientId,
  clientName,
  monthLabel,
  year,
  month,
  history,
  loading,
  isAdmin,
  onBackfill,
  onClose,
}) => {
  const [tab, setTab] = useState("month");
  const [busy, setBusy] = useState(false);
  const [backfillMsg, setBackfillMsg] = useState("");

  const notifications = history?.notifications || [];
  const accesses = history?.accesses || [];
  const toClient = notifications.filter((n) => n.kind === "client");
  const internal = notifications.filter((n) => n.kind !== "client");
  const clientOpens = accesses.filter((a) => !a.isAgency);
  const agencyOpens = accesses.filter((a) => a.isAgency);

  const backfillOutcome = (r) => {
    if (r.accesses) return `Ricostruite ${r.accesses} aperture.`;
    const here = (r.details?.[0]?.monthsScanned || []).find(
      (m) => m.year === year && m.month === month
    );
    if (!here)
      return `Nessuna traccia in archivio per ${monthLabel}: il cliente non ha approvato né lasciato note.`;
    if (!here.clientEvidence)
      return `Per ${monthLabel} le tracce in archivio sono di utenti dell'agenzia, non del cliente.`;
    return `Già ricostruito per ${monthLabel}.`;
  };

  const runBackfill = async () => {
    setBusy(true);
    setBackfillMsg("");
    try {
      setBackfillMsg(backfillOutcome(await onBackfill()));
    } catch {
      setBackfillMsg("Ricostruzione non riuscita.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="ep-modal-overlay" onClick={onClose}>
      <div className="ep-modal ep-modal--share" onClick={(e) => e.stopPropagation()}>
        <div className="ep-modal-head">
          <h3>Storico — {clientName}</h3>
          <button className="ep-icon-btn" onClick={onClose} aria-label="Chiudi">
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>

        <div className="ep-tabs">
          <button
            className={`ep-tab ${tab === "month" ? "active" : ""}`}
            onClick={() => setTab("month")}
          >
            {monthLabel}
          </button>
          <button
            className={`ep-tab ${tab === "all" ? "active" : ""}`}
            onClick={() => setTab("all")}
          >
            Tutti i mesi
          </button>
        </div>

        <div className="ep-modal-body">
          {tab === "all" ? (
            <NotificationLog clientId={clientId} clientName={clientName} />
          ) : loading ? (
            <p className="ep-share-hint">Caricamento…</p>
          ) : (
            <>
              {/* ---- Invii al cliente ---- */}
              <div className="ep-share-admin">
                <div className="ep-share-admin-head">
                  <FontAwesomeIcon icon={faPaperPlane} /> Invii ({toClient.length})
                </div>
                {toClient.length ? (
                  <ul className="ep-hist-list">
                    {toClient.map((n) => (
                      <NotificationRow
                        key={n.id}
                        n={n}
                        clientName={clientName}
                        monthLabel={monthLabel}
                      />
                    ))}
                  </ul>
                ) : (
                  <p className="ep-share-hint">Nessun invio registrato.</p>
                )}
              </div>

              {/* ---- Aperture del piano ---- */}
              <div className="ep-share-admin">
                <div className="ep-share-admin-head">
                  <FontAwesomeIcon icon={faEnvelopeOpenText} /> Aperture (
                  {clientOpens.length})
                </div>
                {clientOpens.length || agencyOpens.length ? (
                  <ul className="ep-hist-list">
                    {[...clientOpens, ...agencyOpens].map((a) => (
                      <li key={a.email} className="ep-hist-item">
                        <div className="ep-hist-line">
                          <FontAwesomeIcon icon={faEnvelopeOpenText} />
                          <strong>{a.email}</strong>
                          {a.isAgency && (
                            <span className="ep-role-badge admin">agenzia</span>
                          )}
                          <span className="ep-hist-date">{fmt(a.firstAt)}</span>
                          {a.count > 1 && (
                            <span className="ep-hist-by">
                              · {a.count} aperture, ultima {fmt(a.lastAt)}
                            </span>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="ep-share-hint">
                    Nessuna apertura. Il link si sblocca solo con un'email del
                    cliente: un'apertura è la prova che il piano è arrivato.
                  </p>
                )}
              </div>

              {/* ---- Invii interni (admin / operatori) ---- */}
              {internal.length > 0 && (
                <div className="ep-share-admin">
                  <div className="ep-share-admin-head">
                    <FontAwesomeIcon icon={faUsers} /> Invii interni (
                    {internal.length})
                  </div>
                  <ul className="ep-hist-list">
                    {internal.map((n) => (
                      <NotificationRow
                        key={n.id}
                        n={n}
                        clientName={clientName}
                        monthLabel={monthLabel}
                      />
                    ))}
                  </ul>
                </div>
              )}

              {/* ---- Ricostruzione aperture passate (solo admin) ---- */}
              {isAdmin && (
                <div className="ep-share-admin">
                  <div className="ep-share-admin-head">
                    <FontAwesomeIcon icon={faClockRotateLeft} /> Mesi precedenti
                  </div>
                  <p className="ep-share-desc">
                    Ricostruisce le <strong>aperture</strong> passate da
                    approvazioni e note del cliente. Gli invii no: quelli
                    compaiono solo con data e ora vere.
                  </p>
                  {backfillMsg && (
                    <div className="ep-share-ok">
                      <FontAwesomeIcon icon={faCheck} /> {backfillMsg}
                    </div>
                  )}
                  <div className="ep-foot-right ep-share-actions">
                    <button
                      className="ep-btn ep-btn--ghost"
                      onClick={runBackfill}
                      disabled={busy}
                    >
                      <FontAwesomeIcon icon={faClockRotateLeft} />{" "}
                      {busy ? "Ricostruzione…" : "Ricostruisci aperture"}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlanHistoryModal;
