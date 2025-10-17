import PropTypes from "prop-types";
import "./FontSelection.css";
import { FaExclamationCircle } from "react-icons/fa";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";

const FontSelection = ({
  currentQuestion,
  answers,
  handleAnswerChange,
  handleInputChange,
  errors = {},
  formData,
}) => {
  const { t } = useTranslation();

  if (!currentQuestion || !currentQuestion.options) {
    return <div>{t("fontSelection.invalidQuestion")}</div>;
  }

  const questionText = currentQuestion.question;
  const selectedOptions = answers[questionText]?.options || [];
  const inputAnswer = answers[questionText]?.input || "";
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [customText, setCustomText] = useState(formData.brandName || "");

  // Supporta etichette IT/EN senza rompere i dati esistenti
  const fontStyles = {
    "Serif": { fontFamily: "Times New Roman, serif" },
    "Sans-serif": { fontFamily: "Arial, sans-serif" },
    "Script": { fontFamily: "Brush Script MT, cursive" },
    "Monospaced": { fontFamily: "Courier New, monospace" },
    "Monospace": { fontFamily: "Courier New, monospace" }, // alias
    "Monospaziato": { fontFamily: "Courier New, monospace" }, // alias IT
    "Manoscritto": { fontFamily: "Comic Sans MS, cursive" },
    "Handwritten": { fontFamily: "Comic Sans MS, cursive" }, // traduzione
    "Decorativo": { fontFamily: "Impact, fantasy" },
    "Decorative": { fontFamily: "Impact, fantasy" } // traduzione
  };

  const toggleOption = (option) => {
    handleAnswerChange({
      target: {
        value: option,
        checked: !selectedOptions.includes(option),
      },
    });
  };

  const handleCustomTextChange = (e) => {
    const value = e.target.value.slice(0, 30);
    setCustomText(value);
  };

  const handleFontNameChange = (e) => {
    const value = e.target.value;
    handleInputChange({ target: { value } });
  };

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (formData.brandName && !customText) {
      setCustomText(formData.brandName);
    }
  }, [formData.brandName, customText]);

  return (
    <div className="font-selection fade-in">
      <div className="form-group">
        <input
          type="text"
          value={customText}
          onChange={handleCustomTextChange}
          placeholder={t("fontSelection.previewPlaceholder")}
          maxLength={30}
          className="form-input"
        />
      </div>

      <div className="font-grid">
        {currentQuestion.options.map((option, index) => (
          <button
            key={index}
            className={`font-button ${selectedOptions.includes(option) ? "selected" : ""}`}
            onClick={() => toggleOption(option)}
            type="button"
          >
            <span className="font-example" style={fontStyles[option] || {}}>
              {customText || t("fontSelection.sampleText")}
            </span>
            <span className="font-name">{option}</span>
          </button>
        ))}
      </div>

      <div className="form-group">
        <textarea
          name="fontName"
          placeholder={t("fontSelection.fontNamePlaceholder")}
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
