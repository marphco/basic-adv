import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTimes,
  faTriangleExclamation,
  faCheck,
  faCloudArrowUp,
  faHardDrive,
} from "@fortawesome/free-solid-svg-icons";
import { api } from "./api";

const MB = (n) => {
  if (!n) return "0 MB";
  const mb = n / 1024 / 1024;
  return mb >= 1024 ? `${(mb / 1024).toFixed(2)} GB` : `${mb.toFixed(1)} MB`;
};

// Archivio file: quanto pesa il volume, quanto il bucket, e la copia dei file
// dal primo al secondo. La copia va a LOTTI e viene ripetuta finché non resta
// nulla: niente richieste infinite, e si può interrompere quando si vuole.
const StorageModal = ({ onClose }) => {
  const [status, setStatus] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState("");
  const [progress, setProgress] = useState(null);

  const load = () =>
    api
      .storageStatus()
      .then(setStatus)
      .catch((e) => setError(e?.response?.data?.error || "Stato non disponibile."));

  useEffect(() => {
    load();
  }, []);

  const simulate = async () => {
    setBusy(true);
    setLog("");
    try {
      // limite alto: la simulazione non scrive, quindi può contare tutto
      const r = await api.migrateMedia({ dryRun: true, limit: 5000 });
      setLog(
        `Da copiare: ${r.copied + r.remaining} file, ${MB(r.bytes)} in tutto. ` +
          `Già sul bucket: ${r.skipped}.` +
          (r.failed ? ` Problemi: ${r.failed}.` : "")
      );
    } catch (e) {
      setLog(e?.response?.data?.error || "Simulazione non riuscita.");
    } finally {
      setBusy(false);
    }
  };

  // Copia vera: un lotto dopo l'altro finché `remaining` non è zero.
  const copyAll = async () => {
    setBusy(true);
    setLog("");
    let copied = 0;
    let failed = 0;
    let bytes = 0;
    try {
      for (let round = 0; round < 500; round++) {
        const r = await api.migrateMedia({ dryRun: false, limit: 25 });
        copied += r.copied;
        failed += r.failed;
        bytes += r.bytes;
        setProgress({ copied, failed, remaining: r.remaining });
        if (r.errors?.length) setLog(r.errors.join(" · "));
        if (!r.remaining) break;
      }
      setLog(
        `Copiati ${copied} file (${MB(bytes)})` +
          (failed ? ` · ${failed} non riusciti` : "") +
          ". Il volume non è stato toccato."
      );
      await load();
    } catch (e) {
      setLog(e?.response?.data?.error || "Copia interrotta.");
    } finally {
      setBusy(false);
      setProgress(null);
    }
  };

  return (
    <div className="ep-modal-overlay" onClick={onClose}>
      <div className="ep-modal ep-modal--share" onClick={(e) => e.stopPropagation()}>
        <div className="ep-modal-head">
          <h3>Archivio file</h3>
          <button className="ep-icon-btn" onClick={onClose} aria-label="Chiudi">
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>
        <div className="ep-modal-body">
          {error && (
            <div className="ep-share-warning">
              <FontAwesomeIcon icon={faTriangleExclamation} /> {error}
            </div>
          )}

          {!status && !error ? (
            <p className="ep-share-hint">Caricamento…</p>
          ) : status ? (
            <>
              <div className="ep-share-admin">
                <div className="ep-share-admin-head">
                  <FontAwesomeIcon icon={faHardDrive} /> Volume Railway
                </div>
                <ul className="ep-hist-list">
                  <li className="ep-hist-item">
                    <div className="ep-hist-line">
                      <strong>Allegati form</strong>
                      <span className="ep-hist-date">
                        {status.disk["uploads"]?.files || 0} file
                      </span>
                      <span className="ep-hist-by">
                        · {MB(status.disk["uploads"]?.bytes)}
                      </span>
                    </div>
                  </li>
                  <li className="ep-hist-item">
                    <div className="ep-hist-line">
                      <strong>Media piani editoriali</strong>
                      <span className="ep-hist-date">
                        {status.disk["uploads-ped"]?.files || 0} file
                      </span>
                      <span className="ep-hist-by">
                        · {MB(status.disk["uploads-ped"]?.bytes)}
                      </span>
                    </div>
                  </li>
                </ul>
                {/* Composizione dei media: foto e video si comprimono in modo
                    (e a costi) molto diversi. */}
                {status.byKind && (
                  <p className="ep-share-hint">
                    Di cui foto {status.byKind.image.files} ·{" "}
                    {MB(status.byKind.image.bytes)} — video{" "}
                    {status.byKind.video.files} · {MB(status.byKind.video.bytes)}
                    {status.byKind.other.files
                      ? ` — altro ${status.byKind.other.files} · ${MB(
                          status.byKind.other.bytes
                        )}`
                      : ""}
                  </p>
                )}
              </div>

              <div className="ep-share-admin">
                <div className="ep-share-admin-head">
                  <FontAwesomeIcon icon={faCloudArrowUp} /> Bucket
                </div>
                {!status.configured ? (
                  <div className="ep-share-warning">
                    <FontAwesomeIcon icon={faTriangleExclamation} /> Bucket non
                    configurato: mancano le variabili R2 su Railway.
                  </div>
                ) : status.bucket?.error ? (
                  <div className="ep-share-warning">
                    <FontAwesomeIcon icon={faTriangleExclamation} />{" "}
                    {status.bucket.error}
                  </div>
                ) : (
                  <p className="ep-share-desc">
                    {status.bucket?.files || 0} file · {MB(status.bucket?.bytes)}
                    {" · "}scrittura su{" "}
                    <strong>{status.mode === "r2" ? "bucket" : "volume"}</strong>
                  </p>
                )}
              </div>

              {status.configured && (
                <div className="ep-share-admin">
                  <div className="ep-share-admin-head">Copia sul bucket</div>
                  <p className="ep-share-desc">
                    Copia i file dal volume al bucket mantenendo lo stesso nome,
                    quindi nessun link cambia. Non cancella nulla dal volume e
                    si può ripetere: ciò che è già copiato viene saltato.
                  </p>

                  {progress && (
                    <p className="ep-share-hint">
                      Copiati {progress.copied} · restano {progress.remaining}
                      {progress.failed ? ` · ${progress.failed} falliti` : ""}
                    </p>
                  )}
                  {log && (
                    <div className="ep-share-ok">
                      <FontAwesomeIcon icon={faCheck} /> {log}
                    </div>
                  )}

                  <div className="ep-foot-right ep-share-actions">
                    <button
                      className="ep-btn ep-btn--ghost"
                      onClick={simulate}
                      disabled={busy}
                    >
                      {busy ? "Attendi…" : "Simula"}
                    </button>
                    <button
                      className="ep-btn ep-btn--primary"
                      onClick={copyAll}
                      disabled={busy}
                    >
                      <FontAwesomeIcon icon={faCloudArrowUp} />{" "}
                      {busy ? "Copia in corso…" : "Copia sul bucket"}
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default StorageModal;
