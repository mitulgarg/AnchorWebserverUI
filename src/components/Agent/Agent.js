import React, { useState } from "react";
import "./Agent.css";
import NavHead from "../Home/NavHead/NavHead.js";
import { motion } from "framer-motion";
import Card from "react-bootstrap/Card";
import InputForm from "./InputForm/InputForm.js";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFolderOpen, faArrowRight } from "@fortawesome/free-solid-svg-icons"; // Import faArrowRight
import { Link } from "react-router-dom"; // Import Link

const Agent = () => {
  const [formColor, setFormColor] = useState("");
  const [greetings, setGreetings] = useState([
    "Hi, this is Acube!",
    "Click here to choose the repository you want to deploy",
    "Select your Virtual Environment:",
    "How many people will be using this application each day?",
    "What will your domain name for your application be?",
  ]);
  const [currentStep, setCurrentStep] = useState(0);
  const [showGreeting, setShowGreeting] = useState(true);
  const [activeButton, setActiveButton] = useState(null);
  const [selectedFolder, setSelectedFolder] = useState("");
  const [showEnvironmentQuestion, setShowEnvironmentQuestion] = useState(false);
  const [selectedEnvironment, setSelectedEnvironment] = useState("");
  const [userInput, setUserInput] = useState(""); // For storing user input
  const [outputMessage, setOutputMessage] = useState(""); // For dynamic responses
  const [showButtons, setShowButtons] = useState(true);

  const handleFolderSelect = async () => {
    const folderPath = await window.showDirectoryPicker();
    setSelectedFolder(folderPath.name);
    proceedToNextStep();
  };

  const proceedToNextStep = () => {
    setShowGreeting(false);
    setTimeout(() => {
      if (currentStep < greetings.length - 1) {
        const nextStep = currentStep + 1;
        setCurrentStep(nextStep);

        // Show environment dropdown on the second step
        if (nextStep === 2) {
          setShowEnvironmentQuestion(true);
        }
      } else {
        // If no more greetings, clear the card content
        setCurrentStep(greetings.length);
      }
      setShowGreeting(true);
    }, 220);
  };

  const handleInputSend = (message) => {
    if (currentStep === 3) {
      // Handle 4th question response
      setOutputMessage(
        "For this use case, an EC2 Instance (t2.micro) will be good enough."
      );
      setTimeout(() => {
        setOutputMessage(""); // Clear output
        proceedToNextStep(); // Show 5th question
      }, 4000);
    } else if (currentStep === 4) {
      // Handle 5th question response
      setOutputMessage(`Your application domain will be: ${message}`);
      setTimeout(() => {
        setOutputMessage(""); // Clear output
        setUserInput(""); // Clear user input
        proceedToNextStep(); // Move to the next step
      }, 4000);
    }
  };

  const handleButtonClick = (color, buttonName) => {
    setFormColor(color);
    setActiveButton(buttonName);
    setShowButtons(false);
    proceedToNextStep(); // Move to "Click here to choose the repository" step
  };

  const handleEnvironmentChange = (event) => {
    setSelectedEnvironment(event.target.value);
    if (event.target.value) {
      setTimeout(() => {
        setShowEnvironmentQuestion(false); // Hide dropdown
        proceedToNextStep(); // Show the next greeting
      }, 2000); // 2-second delay
    }
  };

  return (
    <div>
      <NavHead />
      <div className="d-flex justify-content-center align-items-center mt-custom">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.75 }}
          style={{ marginTop: "80px" }}
        >
          <div className={`agent-card ${formColor}`}>
          <Card
  style={{ height: "700px", width: "1000px" }}
  className="w-180 max-w-md p-4 rounded-3 bg-black shadow-lg"
>
  <Card.Body className="d-flex flex-column gap-3">
    <div className="h-64 overflow-auto p-3 bg-black rounded shadow-sm">
      {currentStep < greetings.length ? (
        <>
          <div className="text-secondary small d-flex align-items-center">
            <img
              className="chatbot-logo"
              src="/ChatBot-Logo.png"
              alt="ChatBot Logo"
            />
            <span
              className={`ms-3 text-white fs-4 ${
                showGreeting ? "fade-in" : "fade-out"
              }`}
            >
              {greetings[currentStep]}
            </span>
          </div>

          {activeButton === "blue" &&
            currentStep === 1 &&
            !showEnvironmentQuestion && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="mt-3"
              >
                <button
                  className="btn btn-sm btn-outline-light"
                  onClick={handleFolderSelect}
                >
                  <FontAwesomeIcon icon={faFolderOpen} /> Select Folder
                </button>
                {selectedFolder && (
                  <p className="text-white mt-2">
                    Selected Folder:{" "}
                    <span className="text-info">{selectedFolder}</span>
                  </p>
                )}
              </motion.div>
            )}

          {currentStep === 2 && showEnvironmentQuestion && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mt-3"
            >
              <select
                className="form-select mt-2"
                value={selectedEnvironment}
                onChange={handleEnvironmentChange}
              >
                <option value="" disabled>
                  Choose an environment...
                </option>
                <option value="Python venv">base (Python 3.12.4)</option>
                <option value="Python 3.11.9">Python 3.11.9</option>
                <option value="miniforge3">miniforge3 (Python 3.9.16)</option>
              </select>
              {selectedEnvironment && (
                <p className="text-info mt-2">
                  Selected Environment: {selectedEnvironment}
                </p>
              )}
            </motion.div>
          )}
        </>
      ) : (
        <div className="text-center">
          <p className="text-white fs-4">You are all set!</p>
        </div>
      )}
    </div>

    <div className="mt-3 text-info">{outputMessage}</div>

    {currentStep < greetings.length ? (
      showButtons && (
        <motion.div
          initial={{ opacity: 0, y: 80 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
        >
          <div
            className="d-flex justify-content-center"
            style={{ gap: "0.5rem" }}
          >
            <button
              className={`agent-button-blue ${
                activeButton === "blue" ? "active" : ""
              }`}
              onClick={() => handleButtonClick("blue-form", "blue")}
            >
              CI/CD Setup
            </button>
            <button
              className={`agent-button-red ${
                activeButton === "red" ? "active" : ""
              }`}
              onClick={() => handleButtonClick("red-form", "red")}
            >
              Modify Resources
            </button>
            <button
              className={`agent-button-green ${
                activeButton === "green" ? "active" : ""
              }`}
              onClick={() => handleButtonClick("green-form", "green")}
            >
              Observability
            </button>
          </div>
        </motion.div>
      )
    ) : (
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mt-auto text-center"
      >
        <Link to="/main" className="text-white text-decoration-none">
          <button className="button-home">
            Let's Go! <FontAwesomeIcon icon={faArrowRight} />
          </button>
        </Link>
      </motion.div>
    )}

    <div className="mt-auto">
      {currentStep < greetings.length && (
        <InputForm onSend={handleInputSend} formColor={formColor} />
      )}
    </div>
  </Card.Body>
</Card>

{/* Closing tag for the conditional rendering */}
          </div> {/* Closing tag for agent-card */}
        </motion.div>
      </div>
    </div>
  );
};

export default Agent;


