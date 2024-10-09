import PropTypes from "prop-types";
import "./FontSelection.css";

const FontSelection = ({
  currentQuestion,
  answers,
  handleInputChange,
  handleAnswerChange,
  fontOptionImages,
}) => (
  <>
    {/* Visualizza le opzioni dei font con immagini */}
    <div className="font-options">
      {currentQuestion.options.map((option, index) => (
        <div key={index} className="font-option">
          <input
            type="radio"
            id={`font_option_${index}`}
            name="fontSelection"
            value={option}
            checked={answers[currentQuestion.question]?.options === option}
            onChange={(e) => handleAnswerChange(e, true)} // Passiamo un flag per indicare che è una selezione singola
          />
          <label htmlFor={`font_option_${index}`}>
            <img
              src={fontOptionImages[option]}
              alt={option}
              className="font-image"
            />
            <span>{option}</span>
          </label>
        </div>
      ))}
    </div>

    {/* Campo di input per font personalizzato */}
    <div className="form-group">
      <label>Preferisci un font specifico? Indicalo qui:</label>
      <input
        type="text"
        name="customFont"
        value={answers[currentQuestion.question]?.input || ""}
        onChange={handleInputChange}
        placeholder="Nome del font preferito"
      />
    </div>
  </>
);

FontSelection.propTypes = {
  currentQuestion: PropTypes.shape({
    question: PropTypes.string.isRequired,
    options: PropTypes.arrayOf(PropTypes.string).isRequired,
  }).isRequired,
  answers: PropTypes.object.isRequired,
  handleInputChange: PropTypes.func.isRequired,
  handleAnswerChange: PropTypes.func.isRequired,
  fontOptionImages: PropTypes.object.isRequired,
};

export default FontSelection;
