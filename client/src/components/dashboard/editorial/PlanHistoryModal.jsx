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
  faCopy,
  faCheck,
  faPlug,
} from "@fortawesome/free-solid-svg-icons";
import { api } from "./api";

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

// Con i SECONDI: serve per cercare l'invio nei log del server di posta.
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
  admin: "All'admin di revisione",
  operators: "Agli operatori",
};
const KIND_ICON = {
  client: faPaperPlane,
  admin: faUserShield,
  operators: faUsers,
};

// Riferimento tecnico di un destinatario, in una riga: è quello che serve per
// far cercare l'invio nei log del server di posta.
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
  // I dati tecnici esistono solo per gli invii registrati davvero (non per le
  // voci ricostruite a posteriori) e per gli invii fatti dopo questa funzione.
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
        {n.by && <span className="ep-hist-by">· inviata da {n.by}</span>}
        {n.source === "maillog" && (
          <span className="ep-hist-badge">dal server di posta</span>
        )}
      </div>
      <div className="ep-hist-recipients">
        {n.recipients.map((r) => (
          <span
            key={r.email}
            className={`ep-client-chip ${r.ok ? "" : "ep-chip-fail"}`}
            title={
              r.ok
                ? `Consegnata al mailer${
                    r.sentAt ? ` il ${fmtPrecise(r.sentAt)}` : ""
                  }${r.providerId ? ` · id ${r.providerId}` : ""}`
                : r.error || "Invio non riuscito"
            }
          >
            {r.email}
            {!r.ok && " ✕"}
          </span>
        ))}
      </div>
      {n.message && <p className="ep-hist-msg">“{n.message}”</p>}
      {n.evidence && <p className="ep-hist-evidence">{n.evidence}</p>}

      {hasTech && (
        <details className="ep-hist-tech">
          <summary>Dettagli tecnici (per i log del mail server)</summary>
          <ul>
            {n.recipients.map((r) => (
              <li key={r.email}>{techLine(r)}</li>
            ))}
          </ul>
          <button className="ep-btn ep-btn--ghost" onClick={copyTech}>
            <FontAwesomeIcon icon={copied ? faCheck : faCopy} />{" "}
            {copied ? "Copiato" : "Copia dettagli"}
          </button>
        </details>
      )}
    </li>
  );
};

