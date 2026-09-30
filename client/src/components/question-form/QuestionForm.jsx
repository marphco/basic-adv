import PropTypes from "prop-types";
import "./QuestionForm.css";
import FontSelection from "../font-selection/FontSelection";
import { FaExclamationCircle, FaSpinner } from "react-icons/fa";
import { useTranslation } from "react-i18next";

const QuestionForm = ({
  currentQuestion,
  questionNumber,
  answers,
  handleAnswerSubmit,
  handleInputChange,
  handleAnswerChange,
  handleOtherToggle,
  loading,
  errors = {},
  formData,
}) => {
  const { t } = useTranslation();

  return (
    <div className="question-form">
      <h3 className="question-title">{currentQuestion.question}</h3>

      <form onSubmit={handleAnswerSubmit} className="question-form-content">
        {currentQuestion.type === "font_selection" ? (
          <FontSelection
            currentQuestion={currentQuestion}
            answers={answers}
            handleAnswerChange={handleAnswerChange}
            handleInputChange={handleInputChange}
            errors={errors}
            formData={formData}
          />
        ) : currentQuestion.requiresInput ? (
          <div className="form-group">
            <textarea
              name="inputAnswer"
              placeholder={t("questionForm.answerPlaceholder")}
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
            {currentQuestion.options && currentQuestion.options.length > 0 && (
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
                {/* "Altro": la voce fissa del sito, non dell'AI. Quattro
                    risposte non coprono mai tutto: chi non trova la sua la
                    scrive qui (voluto da Marco, settembre 2026). */}
                <label className="service-item">
                  <input
                    type="checkbox"
                    id="option_altro"
                    name={`answer_${questionNumber}_altro`}
                    checked={!!answers[currentQuestion.question]?.altro}
                    onChange={handleOtherToggle}
                  />
                  <span>{t("questionForm.other")}</span>
                </label>
                {errors[currentQuestion.question] && (
                  <span className="error-message">
                    <FaExclamationCircle className="error-icon" />
                    {errors[currentQuestion.question]}
                  </span>
                )}
              </div>
            )}

            {answers[currentQuestion.question]?.altro && (
              <div className="form-group">
                <textarea
                  name="inputAnswer"
                  placeholder={t("questionForm.otherPlaceholder")}
                  value={answers[currentQuestion.question]?.input || ""}
                  onChange={handleInputChange}
                  className="form-textarea"
                  autoFocus
                />
              </div>
            )}
          </>
        )}

        <div className="form-actions">
          {loading ? (
            <button className="question-btn" disabled aria-label={t("common.loading")}>
              <FaSpinner className="spinner" />
            </button>
          ) : (
            <button className="question-btn" type="submit">
              {t("common.submit")}
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
  handleOtherToggle: PropTypes.func.isRequired,
  loading: PropTypes.bool.isRequired,
  errors: PropTypes.object,
  formData: PropTypes.object.isRequired,
};

export default QuestionForm;
