import { useState, useEffect, useRef } from "react";
import PropTypes from "prop-types";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTimes,
  faUpload,
  faTriangleExclamation,
  faBullhorn,
} from "@fortawesome/free-solid-svg-icons";
import { parseExcel } from "./excelImport";

const FORMAT_LABEL = { template: "Template a colonne", grid: "Griglia PED" };

// Import Excel con anteprima: nulla viene creato finché non confermi.
const ImportModal = ({ client, view, onClose, onConfirm }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");
  const [result, setResult] = useState(null);
  const [importing, setImporting] = useState(false);
  const [done, setDone] = useState(0);
  const fileRef = useRef(null);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setError("");
    setResult(null);
    setLoading(true);
    try {
      const res = await parseExcel(file, client, view);
      setResult(res);
    } catch {
      setError("Impossibile leggere il file. Assicurati che sia un .xlsx valido.");
    } finally {
      setLoading(false);
      e.target.value = "";
    }
  };

  const posts = result?.posts || [];
  const unmatched = posts.filter((p) => !p.matched).length;

  return (
    <div className="ep-modal-overlay" onClick={onClose}>
      <div className="ep-modal ep-modal--wide" onClick={(e) => e.stopPropagation()}>
        <div className="ep-modal-head">
          <h3>Importa da Excel</h3>
          <button className="ep-icon-btn" onClick={onClose} aria-label="Chiudi">
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>

        <div className="ep-modal-body">
          <p className="ep-share-desc">
            I post verranno importati per <strong>{client.name}</strong>. Riconosco
            sia un <em>template a colonne</em> (Data, Rubrica/Binario, Caption,
            Hashtag, Sponsor…) sia la <em>griglia PED</em>, e leggo automaticamente
            il foglio giusto del file (anche se non è il primo). Solo testo: le
            immagini non vengono importate.
          </p>

          <button
            className="ep-import-pick"
            onClick={() => fileRef.current?.click()}
          >
            <FontAwesomeIcon icon={faUpload} />
            {fileName || "Scegli un file Excel (.xlsx)"}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFile}
            hidden
          />

          {loading && <p className="ep-share-hint">Lettura del file in corso…</p>}
          {error && (
            <div className="ep-share-warning">
              <FontAwesomeIcon icon={faTriangleExclamation} /> {error}
            </div>
          )}

          {result && !loading && (
            <>
              <div className="ep-import-summary">
                <span className="ep-format-badge">
                  Formato: {FORMAT_LABEL[result.format]}
                </span>
                {result.sheet && <span>Foglio: «{result.sheet}»</span>}
                <span>{posts.length} post riconosciuti</span>
              </div>

              {posts.length === 0 && (
                <div className="ep-share-warning">
                  <FontAwesomeIcon icon={faTriangleExclamation} /> Nessun post
                  riconosciuto. Controlla che il file segua il template o la griglia
                  PED.
                </div>
              )}

              {unmatched > 0 && (
                <div className="ep-share-warning">
                  <FontAwesomeIcon icon={faTriangleExclamation} /> {unmatched} post non
                  abbinati a una pagina di {client.name}: verranno messi sulla prima
                  pagina. Controlla prima di importare.
                </div>
              )}

              {posts.length > 0 && (
                <div className="ep-import-scroll">
                  <table className="ep-import-table">
                    <thead>
                      <tr>
                        <th>Data</th>
                        <th>Pagina</th>
                        <th>Rubrica</th>
                        <th>Caption</th>
                        <th>Spons.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {posts.map((p, i) => (
                        <tr key={i} className={p.matched ? "" : "ep-row-unmatched"}>
                          <td className="ep-nowrap">
                            {String(p.day).padStart(2, "0")}/
                            {String(p.month).padStart(2, "0")}/{p.year}
                          </td>
                          <td className="ep-nowrap">{p.pageName || "—"}</td>
                          <td className="ep-nowrap">{p.category || "—"}</td>
                          <td>{p.caption || "—"}</td>
                          <td>
                            {p.sponsored && (
                              <FontAwesomeIcon
                                icon={faBullhorn}
                                style={{ color: "var(--foreground-color)" }}
                              />
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>

        <div className="ep-modal-foot">
          <div className="ep-foot-right">
            <button
              className="ep-btn ep-btn--ghost"
              onClick={onClose}
              disabled={importing}
            >
              Annulla
            </button>
            <button
              className="ep-btn ep-btn--primary"
              onClick={async () => {
                setImporting(true);
                setDone(0);
                try {
                  await onConfirm(posts, (i) => setDone(i));
                } finally {
                  setImporting(false);
                }
              }}
              disabled={posts.length === 0 || importing}
            >
              {importing
                ? `Importazione… ${done}/${posts.length}`
                : `Importa ${posts.length || ""} post`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

ImportModal.propTypes = {
  client: PropTypes.object.isRequired,
  view: PropTypes.object.isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
};

export default ImportModal;
