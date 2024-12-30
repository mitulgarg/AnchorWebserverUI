import { useState } from 'react';
import Carousel from 'react-bootstrap/Carousel';
import './ImageSlider.css';

function ImageSlider() {
  const [index, setIndex] = useState(0);

  const handleSelect = (selectedIndex) => {
    setIndex(selectedIndex);
  };

  const imageSources = {
    "First slide": "/photos/Homepage1.png",
    "Second slide": "/photos/Homepage1.png",
    "Third slide": "/photos/Homepage1.png",
  };

  const slideTexts = ["First slide", "Second slide", "Third slide"];

  return (
    <div className="slider-item">
      <Carousel activeIndex={index} onSelect={handleSelect}>
        {slideTexts.map((text, idx) => (
          <Carousel.Item key={idx}>
            <img 
              src={imageSources[text]} 
              alt={text} 
              className="img" 
            />
            <Carousel.Caption>
              <p>{text === "First slide" ? "Explore the most Holy and Ancient Temples!" : text === "Second slide" ? "India has a vast majority of Temples!" : "Click on The temple You wish to know more about!"}</p>
            </Carousel.Caption>
          </Carousel.Item>
        ))}
      </Carousel>
    </div>
  );
}

export default ImageSlider;
