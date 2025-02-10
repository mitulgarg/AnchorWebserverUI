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
  const [showGreeting, setShowGreeting] = useState(true);
  const [activeButton, setActiveButton] = useState(null);
  const [descriptionText, setDescriptionText] = useState("");
  const [showDescription, setShowDescription] = useState(false);
  const [descriptionList, setDescriptionList] = useState([]); // Define descriptionList HERE


  const descriptions = {  // Store descriptions in an object
    'blue-form': " Please tell me some of these key inputs...\n1. Your cloud provider and preferred region\n2. Your Service type (EC2/EC2+EKS)\n3. Your Local Environment name\n4. Your project path",
    'red-form': "Please tell me some of these key inputs...\n1. Your Project Path and environment\n 2.Your desired change\n",
    'green-form': "Please tell me some of these key inputs... \n1. Your Project Name\n2.What type of Analytics do you want to see?"
  };


  const handleSend = async (message) => {
    try {
      const response = await fetch("http://localhost:8000/process_input", { // Replace with your API endpoint
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: message, formColor: formColor }), // Send message and formColor
      });

      if (!response.ok) {
        const errorData = await response.json(); // Try to parse error response
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.detail || response.statusText}`);
      }

      const data = await response.json();
      console.log("Response from server:", data);
      // Process the response from the server (e.g., update the chat window)
      setGreeting(data.response || "Message sent successfully!"); // Example: update greeting
    } catch (error) {
      console.error("Error sending message:", error);
      // Handle errors (e.g., display an error message to the user)
      setGreeting("Error sending message. Please try again.");
    }
  };



  const handleButtonClick = (color, greetingText, buttonName) => {
    setFormColor(color);
    setShowGreeting(false);
    setTimeout(() => {
      setGreeting(greetingText);
      setShowGreeting(true);
    }, 220);
    setActiveButton(buttonName);
    setShowDescription(true); // Always show the description

    setDescriptionText(descriptions[color] || ""); // Set description based on color
    setDescriptionList(descriptions[color].split('\n') || []); // Use descriptionList here

  };


  return (
    <div>
      <NavHead />
      <div className="d-flex justify-content-center align-items-center mt-custom">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.75 }}
          style={{ marginTop: '80px' }}
        >
          <div className={`agent-card ${formColor}`}>
            <Card style={{ height: '700px', width: '1000px' }} className={`w-180 max-w-md p-4 rounded-3 bg-black shadow-lg`}>
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
                    <button className={`agent-button-blue ${activeButton === 'blue' ? 'active' : ''}`} 
                    onClick={() => handleButtonClick("blue-form", "Let's Setup your End-to-End CI/CD Pipeline!", 'blue')}>
                      CI/CD Setup
                    </button>
                    <button className={`agent-button-red ${activeButton === 'red' ? 'active' : ''}`} 
                    onClick={() => handleButtonClick("red-form", "Time to Modify/Create Resources!", 'red')}>
                      Modify Resources
                    </button>
                    <button className={`agent-button-green ${activeButton === 'green' ? 'active' : ''}`} 
                    onClick={() => handleButtonClick("green-form", "Observability for Existing Setups!", 'green')}>
                      Observability
                    </button>
                  </div>
                </motion.div>

                <div className="agent-description">
        {showDescription && descriptionList.map((paragraph, index) => (
          <p key={`${paragraph}-${index}`} className="fade-in-desc">
            {paragraph}
          </p>
        ))}
      </div>
                <div className="mt-auto">
                  <InputForm onSend={handleSend} formColor={formColor} /> {/* Pass handleSend as onSend prop */}
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

