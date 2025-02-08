import React, { useState } from "react";
import './Agent.css';
import NavHead from "../Home/NavHead/NavHead.js";
import { motion } from "framer-motion";
import Card from "react-bootstrap/Card";
import Button from "react-bootstrap/Button";
import { Link } from 'react-router-dom';
import InputForm from './InputForm/InputForm.js';


const Agent = () => {
  const [query, setQuery] = useState("");
  const [formColor, setFormColor] = useState("");
  const [greeting, setGreeting] = useState("Hello, I am aCube! How can I assist you today?");
  const [showGreeting, setShowGreeting] = useState(true); // State for fade animation

  const handleButtonClick = (color, description) => {
    setFormColor(color);

    // Fade out the current greeting
    setShowGreeting(false);

    // After the fade-out is complete, update the greeting and fade it back in
    setTimeout(() => {
      setGreeting(description);
      setShowGreeting(true);
    }, 220); // Match the fade-out duration (adjust as needed)
  };


  const handleSearch = () => {
    if (query) {
      console.log(query);
    }
  };


  return (
    <div>
      <NavHead />
      {/* Static Background */}
      <div className="d-flex justify-content-center align-items-center mt-custom">
        {/* Motion applied to the card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.75 }}
          style={{ marginTop: '80px' }}
          
        >
          <div className={`agent-card ${formColor}`}> 

          <Card style={{ height: '700px', width: '1000px'}} className={`w-180 max-w-md p-4 rounded-3 bg-black shadow-lg`}>
            
            <Card.Body className="d-flex flex-column gap-3">

              <div className="h-64 overflow-auto p-3 bg-black rounded shadow-sm">
              <div className="text-secondary small d-flex align-items-center">
                <img
                    className="chatbot-logo"
                    src="/ChatBot-Logo.png"
                    alt="ChatBot Logo"
                />
     <span className={`ms-3 text-white fs-4 ${showGreeting ? 'fade-in' : 'fade-out'}`}>{greeting}</span>

            </div>
              </div>

              <motion.div
          initial={{ opacity: 0, y: 80 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
        >
              <div className="d-flex justify-content-center" style={{ gap: '0.5rem' }}>

                <button className="agent-button-blue" onClick={() => handleButtonClick("blue-form", "Let's Setup your End-to-End CI/CD Pipeline!")}>
                CI/CD Setup
              </button>
              <button className="agent-button-red" onClick={() => handleButtonClick("red-form", "Time to Modify/Create Resources!")}>
                Modify Resources
              </button>
              <button className="agent-button-green" onClick={() => handleButtonClick("green-form", "Observability for Existing Setups!")}>
                Observability
              </button>

              </div>

              </motion.div>
              <div className="mt-auto">
              <InputForm formColor={formColor}/>
              </div>
            </Card.Body>

          </Card>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Agent;

