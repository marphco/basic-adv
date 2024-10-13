import PropTypes from "prop-types";
import "./QuestionForm.css";
import FontSelection from "../font-selection/FontSelection";

const QuestionForm = ({
  currentQuestion,
  questionNumber,
  answers,
  handleAnswerSubmit,
  handleInputChange,
  handleAnswerChange,
  loading,
}) => {
  // Mappatura delle immagini dei font
  const fontOptionImages = {
    "Serif": "/fonts/serif.png",
    "Sans-serif": "/fonts/sans-serif.png",
    "Script": "/fonts/script.png",
    "Monospaced": "/fonts/monospaced.png",
    "Manoscritto": "/fonts/manoscritto.png",
    "Decorativo": "/fonts/decorativo.png",
  };

  return (
    <div>
      <h3>{currentQuestion.question}</h3>
      <form onSubmit={handleAnswerSubmit}>
        {currentQuestion.type === "font_selection" ? (
          // Componente per la selezione dei font
          <FontSelection
            currentQuestion={currentQuestion}
            answers={answers}
            handleInputChange={handleInputChange}
            handleAnswerChange={handleAnswerChange}
            fontOptionImages={fontOptionImages}
          />
        ) : currentQuestion.requiresInput ? (
          // Campo di input per domande aperte
          <div className="form-group">
            <label>Risposta:</label>
            <textarea
              name="inputAnswer"
              placeholder="Inserisci la tua risposta qui..."
              value={answers[currentQuestion.question]?.input || ""}
              onChange={handleInputChange}
            ></textarea>
          </div>
        ) : (
          // Opzioni con checkbox e campo di input opzionale
          <>
            {currentQuestion.options &&
              currentQuestion.options.length > 0 &&
              currentQuestion.options.map((option, index) => (
                <div key={index}>
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
                  <label htmlFor={`option_${index}`}>{option}</label>
                </div>
              ))}

            {/* Campo di input opzionale */}
            <div className="form-group">
              <label>Vuoi aggiungere qualcosa?</label>
              <textarea
                name="inputAnswer"
                placeholder="Inserisci ulteriori dettagli qui..."
                value={answers[currentQuestion.question]?.input || ""}
                onChange={handleInputChange}
              ></textarea>
            </div>
          </>
        )}

        {loading ? (
          <p>Caricamento...</p>
        ) : (
          <button className="submit-btn" type="submit">
            Invia
          </button>
        )}
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
};

export default QuestionForm;
