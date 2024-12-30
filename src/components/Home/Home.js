import React from 'react';
import ImageSlider from './ImageSlider/ImageSlider.js';  // Adjust the path if necessary
import './Home.css';  // Your home page styles (if you have them)
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowRight } from '@fortawesome/free-solid-svg-icons';
import NavHead from './NavHead/NavHead.js';


function Home() {
  return (
    <div>
        <NavHead />
        <div className="home">
        <div className="content-container">
        <h1>Welcome to Auto Anchor</h1>
        <p className="description">
          Auto Anchor leverages Generative AI to give our users the DevOps Automation they need based just a few customizable inputs! Our Product sets up the entire CI/CD pipeline! This Agentic AI solution generates essential DevOps config files 
          like Dockerfiles, Jenkinsfiles, requirements.txt and deploys your applications on AWS, utilizing Jenkins for Pipeline creation without any human intervention! 
          Whether you're setting up local builds or scaling applications with Kubernetes, our platform is built to streamline your workflows and save valuable time.</p>

      <Link className=" text-white text-decoration-none" to={`/forms`}>
              <button className="button-home">
                Setup Your CI/CD Pipeline Now <FontAwesomeIcon icon={faArrowRight} /> 
              </button>
        </Link>
        <ImageSlider />

        </div>
        </div>
    </div>
  );
}

export default Home;
