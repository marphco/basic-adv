// src/components/about-us/MobileSlider.jsx
import Slider from "react-slick";
import "slick-carousel/slick/slick.css"; 
import "slick-carousel/slick/slick-theme.css";
import "./MobileSlider.css"; // Puoi aggiungere ulteriori stili personalizzati qui
import PropTypes from "prop-types";


const MobileSlider = ({ images }) => {
  const settings = {
    dots: false,           // Se vuoi mostrare i punti indicatori, impostalo a true
    infinite: true,
    speed: 500,
    slidesToShow: 1,       // Mostra una slide alla volta
    slidesToScroll: 1,
    arrows: false,
    swipeToSlide: true,
    variableWidth: true,   // Permette slide di larghezza variabile
    centerMode: true,      // Centra la slide attiva
  };

  return (
    <Slider {...settings}>
      {images.map((src, index) => (
        <div key={index} style={{ width: "80vw", margin: "0 5px" }}>
          <img
            src={src}
            alt={`Slide ${index + 1}`}
            style={{ width: "100%", height: "auto", objectFit: "cover" }}
          />
        </div>
      ))}
    </Slider>
  );
};

export default MobileSlider;

MobileSlider.propTypes = {
  images: PropTypes.images,
  map: PropTypes.map,
};