import { Row, Container, Button } from 'react-bootstrap';
import { useEffect, useState } from 'react';
import useLocalStorage from 'use-local-storage';
import './App.css';
import { Toggle } from './components/toggle/Toggle';
import { Cursor } from './components/cursor/Cursor';
import DynamicForm from './components/dynamic-form/DynamicForm'; // Assuming DynamicForm exists in your components folder

function App() {
  const preference = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const [isDark, setIsDark] = useLocalStorage('isDark', preference);
  const [showForm, setShowForm] = useState(false); // State to control form visibility

  const handleClick = () => {
    setShowForm(true); // Show the form when the button is clicked
  };

  const handleRestart = () => {
    setShowForm(false); // Hide the form and show the "Get in Touch!" button
  };

  useEffect(() => {
    // Aggiungi una classe al body
    document.body.classList.add('no-default-cursor');

    // Cleanup: rimuovi la classe quando il componente viene smontato
    return () => {
      document.body.classList.remove('no-default-cursor');
    };
  }, []);

  return (
    <>
      <Cursor isDark={isDark} />
      <div className="App" data-theme={isDark ? 'dark' : 'light'}>
        <Toggle isChecked={isDark} handleChange={() => setIsDark(!isDark)} />
        <h1 className="title">Hello world!</h1>
        {!showForm ? (
          <Button className="box no-shadow-btn" onClick={handleClick}>
            <h2>Get in touch!</h2>
          </Button>
        ) : (
          <DynamicForm onRestart={handleRestart} /> // Pass handleRestart to DynamicForm
        )}
      </div>
    </>
  );
}

export default App;
