
import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom"; 
import "./Main.css";
import PipelineCard from "./PipelineCard/PipelineCard.js";
import { useSpring, animated } from "react-spring";
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import NavHead from "../Home/NavHead/NavHead.js";

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
    { id: 1, isAnimating: true, validated: true},
    { id: 2, isAnimating: false, validated: false },
    { id: 3, isAnimating: false, validated: false },
    { id: 4, isAnimating: false, validated: false },
    { id: 5, isAnimating: false, validated: false },
    { id: 6, isAnimating: false, validated: false },
    { id: 7, isAnimating: false, validated: false },
  ]);

  // Simulate validation for each step
  const validateStep = (id) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log(`Validated step ${id}`);
        resolve(true); // Simulate success (use actual validation logic here)
      }, 2000); // Simulated delay
    });
  };

  useEffect(() => {
    const runWorkflow = async () => {
      for (let i = 0; i < taskStatus.length; i++) {
        const step = taskStatus[i];
        if (step.isAnimating) {
          const isValid = await validateStep(step.id);
          if (isValid) {
            setTaskStatus((prevStatus) => {
              const updatedStatus = [...prevStatus];
              updatedStatus[i].isAnimating = false;
              updatedStatus[i].validated = true; // Ensure it's marked as validated
              if (i + 1 < updatedStatus.length) {
                updatedStatus[i + 1].isAnimating = true;
              }
              return updatedStatus;
            });
          }
        }
      }
    };
    runWorkflow();
  }, [taskStatus]);

  // const cardData = [
  //   { id: 1, task: "Local File Generation", desc: "Dockerfile, Jenkinsfile, requirements.txt" },
  //   { id: 2, task: "Github Push", desc: "Github Link retrieved" },
  //   { id: 3, task: "AWS EC2 setup", desc: "Terraform Files Generation" },
  //   { id: 4, task: "Jenkins Server AutoSetup on EC2", desc: "Login, Pipeline creation" },
  //   { id: 5, task: "Github Build Test", desc: "Pipeline from SCM test" },
  //   { id: 6, task: "ECR Registry Push", desc: "Push EC2 Image to Amazon ECR" },
  //   { id: 7, task: "EKS Setup", desc: "Pushing Image to EKS from ECR" },
  // ];
    // Check if all tasks are validated


    const cardData = [
      {
        id: 1,
        task: "Local File Generation",
        desc: `Generating configuration files for ${formData.cloudProvider}`,
      },
      {
        id: 2,
        task: `${formData.scmProvider || "Push"}`,
        desc: `Pushing changes to selected SCM provider:  ${formData.scmProvider}`,
      },
      {
        id: 3,
        task: `${formData.cloudProvider} EC2 setup`,
        desc: `Generate Terraform files for EC2 setup on ${formData.cloudProvider}`,
      },
      {
        id: 4,
        task: "Jenkins Server",
        desc: `Login - Setup - configure Jenkins on EC2 instance on ${formData.cloudProvider}`,
      },
      {
        id: 5,
        task: `${formData.scmProvider} Build Test`,
        desc: `Run build tests from ${formData.scmProvider}`,
      },
      {
        id: 6,
        task: `${formData.cloudProvider} ECR Registry Push`,
        desc: `Push Docker image to ${formData.cloudProvider} ECR Registry`,
      },
      {
        id: 7,
        task: `${formData.cloudProvider} EKS Setup`,
        desc: `Deploy image to ${formData.cloudProvider} EKS`,
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
