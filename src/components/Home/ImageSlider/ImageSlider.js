import { useState } from 'react';
import Carousel from 'react-bootstrap/Carousel';
import './ImageSlider.css';

function ImageSlider() {
  const [index, setIndex] = useState(0);

  const handleSelect = (selectedIndex) => {
    setIndex(selectedIndex);
  };

  const imageSources = {
    "First slide": "/photos/agentic.webp",
    "Second slide": "/photos/devops-security.webp",
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
              <p>{text === "First slide" ? "Agentic AI Is the Key To the Future!" : text === "Second slide" ? "The End-End Process Automation!" : "Some of the Important Tools in DevOps!"}</p>
            </Carousel.Caption>
          </Carousel.Item>
        ))}
      </Carousel>
    </div>
  );
}

export default ImageSlider;
