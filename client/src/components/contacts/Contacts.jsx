import './Contacts.css';
import DynamicForm from '../dynamic-form/DynamicForm';
import PropTypes from "prop-types";

const Contacts = ({ handleRestart }) => {
  return (
    <div className="contacts-container">
      <DynamicForm onRestart={handleRestart} />
    </div>
  );
};

Contacts.propTypes = {
  handleRestart: PropTypes.func.isRequired,
};

export default Contacts;
