import React from 'react';
import ImageSlider from './ImageSlider/ImageSlider.js';  // Adjust the path if necessary
import './Home.css';  // Your home page styles (if you have them)
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowRight } from '@fortawesome/free-solid-svg-icons';
import NavHead from './NavHead/NavHead.js';


function Home() {
  return (
    <div className="home">
        <NavHead />
      <h1>Welcome to Auto Anchor</h1>
      <ImageSlider />
      <Link className=" text-white text-decoration-none" to={`/main`}>
              <button className="button-home">
                Setup Your CI/CD Pipeline Now <FontAwesomeIcon icon={faArrowRight} /> 
              </button>
        </Link>

    </div>
  );
}

export default Home;
