import PropTypes from "prop-types";
import "./ThankYouMessage.css";

const ThankYouMessage = ({ handleRestart }) => (
  <div className="thank-you-message">
    <h3>Grazie! Ti contatteremo a breve.</h3>
    <button className="restart-btn" onClick={handleRestart}>
      Torna all&apos;inizio
    </button>
  </div>
);

ThankYouMessage.propTypes = {
  handleRestart: PropTypes.func.isRequired,
};

export default ThankYouMessage;
