import { Link } from "react-router-dom";
import PropTypes from "prop-types";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHome,
  faList,
  faCheck,
  faTimes,
  faFolder,
  faSignOutAlt,
} from "@fortawesome/free-solid-svg-icons";
import LogoIcon from "../../assets/icon-white.svg";

const Sidebar = ({
  isSidebarOpen,
  toggleSidebar,
  selectedSection,
  handleSectionChange,
  handleLogout,
  activeKey,
}) => {
  return (
    <div className={`sidebar ${isSidebarOpen ? "open" : ""}`}>
      <ul>
        <li className="sidebar-logo">
          <Link to="/">
            <img src={LogoIcon} alt="Home Logo" className="logo-icon" />
          </Link>
        </li>
        <li
          key={`dashboard-home-${activeKey}`}
          className={selectedSection === "home" ? "active" : ""}
          onClick={(event) => {
            event.stopPropagation();
            handleSectionChange("home");
          }}
        >
          <span className="active-before"></span>
          <span className="active-after"></span>
          <div className="icon">
            <FontAwesomeIcon icon={faHome} />
          </div>
          <div className="text">Home</div>
        </li>
        <li
          key={`all-${activeKey}`}
          className={selectedSection === "all" ? "active" : ""}
          onClick={(event) => {
            event.stopPropagation();
            handleSectionChange("all");
          }}
        >
          <span className="active-before"></span>
          <span className="active-after"></span>
          <div className="icon">
            <FontAwesomeIcon icon={faList} />
          </div>
          <div className="text">Tutte le Richieste</div>
        </li>
        <li
          key={`completed-${activeKey}`}
          className={selectedSection === "completed" ? "active" : ""}
          onClick={(event) => {
            event.stopPropagation();
            handleSectionChange("completed");
          }}
        >
          <span className="active-before"></span>
          <span className="active-after"></span>
          <div className="icon">
            <FontAwesomeIcon icon={faCheck} />
          </div>
          <div className="text">Completate</div>
        </li>
        <li
          key={`abandoned-${activeKey}`}
          className={selectedSection === "abandoned" ? "active" : ""}
          onClick={(event) => {
            event.stopPropagation();
            handleSectionChange("abandoned");
          }}
        >
          <span className="active-before"></span>
          <span className="active-after"></span>
          <div className="icon">
            <FontAwesomeIcon icon={faTimes} />
          </div>
          <div className="text">Abbandonate</div>
        </li>
        <li
          key={`fileList-${activeKey}`}
          className={selectedSection === "fileList" ? "active" : ""}
          onClick={(event) => {
            event.stopPropagation();
            handleSectionChange("fileList");
          }}
        >
          <span className="active-before"></span>
          <span className="active-after"></span>
          <div className="icon">
            <FontAwesomeIcon icon={faFolder} />
          </div>
          <div className="text">Lista Allegati</div>
        </li>
        <li key={`logout-${activeKey}`} onClick={handleLogout}>
          <div className="icon">
            <FontAwesomeIcon icon={faSignOutAlt} />
          </div>
          <div className="text">Logout</div>
        </li>
      </ul>
    </div>
  );
};

Sidebar.propTypes = {
  isSidebarOpen: PropTypes.bool.isRequired,
  toggleSidebar: PropTypes.func.isRequired,
  selectedSection: PropTypes.string.isRequired,
  handleSectionChange: PropTypes.func.isRequired,
  handleLogout: PropTypes.func.isRequired,
  activeKey: PropTypes.number.isRequired,
};

export default Sidebar;