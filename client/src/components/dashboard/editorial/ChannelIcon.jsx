import PropTypes from "prop-types";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faInstagram,
  faFacebookF,
  faTiktok,
  faLinkedinIn,
} from "@fortawesome/free-brands-svg-icons";

// Loghi reali dei canali. I colori brand restano fissi tranne TikTok, che usa
// il colore del testo (currentColor) → bianco su tema dark, nero su light.
// Le forme distinte risolvono la confusione tra Facebook e LinkedIn (blu simili).
const MAP = {
  instagram: { icon: faInstagram, color: "#E1306C", label: "Instagram" },
  facebook: { icon: faFacebookF, color: "#1877F2", label: "Facebook" },
  tiktok: { icon: faTiktok, color: null, label: "TikTok" },
  linkedin: { icon: faLinkedinIn, color: "#0A66C2", label: "LinkedIn" },
};

export const CHANNELS = ["instagram", "facebook", "tiktok", "linkedin"];

const ChannelIcon = ({ channel, className = "" }) => {
  const m = MAP[channel];
  if (!m) return null;
  return (
    <FontAwesomeIcon
      icon={m.icon}
      className={`ep-ch-icon ${className}`}
      style={m.color ? { color: m.color } : undefined}
      title={m.label}
    />
  );
};

ChannelIcon.propTypes = {
  channel: PropTypes.string.isRequired,
  className: PropTypes.string,
};

export default ChannelIcon;
