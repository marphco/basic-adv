import PropTypes from "prop-types";
import "./FontSelection.css";
import { FaExclamationCircle } from "react-icons/fa";
import { useState, useEffect } from "react";

const FontSelection = ({
  currentQuestion,
  answers,
  handleAnswerChange,
  handleInputChange,
  errors = {},
  formData,
}) => {
  console.log("FontSelection iniziato con:", currentQuestion);

  if (!currentQuestion || !currentQuestion.options) {
    console.error("Dati invalidi per FontSelection:", currentQuestion);
    return <div>Errore: domanda sui font non valida</div>;
  }

  const questionText = currentQuestion.question;
  const selectedOptions = answers[questionText]?.options || [];
  const inputAnswer = answers[questionText]?.input || "";
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [customText, setCustomText] = useState(formData.brandName || "");

  const fontStyles = {
    "Serif": { fontFamily: "Times New Roman, serif" },
    "Sans-serif": { fontFamily: "Arial, sans-serif" },
    "Script": { fontFamily: "Brush Script MT, cursive" },
    "Monospaced": { fontFamily: "Courier New, monospace" },
    "Manoscritto": { fontFamily: "Comic Sans MS, cursive" },
    "Decorativo": { fontFamily: "Impact, fantasy" },
  };

  const toggleOption = (option) => {
    console.log("toggleOption chiamato per:", option);
    handleAnswerChange({
      target: {
        value: option,
        checked: !selectedOptions.includes(option),
      },
    });
  };

  const handleCustomTextChange = (e) => {
    console.log("handleCustomTextChange chiamato");
    const value = e.target.value.slice(0, 30);
    setCustomText(value);
  };

  const handleFontNameChange = (e) => {
    console.log("handleFontNameChange chiamato");
    const value = e.target.value;
    handleInputChange({ target: { value } });
  };

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (formData.brandName && !customText) {
      console.log("useEffect: impostazione customText con brandName");
      setCustomText(formData.brandName);
    }
  }, [formData.brandName, customText]);

  console.log("FontSelection rendering con opzioni:", currentQuestion.options);

  return (
    <div className="font-selection">
      <div className="form-group">
        <input
          type="text"
          value={customText}
          onChange={handleCustomTextChange}
          placeholder="Scrivi qui per vedere l'anteprima"
          maxLength={30}
          className="form-input"
        />
      </div>
      <div className="font-grid">
        {currentQuestion.options.map((option, index) => {
          console.log(`Rendering opzione ${index}: ${option}`);
          return (
            <button
              key={index}
              className={`font-button ${
                selectedOptions.includes(option) ? "selected" : ""
              }`}
              onClick={() => toggleOption(option)}
              type="button"
            >
              <span className="font-example" style={fontStyles[option] || {}}>
                {customText || "Testo di prova"}
              </span>
              <span className="font-name">{option}</span>
            </button>
          );
        })}
      </div>
      <div className="form-group">
        <textarea
          name="fontName"
          placeholder="Oppure scrivi il nome del font se sai già quale vorresti"
          value={inputAnswer}
          onChange={handleFontNameChange}
          className="form-textarea"
        />
      </div>
      {errors[questionText] && (
        <span className="error-message">
          <FaExclamationCircle className="error-icon" />
          {errors[questionText]}
        </span>
      )}
    </div>
  );
};

FontSelection.propTypes = {
  currentQuestion: PropTypes.shape({
    question: PropTypes.string.isRequired,
    options: PropTypes.arrayOf(PropTypes.string).isRequired,
  }).isRequired,
  answers: PropTypes.object.isRequired,
  handleAnswerChange: PropTypes.func.isRequired,
  handleInputChange: PropTypes.func.isRequired,
  errors: PropTypes.object,
  formData: PropTypes.object.isRequired,
};

export default FontSelection;