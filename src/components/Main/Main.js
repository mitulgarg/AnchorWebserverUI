
import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom"; 
import "./Main.css";
import PipelineCard from "./PipelineCard/PipelineCard.js";
import { useSpring, animated } from "react-spring";
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import NavHead from "../Home/NavHead/NavHead.js";
import axios from "axios";


const Main = () => {

  const { state } = useLocation();  // Get the passed state from navigate
  const formData = state || {};  // Fallback to empty object if no data is passed

  const [flip, setFlip] = useState(false);
  const [allTasksValidated, setAllTasksValidated] = useState(false); // New state for task completion

  const props= useSpring({
      to: { opacity:1 },
      from: { opacity:0 },
      // reset: true,
      // reverse: flip,
      delay:550,
      onRest: ()=> setFlip(!flip),
  })

  const [taskStatus, setTaskStatus] = useState([
    { id: 1, isAnimating: true, validated: false },
    { id: 2, isAnimating: false, validated: false },
    { id: 3, isAnimating: false, validated: false },
    { id: 4, isAnimating: false, validated: false },
    { id: 5, isAnimating: false, validated: false },
  ]);

  const validateStep = async (id) => {
    const endpointMapping = {
      1: "http://127.0.0.1:8000/analyzer",
      2: "http://127.0.0.1:8000/creds", // Example endpoint for step 2
      3: "http://127.0.0.1:8000/filegen",
      4: "http://127.0.0.1:8000/infra",
      5: "http://127.0.0.1:8000/analyzer",
    };

    const endpoint = endpointMapping[id];
    if (!endpoint) {
      console.error(`No endpoint mapped for task ID ${id}`);
      return false;
    }
  
    try {
      const response = await axios.get(endpoint);
      console.log(`Validated step ${id}:`, response.data);
      return response.data.success; // Ensure success is a boolean in the API response
    } catch (error) {
      console.error(`Error validating step ${id}:`, error);
      return false; // Consider the step invalid if the API call fails
    }
  };
  
  useEffect(() => {
    const runWorkflow = async () => {
      for (let i = 0; i < taskStatus.length; i++) {
        const step = taskStatus[i];
  
        if (step.isAnimating) {
          const isValid = await validateStep(step.id);
  
          if (isValid) {
            setTaskStatus((prevStatus) =>
              prevStatus.map((task, index) => {
                if (index === i) {
                  return { ...task, isAnimating: false, validated: true };
                } else if (index === i + 1) {
                  return { ...task, isAnimating: true };
                }
                return task;
              })
            );
          } else {
            console.error(`Step ${step.id} validation failed.`);
            break; // Stop the workflow if a step fails
          }
        }
      }
    };
  
    runWorkflow();
  }, [taskStatus]);


        const cardData = [
      {
        id: 1,
        task: "Analyzing Tech Stack",
        desc: `Generating requirements.txt and finding out about application type.`,
      },
      {
        id: 2,
        task: `Retrieval of Credentials`,
        desc: `Retrieving AWS and ${formData.scmProvider} credentials.`,
      },
      {
        id: 3,
        task: `Gen AI Script Generation`,
        desc: `Generating Dockerfile, Jenkinsfile and Terraform files`,
      },
      {
        id: 4,
        task: `Setting up ${formData.cloudProvider} ${formData.serviceType}`,
        desc: `Setting up Infra on ${formData.cloudProvider}`,
      },
      {
        id: 5,
        task: `Jenkins CI + CD`,
        desc: `Creating your custom job on Jenkins`,
      },
    ];



    useEffect(() => {
      const allValidated = taskStatus.every((task) => task.validated);
      if (allValidated) {
        setAllTasksValidated(true);
      }
    }, [taskStatus]);

  
  return (
    <div><NavHead />
    <div className="home-container">
      
      <div className="container">
          <div className="row justify-content-center">
            <div className="col-14 text-center">

            <div className="back-button">
            <Link className=" text-white text-decoration-none" to={`/home`}>
              <button className="button-position">
              <FontAwesomeIcon icon={faArrowLeft} /> Home
              </button>
            </Link>
            </div>
    <h1>Setting up DevOps Pipeline... </h1>
    <animated.div style={props}>  
    <div className="card-container">
        {cardData.map((data, index) => (
          <PipelineCard
            key={data.id}
            id={data.id}
            task={data.task}
            desc={data.desc}
            isAnimating={taskStatus[index]?.isAnimating}
            validated = {taskStatus[index]?.validated}
          />
        ))}
      </div> 
      </animated.div> 
      <br></br> 
      <animated.div style={props}> 
       {allTasksValidated && (
                <div className="success-message">
                  <h2>CI/CD Pipeline automatically setup!</h2>
                </div>
              )}
</animated.div> 
    </div></div></div>
    </div></div>
  ); 
};

export default Main;
