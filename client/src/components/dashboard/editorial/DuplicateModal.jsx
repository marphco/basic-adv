import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTimes, faClone } from "@fortawesome/free-solid-svg-icons";

const MONTHS_IT = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre",
];

// Sceglie un mese di origine da cui duplicare i post nel mese corrente.
const DuplicateModal = ({ defaultYear, defaultMonth, targetLabel, onClose, onConfirm }) => {
  const [year, setYear] = useState(defaultYear);
  const [month, setMonth] = useState(defaultMonth);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const years = [defaultYear - 1, defaultYear, defaultYear + 1];

  return (
    <div className="ep-modal-overlay" onClick={onClose}>
      <div className="ep-modal ep-modal--share" onClick={(e) => e.stopPropagation()}>
        <div className="ep-modal-head">
          <h3>Duplica da un altro mese</h3>
          <button className="ep-icon-btn" onClick={onClose} aria-label="Chiudi">
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>
        <div className="ep-modal-body">
          <p className="ep-share-desc">
            Copia i post del mese scelto in <strong>{targetLabel}</strong>. Le copie
            saranno segnate come <em>da rivedere</em> finché non le modifichi.
          </p>
          <div className="ep-field-row">
            <div className="ep-field">
              <label className="ep-field-label">Mese di origine</label>
              <select
                className="ep-select"
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
              >
                {MONTHS_IT.map((m, i) => (
                  <option key={i} value={i + 1}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div className="ep-field">
              <label className="ep-field-label">Anno</label>
              <select
                className="ep-select"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <div className="ep-modal-foot">
          <div className="ep-foot-right">
            <button className="ep-btn ep-btn--ghost" onClick={onClose}>
              Annulla
            </button>
            <button
              className="ep-btn ep-btn--primary"
              onClick={() => onConfirm(year, month)}
            >
              <FontAwesomeIcon icon={faClone} /> Duplica
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

DuplicateModal.propTypes = {
  defaultYear: PropTypes.number.isRequired,
  defaultMonth: PropTypes.number.isRequired,
  targetLabel: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
};

export default DuplicateModal;
