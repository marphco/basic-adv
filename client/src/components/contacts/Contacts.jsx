import './Contacts.css';
import DynamicForm from '../dynamic-form/DynamicForm';
import PropTypes from "prop-types";

const Contacts = ({ scrollTween }) => (
  <div className="contacts-container">
    <DynamicForm scrollTween={scrollTween} />
  </div>
);

Contacts.propTypes = {
  scrollTween: PropTypes.object,
};

export default Contacts; // 👈 mancava questa riga
