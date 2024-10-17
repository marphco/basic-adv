import PropTypes from 'prop-types';
import './FontSelection.css';

const FontSelection = ({
  currentQuestion,
  answers,
  handleAnswerChange,
  fontOptionImages,
}) => {

  return (
    <div className="font-selection">
      {currentQuestion.options.map((font, index) => (
        <label key={index} className="font-option">
          <input
            type="checkbox" // Cambiato da "radio" a "checkbox"
            name={`fontSelection_${index}`} // Nome unico per ogni checkbox
            value={font}
            checked={
              answers[currentQuestion.question]?.options
                ? answers[currentQuestion.question].options.includes(font)
                : false
            }
            onChange={handleAnswerChange}
          />
          <span className="font-display">
            <img src={fontOptionImages[font]} alt={font} />
            {font}
          </span>
        </label>
      ))}
    </div>
  );
};

FontSelection.propTypes = {
  currentQuestion: PropTypes.shape({
    question: PropTypes.string.isRequired,
    options: PropTypes.arrayOf(PropTypes.string).isRequired,
    requiresInput: PropTypes.bool.isRequired,
    type: PropTypes.string.isRequired,
  }).isRequired,
  answers: PropTypes.object.isRequired,
  handleAnswerChange: PropTypes.func.isRequired,
  fontOptionImages: PropTypes.object.isRequired,
};

export default FontSelection;
