// Contacts.jsx
import "./Contacts.css";
import DynamicForm from "../dynamic-form/DynamicForm";
import PropTypes from "prop-types";

const Contacts = ({ scrollTween, isMobile }) => (
  <div className="contacts-container">
    <DynamicForm scrollTween={scrollTween} isMobile={isMobile} />
  </div>
);

Contacts.propTypes = {
  scrollTween: PropTypes.object,
  isMobile: PropTypes.bool.isRequired,
};

export default Contacts;
