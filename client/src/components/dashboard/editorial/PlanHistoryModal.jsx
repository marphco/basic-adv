import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTimes,
  faPaperPlane,
  faEnvelopeOpenText,
  faTriangleExclamation,
  faClockRotateLeft,
  faUserShield,
  faUsers,
  faWandMagicSparkles,
} from "@fortawesome/free-solid-svg-icons";

// Data + ora sempre in fuso ITALIANO (come il banner approvazioni).
const fmt = (d) =>
  new Date(d).toLocaleString("it-IT", {
    timeZone: "Europe/Rome",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const KIND_LABEL = {
  client: "Al cliente",
  admin: "All'admin di revisione",
  operators: "Agli operatori",
};
const KIND_ICON = {
  client: faPaperPlane,
  admin: faUserShield,
  operators: faUsers,
};

// Una voce di invio: quando, da chi, a quali indirizzi e con quale esito.
const NotificationRow = ({ n }) => (
  <li className={`ep-hist-item ${n.source === "inferred" ? "inferred" : ""}`}>
    <div className="ep-hist-line">
      <FontAwesomeIcon icon={KIND_ICON[n.kind] || faPaperPlane} />
      <strong>{KIND_LABEL[n.kind] || "Invio"}</strong>
      <span className="ep-hist-date">
        {n.atUpperBound ? "entro il " : ""}
        {fmt(n.at)}
      </span>
      {n.by && <span className="ep-hist-by">· inviata da {n.by}</span>}
      {n.source === "inferred" && (
        <span className="ep-hist-badge">ricostruita</span>
      )}
    </div>
    <div className="ep-hist-recipients">
      {n.recipients.map((r) => (
        <span
          key={r.email}
          className={`ep-client-chip ${r.ok ? "" : "ep-chip-fail"}`}
          title={r.ok ? "Consegnata al mailer" : r.error || "Invio non riuscito"}
        >
          {r.email}
          {!r.ok && " ✕"}
        </span>
      ))}
    </div>
    {n.message && <p className="ep-hist-msg">“{n.message}”</p>}
    {n.evidence && <p className="ep-hist-evidence">{n.evidence}</p>}
  </li>
);

const PlanHistoryModal = ({
  clientName,
  monthLabel,
  history,
  loading,
  isAdmin,
  onBackfill,
  onClose,
}) => {
  const [busy, setBusy] = useState(false);
  const [backfillMsg, setBackfillMsg] = useState("");

  const notifications = history?.notifications || [];
  const accesses = history?.accesses || [];
  const toClient = notifications.filter((n) => n.kind === "client");
  const internal = notifications.filter((n) => n.kind !== "client");
  const clientOpens = accesses.filter((a) => !a.isAgency);
  const agencyOpens = accesses.filter((a) => a.isAgency);

  const runBackfill = async () => {
    setBusy(true);
    setBackfillMsg("");
    try {
      const r = await onBackfill();
      setBackfillMsg(
        r.notifications || r.accesses
          ? `Ricostruite ${r.notifications} notifiche e ${r.accesses} aperture da approvazioni e note già in archivio.`
          : "Nessuna nuova prova da ricostruire: lo storico è già completo."
      );
    } catch {
      setBackfillMsg("Ricostruzione non riuscita. Riprova.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="ep-modal-overlay" onClick={onClose}>
      <div
        className="ep-modal ep-modal--share"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ep-modal-head">
          <h3>Storico notifiche — {monthLabel}</h3>
          <button className="ep-icon-btn" onClick={onClose} aria-label="Chiudi">
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>
        <div className="ep-modal-body">
          <p className="ep-share-desc">
            Tutto ciò che è partito a <strong>{clientName}</strong> per questo
            mese e quando il piano è stato aperto dal link ricevuto.
          </p>

          {loading ? (
            <p className="ep-share-hint">Caricamento dello storico…</p>
          ) : (
            <>
              {/* ---- Invii al cliente ---- */}
              <div className="ep-share-admin">
                <div className="ep-share-admin-head">
                  <FontAwesomeIcon icon={faPaperPlane} /> Invii al cliente (
                  {toClient.length})
                </div>
                {toClient.length ? (
                  <ul className="ep-hist-list">
                    {toClient.map((n) => (
                      <NotificationRow key={n.id} n={n} />
                    ))}
                  </ul>
                ) : (
                  <p className="ep-share-hint">
                    Nessun invio registrato per questo mese.
                  </p>
                )}
              </div>

              {/* ---- Aperture del piano ---- */}
              <div className="ep-share-admin">
                <div className="ep-share-admin-head">
                  <FontAwesomeIcon icon={faEnvelopeOpenText} /> Aperture del
                  piano ({clientOpens.length})
                </div>
                <p className="ep-share-desc">
                  Il link si sblocca solo con un'email del cliente: ogni
                  apertura qui sotto è la prova che il piano è arrivato.
                </p>
                {clientOpens.length || agencyOpens.length ? (
                  <ul className="ep-hist-list">
                    {[...clientOpens, ...agencyOpens].map((a) => (
                      <li
                        key={a.email}
                        className={`ep-hist-item ${
                          a.source === "inferred" ? "inferred" : ""
                        }`}
                      >
                        <div className="ep-hist-line">
                          <FontAwesomeIcon icon={faEnvelopeOpenText} />
                          <strong>{a.email}</strong>
                          {a.isAgency && (
                            <span className="ep-role-badge admin">agenzia</span>
                          )}
                          <span className="ep-hist-date">
                            1ª apertura {fmt(a.firstAt)}
                          </span>
                          {a.count > 1 && (
                            <span className="ep-hist-by">
                              · {a.count} aperture, ultima {fmt(a.lastAt)}
                            </span>
                          )}
                          {a.source === "inferred" && (
                            <span className="ep-hist-badge">ricostruita</span>
                          )}
                        </div>
                        {a.evidence && (
                          <p className="ep-hist-evidence">{a.evidence}</p>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="ep-share-hint">
                    Nessuna apertura registrata per questo mese.
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
                      <NotificationRow key={n.id} n={n} />
                    ))}
                  </ul>
                </div>
              )}

              {/* ---- Ricostruzione retroattiva (solo admin) ---- */}
              {isAdmin && (
                <div className="ep-share-admin">
                  <div className="ep-share-admin-head">
                    <FontAwesomeIcon icon={faClockRotateLeft} /> Storico
                    precedente
                  </div>
                  <p className="ep-share-desc">
                    Per i mesi passati (prima di questa funzione) lo storico può
                    essere ricostruito dalle prove già in archivio: approvazioni
                    del piano e note lasciate dal cliente, che si possono fare
                    solo aprendo il link ricevuto. Le voci ricostruite sono
                    marcate come tali e non sovrascrivono mai quelle reali.
                  </p>
                  {backfillMsg && (
                    <div className="ep-share-ok">
                      <FontAwesomeIcon icon={faWandMagicSparkles} />{" "}
                      {backfillMsg}
                    </div>
                  )}
                  <div className="ep-foot-right ep-share-actions">
                    <button
                      className="ep-btn ep-btn--ghost"
                      onClick={runBackfill}
                      disabled={busy}
                    >
                      <FontAwesomeIcon icon={faClockRotateLeft} />{" "}
                      {busy
                        ? "Ricostruzione in corso…"
                        : "Ricostruisci lo storico di questo cliente"}
                    </button>
                  </div>
                </div>
              )}

              <p className="ep-share-hint">
                <FontAwesomeIcon icon={faTriangleExclamation} /> “Inviata”
                significa consegnata al servizio di posta: se un indirizzo
                risulta in errore lo trovi barrato qui sopra.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlanHistoryModal;
