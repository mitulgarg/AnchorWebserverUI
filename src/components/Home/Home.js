import React, { useState, useEffect, useRef } from "react";
import ImageSlider from './ImageSlider/ImageSlider.js';  // Adjust the path if necessary
import './Home.css';  // Your home page styles (if you have them)
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import NavHead from './NavHead/NavHead.js';
import { motion } from "framer-motion";
import {
  faArrowRight,
  faCog
} from "@fortawesome/free-solid-svg-icons";

function Home() {

  return (

    <div>
    <NavHead />

    {/* Settings Button */}
    <Link to="/settings" className="settings-toggle-btn" title="Settings">
       <FontAwesomeIcon icon={faCog} />
    </Link>


{/* 
    <div>
        <NavHead /> */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.75 }}
          style={{ marginTop: '65px' }}
          
        >
        <div className="home">
        <div className="content-container">
        {/* <h1 className='h1-style'>Welcome to Auto Anchor */}
        <motion.div initial={{ opacity: 0, y: 0 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} style={{ marginTop: '65px' }}>
        <h1 className='h1-style'>
        Welcome to Auto Anchor
              </h1>
              </motion.div>

        <img 
                                src="TransparentWhiteLogo1.png" 
                                alt="icon"
                                className='img-class-home' 
  
                            />

    <motion.div initial={{ opacity: 0, y: 0 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1 }} style={{ marginTop: '65px' }}>
        <h2 className='h2-style'>Gen AI powered DevOps automation, End-to-End.</h2></motion.div>

        <motion.div initial={{ opacity: 0, y: 0 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 4 }} style={{ marginTop: '65px' }}>
        <p className="description">
        We use Generative AI to automate DevOps infrastructure setups, Pipeline Creations, Modification of resources and Observability of your resources.
        What typically takes a DevOps engineer 1-2 days, we do in just 5 minutes with a single click, all based on simple natural language inputs.</p>

          <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <Link className=" text-white text-decoration-none" to={`/acube`}>
              <button className="button-home">
                Meet aCube <FontAwesomeIcon icon={faArrowRight} /> 
              </button>
        </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0.8, y: 70 }}
          animate={{ opacity: 1, y: 20 }}
          transition={{ duration: 2.5 }}
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
