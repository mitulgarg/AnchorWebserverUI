import React from 'react';
import ImageSlider from './ImageSlider/ImageSlider.js';  // Adjust the path if necessary
import './Home.css';  // Your home page styles (if you have them)
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowRight } from '@fortawesome/free-solid-svg-icons';
import NavHead from './NavHead/NavHead.js';
import { motion } from "framer-motion";

function Home() {
  return (
    <div>
        <NavHead />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.75 }}
          style={{ marginTop: '65px' }}
          
        >
        <div className="home">
        <div className="content-container">
        <h1 className='h1-style'>Welcome to Auto Anchor</h1>

        <img 
                                src="TransparentWhiteLogo1.png" 
                                alt="icon"
                                className='img-class-home' 
  
                            />


        <h2 className='h2-style'>Your one stop solution for automating your entire End-End DevOps Process</h2>
        <p className="description">
        We use Generative AI to automate DevOps infrastructure setups, Pipeline Creations, Modification of resources and Observability of your resources.
        What typically takes a DevOps engineer 1-2 days, we do in just 5 minutes with a single click, all based on simple natural language inputs.</p>
          <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
      <Link className=" text-white text-decoration-none" to={`/acube`}>
              <button className="button-home">
                Meet aCube <FontAwesomeIcon icon={faArrowRight} /> 
              </button>
        </Link>
        <motion.div
          initial={{ opacity: 0.8, y: 50 }}
          animate={{ opacity: 1, y: 20 }}
          transition={{ duration: 2 }}
        >
        <ImageSlider />
        </motion.div>
        </motion.div>
        </div>
        </div>
        </motion.div>
    </div>
  );
}

export default Home;
