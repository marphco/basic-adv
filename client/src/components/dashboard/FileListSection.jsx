import PropTypes from "prop-types";

const FileListSection = ({ fileList, deleteFile, API_URL }) => (
  <div className="file-list-section">
    <h2>Lista Allegati</h2>
    {fileList.length > 0 ? (
      <ul>
        {fileList.map((file, index) => (
          <li key={index}>
            <div className="file-info">
              <div className="file-name">{file.name}</div>
              <div className="file-details">
                {Math.round(file.size / 1024)} KB -{" "}
                {new Date(file.lastModified).toLocaleDateString()}
              </div>
            </div>
            <div className="button-group">
              <a
                href={`${API_URL}/api/download/${file.name}`}
                download
                className="download-btn"
              >
                Scarica
              </a>
              <button
                onClick={() => deleteFile(file.name)}
                className="delete-btn"
              >
                Cancella
              </button>
            </div>
          </li>
        ))}
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
};

export default FileListSection;