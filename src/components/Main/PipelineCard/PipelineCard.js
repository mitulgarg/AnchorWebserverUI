import React from "react";
import "./PipelineCard.css";
import Card from "react-bootstrap/Card";
import { CircularProgress } from "@mui/material"; // Import Material UI progress spinner
import CheckCircleIcon from "@mui/icons-material/CheckCircle"; // Import CheckCircle icon
import { keyframes } from "@emotion/react";
import { Checkmark } from 'react-checkmark'

// Define an animation for the success circle
const successAnimation = keyframes`
  0% {
    transform: scale(0);
    opacity: 0;
  }
  50% {
    transform: scale(1.1);
    opacity: 1;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
`;


const PipelineCard = ({ task, desc, isAnimating, validated }) => {
  return (
    <div className="pipeline-card">
      <Card style={{ width: "15.25rem", height: "13.6rem" }}>
        <Card.Body>
          <Card.Title>{task}</Card.Title>
          <Card.Text>
            {isAnimating ? (
              <div className="loading-animation">
                <CircularProgress size={30} />
              </div>
            ) : validated ? (
              
              <span style={{ color: "green" }}><Checkmark size='30px' color='green' />{desc}</span> // Green color when validated
            ) : (
              <span style={{ color: "maroon" }}>Pending {desc}</span> // Red color for non-validated tasks
            )}
          </Card.Text>
        </Card.Body>
      </Card>
    </div>
  );
};

export default PipelineCard;







// import React from "react";
// import './PipelineCard.css';
// import Card from 'react-bootstrap/Card';
// import { useSpring, animated } from "react-spring";
// import { CircularProgress } from "@mui/material"; // Import Material UI progress spinner (optional)

// const PipelineCard = ({ task, desc, isAnimating, validated }) => {
//   // Define animation using react-spring
//   const animationProps = useSpring({
//     loop: true,
//     to: { transform: "rotate(360deg)" },
//     from: { transform: "rotate(0deg)" },
//     config: { duration: 1000 },
//   });

//   return (
//     <div className="pipeline-card">
//       <Card style={{ width: "15.25rem", height: "10.6rem" }}>
//       <Card.Body>
//           <Card.Title>{task}</Card.Title>
//           <Card.Text>
//             {isAnimating ? (
//               <div className="loading-animation">
//                 <CircularProgress size={30} />
//               </div>
//             ) : validated ? (
//               <span style={{ color: "green" }}>✔️ {desc}</span>
//             ) : (
//               <span style={{ color: "red" }}>❌ {desc}</span>
//             )}
//           </Card.Text>
//         </Card.Body>
//       </Card>
//     </div>
//   );
// };


// export default PipelineCard;
