import PropTypes from "prop-types";
import "./QuestionForm.css";
import FontSelection from "../font-selection/FontSelection";
import { FaExclamationCircle } from "react-icons/fa"; // Importa l’icona

const QuestionForm = ({
  currentQuestion,
  questionNumber,
  answers,
  handleAnswerSubmit,
  handleInputChange,
  handleAnswerChange,
  loading,
  errors = {}, // Aggiunto come prop con default vuoto
}) => {
  const fontOptionImages = {
    "Serif": "/fonts/serif.png",
    "Sans-serif": "/fonts/sans-serif.png",
    "Script": "/fonts/script.png",
    "Monospaced": "/fonts/monospaced.png",
    "Manoscritto": "/fonts/manoscritto.png",
    "Decorativo": "/fonts/decorativo.png",
  };

  return (
    <div className="question-form">
      <h3 className="question-title">{currentQuestion.question}</h3>
      <form onSubmit={handleAnswerSubmit} className="question-form-content">
        {currentQuestion.type === "font_selection" ? (
          <FontSelection
            currentQuestion={currentQuestion}
            answers={answers}
            handleInputChange={handleInputChange}
            handleAnswerChange={handleAnswerChange}
            fontOptionImages={fontOptionImages}
          />
        ) : currentQuestion.requiresInput ? (
          <div className="form-group">
            <textarea
              name="inputAnswer"
              placeholder="Inserisci la tua risposta qui..."
              value={answers[currentQuestion.question]?.input || ""}
              onChange={handleInputChange}
              className="form-textarea"
            />
            {errors[currentQuestion.question] && (
              <span className="error-message">
                <FaExclamationCircle className="error-icon" />
                {errors[currentQuestion.question]}
              </span>
            )}
          </div>
        ) : (
          <>
            {currentQuestion.options &&
              currentQuestion.options.length > 0 && (
                <div className="options-group">
                  {currentQuestion.options.map((option, index) => (
                    <label key={index} className="service-item">
                      <input
                        type="checkbox"
                        id={`option_${index}`}
                        name={`answer_${questionNumber}`}
                        value={option}
                        checked={
                          answers[currentQuestion.question]?.options
                            ? answers[currentQuestion.question].options.includes(option)
                            : false
                        }
                        onChange={handleAnswerChange}
                      />
                      <span>{option}</span>
                    </label>
                  ))}
                  {errors[currentQuestion.question] && (
                    <span className="error-message">
                      <FaExclamationCircle className="error-icon" />
                      {errors[currentQuestion.question]}
                    </span>
                  )}
                </div>
              )}
            <div className="form-group">
              <textarea
                name="inputAnswer"
                placeholder="Inserisci ulteriori dettagli qui..."
                value={answers[currentQuestion.question]?.input || ""}
                onChange={handleInputChange}
                className="form-textarea"
              />
            </div>
          </>
        )}
        <div className="form-actions">
          {loading ? (
            <p className="loading-text">Caricamento...</p>
          ) : (
            <button className="submit-btn" type="submit">
              Invia
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

QuestionForm.propTypes = {
  currentQuestion: PropTypes.shape({
    question: PropTypes.string.isRequired,
    options: PropTypes.arrayOf(PropTypes.string),
    requiresInput: PropTypes.bool.isRequired,
    type: PropTypes.string,
  }).isRequired,
  questionNumber: PropTypes.number.isRequired,
  answers: PropTypes.object.isRequired,
  handleAnswerSubmit: PropTypes.func.isRequired,
  handleInputChange: PropTypes.func.isRequired,
  handleAnswerChange: PropTypes.func.isRequired,
  loading: PropTypes.bool.isRequired,
  errors: PropTypes.object, // PropTypes per errors
};

export default QuestionForm;