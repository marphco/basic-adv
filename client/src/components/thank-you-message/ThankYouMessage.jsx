// ThankYouMessage.jsx
import PropTypes from "prop-types";
import "./ThankYouMessage.css";
import { useTranslation } from "react-i18next";

const ThankYouMessage = ({ handleRestart }) => {
  const { t } = useTranslation("common");

  return (
    <div className="thank-you-message fade-in">
      <h3>
        <span>{t("thankyou.line1")}</span>
        <br />
        {t("thankyou.line2")}
      </h3>
      <button className="restart-btn" onClick={handleRestart}>
        {t("thankyou.restart")}
      </button>
    </div>
  );
};

ThankYouMessage.propTypes = {
  handleRestart: PropTypes.func.isRequired,
};

export default ThankYouMessage;
