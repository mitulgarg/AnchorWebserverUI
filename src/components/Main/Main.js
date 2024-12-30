
import React, { useState, useEffect } from "react";
import "./Main.css";
import PipelineCard from "./PipelineCard/PipelineCard.js";
import { useSpring, animated } from "react-spring";

const Home = () => {

  const [flip, setFlip] = useState(false);

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

  const cardData = [
    { id: 1, task: "Local File Generation", desc: "Dockerfile, Jenkinsfile, requirements.txt" },
    { id: 2, task: "Github Push", desc: "Github Link retrieved" },
    { id: 3, task: "AWS EC2 setup", desc: "Terraform Files Generation" },
    { id: 4, task: "Jenkins Server AutoSetup on EC2", desc: "Login, Pipeline creation" },
    { id: 5, task: "Github Build Test", desc: "Pipeline from SCM test" },
    { id: 6, task: "ECR Registry Push", desc: "Push EC2 Image to Amazon ECR" },
    { id: 7, task: "EKS Setup", desc: "Pushing Image to EKS from ECR" },
  ];
  
  return (
    <div className="home-container">
      <div className="container">
          <div className="row justify-content-center">
            <div className="col-14 text-center">

               
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
    </div></div></div>
    </div>
  ); 
};

export default Home;






// import React, { useState, useEffect } from "react";
// // import ImageSlider from './ImageSlider/ImageSlider';
// import './Main.css';
// import { useSpring, animated } from "react-spring";
// import PipelineCard from './PipelineCard/PipelineCard.js'

// const Home = () => {
//   const [taskStatus, setTaskStatus] = useState([
//     { id: 1, isAnimating: true, validated: false },
//     { id: 2, isAnimating: false, validated: false },
//     { id: 3, isAnimating: false, validated: false },
//     { id: 4, isAnimating: false, validated: false },
//     { id: 5, isAnimating: false, validated: false },
//     { id: 6, isAnimating: false, validated: false },
//     { id: 7, isAnimating: false, validated: false },
//   ]);


//     // Simulate validation for each step
//   const validateStep = (id) => {
//     return new Promise((resolve) => {
//       setTimeout(() => {
//         console.log(`Validated step ${id}`);
//         resolve(true); // Simulate success (use actual validation logic here)
//       }, 2000); // Simulated delay
//     });
//   };

//   useEffect(() => {
//     const runWorkflow = async () => {
//       for (let i = 0; i < taskStatus.length; i++) {
//         const step = taskStatus[i];
//         if (step.isAnimating) {
//           const isValid = await validateStep(step.id);
//           if (isValid) {
//             setTaskStatus((prevStatus) => {
//               const updatedStatus = [...prevStatus];
//               updatedStatus[i].isAnimating = false;
//               updatedStatus[i].validated = true;
//               if (i + 1 < updatedStatus.length) {
//                 updatedStatus[i + 1].isAnimating = true;
//               }
//               return updatedStatus;
//             });
//           }
//         }
//       }
//     };
//     runWorkflow();
//   }, [taskStatus]);

//   // Simulate task completion
//   useEffect(() => {
//     const interval = setInterval(() => {
//       setTaskStatus((prevStatus) => {
//         const index = prevStatus.findIndex((task) => task.isAnimating);
//         if (index !== -1) {
//           const updatedStatus = [...prevStatus];
//           updatedStatus[index].isAnimating = false;
//           return updatedStatus;
//         }
//         clearInterval(interval);
//         return prevStatus;
//       });
//     }, 2000); // 2 seconds per task
//   }, []);


//   const [flip, setFlip] = useState(false);

//   const props= useSpring({
//       to: { opacity:1 },
//       from: { opacity:0 },
//       // reset: true,
//       // reverse: flip,
//       delay:550,
//       onRest: ()=> setFlip(!flip),
//   })

//   const cardData = [
//     { id: 1, task: "Local File Generation", desc: "Dockerfile, Jenkinsfile, requirements.txt", isAnimating: false },
//     { id: 2, task: "Github Push", desc: "Github Link retrieved", isAnimating: true },
//     { id: 3, task: "AWS EC2 setup", desc: "Terraform Files Generation", isAnimating: false },
//     { id: 4, task: "Jenkins Server AutoSetup on EC2", desc: "Login, Pipeline creation", isAnimating: true },
//     { id: 5, task: "Github Build Test", desc: "Pipeline from SCM test", isAnimating: false },
//     { id: 6, task: "ECR Registry Push", desc: "Push EC2 Image to Amazon ECR", isAnimating: true },
//     { id: 7, task: "EKS Setup", desc: "Pushing Image to EKS from ECR", isAnimating: false },

//   ];


//   return (
//     <div className="home-container">
//       <div className="container">
//           <div className="row justify-content-center">
//             <div className="col-14 text-center">

               
//     <h1>Setting up DevOps Pipeline... </h1>
//     <animated.div style={props}>  
//     <div className="card-container">
//         {cardData.map((data, index) => (
//           <PipelineCard
//             key={data.id}
//             id={data.id}
//             task={data.task}
//             desc={data.desc}
//             isAnimating={taskStatus[index]?.isAnimating}
//           />
//         ))}
//       </div> </animated.div>   
//     </div></div></div>
//     </div>
//   ); 
// };

// export default Home;