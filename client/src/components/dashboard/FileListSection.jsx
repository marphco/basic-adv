import PropTypes from "prop-types";
import { formatDate } from "./DashboardUtils";

// helper dimensione leggibile
const formatSize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// iconcine inline (stile coerente col tema: stroke currentColor)
const IconCalendar = () => (
  <svg className="meta-icon" viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8"  y1="2" x2="8"  y2="6" />
    <line x1="3"  y1="10" x2="21" y2="10" />
  </svg>
);

const IconFile = () => (
  <svg className="meta-icon" viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
  </svg>
);

const FileListSection = ({ fileList, deleteFile, API_URL, onOpenRequest }) => (
  <div className="file-list-section">
    <h2>Lista Allegati</h2>
    {fileList.length > 0 ? (
      <ul>
        {fileList.map((file, index) => {
          const req = file.request;
          return (
            <li key={index}>
              <div className="file-info">
                <div className="file-name">{file.name}</div>

                <div className="file-meta-row">
                  {req?.sessionId && (
                    <button
                      type="button"
                      className="link-btn link-btn--sm"
                      onClick={() => onOpenRequest(req.sessionId)}
                    >
                      Apri richiesta
                    </button>
                  )}

                  {/* 👇 meta con iconcine, senza trattino */}
                  <div className="file-details">
                    <span className="meta-item">
                      <IconCalendar />
                      {formatDate(new Date(file.lastModified))}
                    </span>
                    <span className="meta-item">
                      <IconFile />
                      {formatSize(file.size)}
                    </span>
                  </div>
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
