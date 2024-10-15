import DynamicForm from '../dynamic-form/DynamicForm'; // Assicurati che il percorso sia corretto
import './Contacts.css';

const Contacts = () => {
  const handleRestart = () => {
    // Logica per resettare il form, se necessario
  };

  return (
    <div className="contact-container">
      <DynamicForm onRestart={handleRestart} />
    </div>
  );
};

export default Contacts;