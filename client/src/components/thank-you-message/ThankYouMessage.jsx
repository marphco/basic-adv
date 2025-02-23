import PropTypes from "prop-types";
import "./ThankYouMessage.css";

const ThankYouMessage = ({ handleRestart }) => (
  <div className="thank-you-message fade-in"> {/* Aggiunto fade-in */}
    <h3>
      <span>Grazie per la fiducia riposta in noi.</span>
      <br />
      Ti contatteremo a breve, promesso!
    </h3>
    <button className="restart-btn" onClick={handleRestart}>
      Torna all&apos;inizio
    </button>
  </div>
);

ThankYouMessage.propTypes = {
  handleRestart: PropTypes.func.isRequired,
};

export default ThankYouMessage;