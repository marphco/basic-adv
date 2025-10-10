import PropTypes from "prop-types";
import { formatDate } from "./DashboardUtils";

const FileListSection = ({ fileList, deleteFile, API_URL, onOpenRequest }) => (
  <div className="file-list-section">
    <h2>Lista Allegati</h2>
    {fileList.length > 0 ? (
      <ul>
        {fileList.map((file, index) => {
          const req = file.request; // { sessionId, ... } oppure null
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
                      title="Apri la richiesta collegata"
                    >
                      Apri richiesta
                    </button>
                  )}

                  <div className="file-details">
                    {formatDate(new Date(file.lastModified))}&nbsp;–&nbsp;
                    {Math.round(file.size / 1024)} KB
                    
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
