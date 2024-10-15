import './Home.css';
import logo from '../../assets/logo.svg';

const Home = () => {
  return (
    <div className="home-container">
      <img src={logo} alt="Logo Basic Adv" className="home-logo" />
      <h1 className="home-intro">Potenzia la tua presenza online con Basic Adv</h1>
    </div>
  );
};

export default Home;
