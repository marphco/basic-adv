import DynamicForm from '../contact-form/DynamicForm'; // Assicurati che il percorso sia corretto
import './Contact.css';

const Contact = () => {
  const handleRestart = () => {
    // Logica per resettare il form, se necessario
  };

  return (
    <div className="contact-container">
      <DynamicForm onRestart={handleRestart} />
    </div>
  );
};

export default Contact;