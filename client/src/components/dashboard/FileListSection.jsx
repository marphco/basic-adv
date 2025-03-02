import PropTypes from "prop-types";

const FileListSection = ({ fileList, deleteFile, API_URL }) => (
  <div className="file-list-section">
    <h3>Lista Allegati</h3>
    {fileList.length > 0 ? (
      <ul>
        {fileList.map((file, index) => (
          <li key={index}>
            {file.name} - {Math.round(file.size / 1024)} KB -{" "}
            {new Date(file.lastModified).toLocaleDateString()}
            <a
              href={`${API_URL}/api/download/${file.name}`}
              download
              style={{ marginLeft: "10px" }}
            >
              Scarica
            </a>
            <button
              onClick={() => deleteFile(file.name)}
              style={{ marginLeft: "10px" }}
            >
              Cancella
            </button>
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