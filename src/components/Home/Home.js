import React from 'react';
import ImageSlider from './ImageSlider/ImageSlider.js';  // Adjust the path if necessary
import './Home.css';  // Your home page styles (if you have them)

function Home() {
  return (
    <div className="home">
      <h1>Welcome to Auto Anchor</h1>
      <ImageSlider />
    </div>
  );
}

export default Home;
