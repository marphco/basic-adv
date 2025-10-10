import PropTypes from "prop-types";
import { formatDate } from "./DashboardUtils";

const shortId = (id) => (id ? `${id.slice(0,4)}…${id.slice(-4)}` : "");

const FileListSection = ({ fileList, deleteFile, API_URL, onOpenRequest }) => (
  <div className="file-list-section">
    <h2>Lista Allegati</h2>
    {fileList.length > 0 ? (
      <ul>
        {fileList.map((file, index) => {
          const req = file.request; // { sessionId, brandName, contactName, ... } oppure null
          return (
            <li key={index}>
              <div className="file-info">
                <div className="file-name">{file.name}</div>

                <div className="file-meta-row">
                  <div className="file-details">
                    {Math.round(file.size / 1024)} KB&nbsp;–&nbsp;
                    {formatDate(new Date(file.lastModified))}
                  </div>

                  {req?.sessionId ? (
                    <button
                      type="button"
                      className="req-badge"
                      onClick={() => onOpenRequest(req.sessionId)}
                      title={[
                        req.brandName,
                        req.contactName && `• ${req.contactName}`,
                      ].filter(Boolean).join(" ")}
                    >
                      Richiesta {shortId(req.sessionId)}
                    </button>
                  ) : (
                    <span className="req-badge req-badge--unknown" title="File non associato">
                      Richiesta sconosciuta
                    </span>
                  )}
                </div>
              </div>

              <div className="button-group">
                <a
                  href={`${API_URL}/api/download/${encodeURIComponent(file.name)}`}
                  download
                  className="download-btn"
                >
                  Scarica
                </a>
                <button onClick={() => deleteFile(file.name)} className="delete-btn">
                  Cancella
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    ) : (
      <p>Nessun file presente nella cartella uploads</p>
    )}
  </div>
);

FileListSection.propTypes = {
  fileList: PropTypes.arrayOf(PropTypes.object).isRequired,
  deleteFile: PropTypes.func.isRequired,
  API_URL: PropTypes.string.isRequired,
  onOpenRequest: PropTypes.func.isRequired,
};

export default FileListSection;