const PlanHistoryModal = ({
  clientName,
  monthLabel,
  year,
  month,
  history,
  loading,
  isAdmin,
  onBackfill,
  onImportMailLog,
  onClose,
}) => {
  const [busy, setBusy] = useState(false);
  const [backfillMsg, setBackfillMsg] = useState("");
  const [mailLogBusy, setMailLogBusy] = useState(false);
  const [mailLogMsg, setMailLogMsg] = useState("");
  const [probe, setProbe] = useState(null); // esito della verifica connessione
  const [probeBusy, setProbeBusy] = useState(false);
  const [copiedProbe, setCopiedProbe] = useState(false);

  // Verifica la connessione al pannello del provider e mostra il formato dei
  // dati restituiti: serve a confermare comando e nomi dei campi senza dover
  // interrogare l'API a mano.
  const runProbe = async () => {
    setProbeBusy(true);
    setProbe(null);
    try {
      setProbe({ ok: true, data: await api.probeMailLog() });
    } catch (e) {
      setProbe({
        ok: false,
        error:
          e?.response?.data?.error ||
          `${e?.response?.status || ""} ${e?.message || "connessione non riuscita"}`.trim(),
        status: e?.response?.status,
        attempts: e?.response?.data?.attempts || [],
      });
    } finally {
      setProbeBusy(false);
    }
  };

  const notifications = history?.notifications || [];
  const accesses = history?.accesses || [];
  const toClient = notifications.filter((n) => n.kind === "client");
  const internal = notifications.filter((n) => n.kind !== "client");
  const clientOpens = accesses.filter((a) => !a.isAgency);
  const agencyOpens = accesses.filter((a) => a.isAgency);

  // Spiega l'esito della ricostruzione. Il caso più frequente — e il più
  // frainteso — è "non c'è nulla da ricostruire": va detto chiaramente che in
  // archivio non esistono prove per quel mese, non che lo storico è a posto.
  const backfillOutcome = (r, year, month) => {
    if (r.accesses)
      return `Ricostruite ${r.accesses} aperture del piano da approvazioni e note già in archivio.`;

    const scanned = r.details?.[0]?.monthsScanned || [];
    const here = scanned.find((m) => m.year === year && m.month === month);
    if (!here)
      return (
        `Per ${monthLabel} non c'è nessuna prova in archivio: il cliente non ha ` +
        `approvato il piano né lasciato note. Ricevere l'email non lascia traccia ` +
        `nel sistema, quindi non c'è niente da ricostruire — gli invii vengono ` +
        `registrati da qui in avanti.`
      );
    if (!here.clientEvidence)
      return (
        `Per ${monthLabel} le uniche tracce in archivio (${here.approvals} approvazioni, ` +
        `${here.notes} note) risultano di utenti dell'agenzia, non del cliente: ` +
        `non provano che il piano gli sia arrivato.`
      );
    return `Storico già completo per ${monthLabel}: le prove in archivio erano già state ricostruite.`;
  };

  const runBackfill = async () => {
    setBusy(true);
    setBackfillMsg("");
    try {
      const r = await onBackfill();
      setBackfillMsg(backfillOutcome(r, year, month));
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
                      <NotificationRow
                        key={n.id}
                        n={n}
                        clientName={clientName}
                        monthLabel={monthLabel}
                      />
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

              {/* ---- Recupero dal log del server di posta (solo admin) ---- */}
              {isAdmin && (
                <div className="ep-share-admin">
                  <div className="ep-share-admin-head">
                    <FontAwesomeIcon icon={faEnvelopeOpenText} /> Log del server
                    di posta
                  </div>
                  <p className="ep-share-desc">
                    Interroga il pannello del provider e riporta qui gli invii
                    di {monthLabel} con <strong>data e ora reali</strong>, anche
                    se sono precedenti al registro interno. Il log dice quando e
                    a chi, non chi ha premuto invia: quelle voci restano marcate
                    come provenienti dal server di posta.
                  </p>
                  {mailLogMsg && (
                    <div className="ep-share-ok">
                      <FontAwesomeIcon icon={faEnvelopeOpenText} /> {mailLogMsg}
                    </div>
                  )}

                  {/* Esito della verifica: se qualcosa non torna, qui si legge
                      esattamente cosa (credenziali, permesso, comando). */}
                  {probe && (
                    <div className="ep-hist-tech">
                      {probe.ok ? (
                        <ul>
                          <li>connessione riuscita a {probe.data.endpoint}</li>
                          <li>record letti: {probe.data.recordsFound}</li>
                          <li>
                            campi disponibili:{" "}
                            {(probe.data.sampleKeys || []).join(", ") || "—"}
                          </li>
                          <li>
                            esempio interpretato:{" "}
                            {probe.data.sampleNormalized
                              ? JSON.stringify(probe.data.sampleNormalized)
                              : "—"}
                          </li>
                        </ul>
                      ) : (
                        <ul>
                          <li>{probe.error}</li>
                          {(probe.attempts || []).map((a) => (
                            <li key={a.endpoint}>
                              {a.endpoint} → {a.status || "nessuna risposta"}
                              {a.response ? ` — ${a.response}` : ""}
                            </li>
                          ))}
                        </ul>
                      )}
                      <button
                        className="ep-btn ep-btn--ghost"
                        onClick={() => {
                          navigator.clipboard
                            ?.writeText(JSON.stringify(probe, null, 2))
                            .catch(() => {});
                          setCopiedProbe(true);
                          setTimeout(() => setCopiedProbe(false), 1800);
                        }}
                      >
                        <FontAwesomeIcon icon={copiedProbe ? faCheck : faCopy} />{" "}
                        {copiedProbe ? "Copiato" : "Copia esito"}
                      </button>
                    </div>
                  )}

                  <div className="ep-foot-right ep-share-actions">
                    <button
                      className="ep-btn ep-btn--ghost"
                      onClick={runProbe}
                      disabled={probeBusy}
                    >
                      <FontAwesomeIcon icon={faPlug} />{" "}
                      {probeBusy ? "Verifica…" : "Verifica connessione"}
                    </button>
                    <button
                      className="ep-btn ep-btn--ghost"
                      onClick={async () => {
                        setMailLogBusy(true);
                        setMailLogMsg("");
                        try {
                          const r = await onImportMailLog();
                          setMailLogMsg(
                            r.found
                              ? `Trovati ${r.found} invii nel log: ${r.imported} aggiunti allo storico` +
                                (r.skipped ? `, ${r.skipped} già presenti` : "") +
                                "."
                              : `Nessun invio di ${monthLabel} trovato nel log del server di posta (potrebbe essere fuori dal periodo conservato dal provider).`
                          );
                        } catch (e) {
                          setMailLogMsg(
                            e?.response?.data?.error ||
                              "Lettura del log non riuscita."
                          );
                        } finally {
                          setMailLogBusy(false);
                        }
                      }}
                      disabled={mailLogBusy}
                    >
                      <FontAwesomeIcon icon={faEnvelopeOpenText} />{" "}
                      {mailLogBusy
                        ? "Lettura in corso…"
                        : "Recupera dal log del server di posta"}
                    </button>
                  </div>
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
                    Per i mesi passati si possono ricostruire le{" "}
                    <strong>aperture</strong> del piano dalle prove in archivio:
                    approvazioni e note del cliente, che si possono fare solo
                    aprendo il link ricevuto. Gli <strong>invii</strong> invece
                    non si ricostruiscono mai: compaiono solo con la data e
                    l'ora vere del click, come le approvazioni.
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
