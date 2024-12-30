import React from "react";
import "./PipelineCard.css";
import Card from "react-bootstrap/Card";
import { CircularProgress } from "@mui/material"; // Import Material UI progress spinner
import CheckCircleIcon from "@mui/icons-material/CheckCircle"; // Import CheckCircle icon
import { keyframes } from "@emotion/react";
import { Checkmark } from 'react-checkmark'

const PipelineCard = ({ task, desc, isAnimating, validated }) => {
  return (
    <div className="pipeline-card">
      <Card style={{ width: "16rem", height: "13.6rem" }}>
        <Card.Body>
          <Card.Title>{task}</Card.Title>
          <Card.Text>
            {isAnimating ? (
              <div className="loading-animation">
                <CircularProgress size={30} />
              </div>
            ) : validated ? (  
              <div className="checkmark-container">           
              <Checkmark size='32px' color='green' /><div className="cardtext"><span style={{ color: "green" , fontSize:"14px"}}>{desc}</span> </div>
              </div>
            ) : (
              <span style={{ color: "maroon" , fontSize:"14px"}}>Pending {desc}</span> // Red color for non-validated tasks
            )}
          </Card.Text>
        </Card.Body>
      </Card>
    </div>
  );
};

export default PipelineCard;
