import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTimes,
  faTriangleExclamation,
  faImages,
  faPaperclip,
  faEnvelope,
} from "@fortawesome/free-solid-svg-icons";
import { api } from "./api";
import InventoryPanel from "./InventoryPanel";

const MB = (n) => {
  if (!n) return "0 MB";
  const mb = n / 1024 / 1024;
  return mb >= 1024 ? `${(mb / 1024).toFixed(2)} GB` : `${mb.toFixed(1)} MB`;
};

// Archivio file. Due domande diverse, due schede:
//   Spazio    → quanto occupiamo, di che tipo, e quanto manca al limite
//   Contenuti → cosa c'è dentro, di chi è, e come liberarlo
//
// Il volume Railway non esiste più e la copia dal volume al bucket è finita:
// erano attrezzi di un trasloco concluso, tenerli in giro sarebbe solo un
// modo per premere un pulsante che non fa più niente.
const StorageModal = ({ onClose }) => {
  const [status, setStatus] = useState(null);
  const [error, setError] = useState("");
  const [scheda, setScheda] = useState("spazio");

  useEffect(() => {
    api
      .storageStatus()
      .then(setStatus)
      .catch((e) =>
        setError(e?.response?.data?.error || "Stato non disponibile.")
      );
  }, []);

  const b = status?.bucket;
  const usato = b?.totale?.bytes || 0;
  const limite = status?.avviso?.limiteBytes || 0;
  const percento = limite ? Math.min(100, (usato / limite) * 100) : 0;
  const soglia = status?.avviso?.sogliaBytes || 0;
  const vicino = soglia && usato >= soglia;

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
          <div className="ep-tabs">
            <button
              className={`ep-tab ${scheda === "spazio" ? "is-active" : ""}`}
              onClick={() => setScheda("spazio")}
            >
              Spazio
            </button>
            <button
              className={`ep-tab ${scheda === "contenuti" ? "is-active" : ""}`}
              onClick={() => setScheda("contenuti")}
            >
              Contenuti
            </button>
          </div>

          {scheda === "contenuti" && <InventoryPanel />}

          {scheda === "spazio" && (
            <>
              {error && (
                <div className="ep-share-warning">
                  <FontAwesomeIcon icon={faTriangleExclamation} /> {error}
                </div>
              )}
              {!status && !error && <p className="ep-share-hint">Caricamento…</p>}

              {status && !status.configured && (
                <div className="ep-share-warning">
                  <FontAwesomeIcon icon={faTriangleExclamation} /> Bucket non
                  configurato: mancano le variabili R2 su Railway.
                </div>
              )}

              {status && status.configured && (
                <>
                  {/* Quanto spazio è occupato, in una barra: il numero da solo
                      non dice se siamo vicini al limite. */}
                  <div className="ep-spazio">
                    <div className="ep-spazio-testa">
                      <strong>
                        {MB(usato)} <span className="ep-inv-meta">di {MB(limite)}</span>
                      </strong>
                      <span className="ep-inv-meta">
                        {b.totale.files} file · {Math.round(percento)}%
                      </span>
                    </div>
                    <div className="ep-spazio-barra">
                      <span
                        className={`ep-spazio-riempimento ${vicino ? "is-alta" : ""}`}
                        style={{ width: `${Math.max(percento, 1)}%` }}
                      />
                    </div>
                  </div>

                  {/* Diviso per provenienza: i media dei piani si possono
                      alleggerire e cancellare, gli allegati delle richieste
                      sono file dei clienti e non si toccano. */}
                  <ul className="ep-spazio-tipi">
                    <li>
                      <FontAwesomeIcon icon={faImages} />
                      <div>
                        <strong>Media dei piani editoriali</strong>
                        <div className="ep-inv-meta">
                          {b.ped.files} file · {MB(b.ped.bytes)}
                        </div>
                      </div>
                    </li>
                    <li>
                      <FontAwesomeIcon icon={faPaperclip} />
                      <div>
                        <strong>Allegati delle richieste dal sito</strong>
                        <div className="ep-inv-meta">
                          {b.richieste.files} file · {MB(b.richieste.bytes)}
                        </div>
                      </div>
                    </li>
                  </ul>

                  {/* Se la compressione smette di funzionare è meglio vederlo
                      qui che scoprirlo dai file che pesano il doppio. */}
                  {status.compressione && !status.compressione.images && (
                    <div className="ep-share-warning">
                      <FontAwesomeIcon icon={faTriangleExclamation} /> Compressione
                      delle foto non disponibile su questo server: i file vengono
                      salvati come sono.
                      {status.compressione.error
                        ? ` (${status.compressione.error})`
                        : ""}
                    </div>
                  )}

                  <div className="ep-share-admin">
                    <div className="ep-share-admin-head">
                      <FontAwesomeIcon icon={faEnvelope} /> Avviso automatico
                    </div>
                    <p className="ep-share-desc">
                      Sopra {MB(soglia)} parte una email a{" "}
                      <strong>{status.avviso.destinatario}</strong> con quanto
                      spazio resta e cosa fare. Al massimo una a settimana, e
                      riparte da capo se lo spazio torna sotto la soglia.
                    </p>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default StorageModal;
