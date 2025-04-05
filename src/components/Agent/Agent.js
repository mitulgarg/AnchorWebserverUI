import React, { useState, useEffect, useRef } from "react";
import "./AgentTest.css";
import NavHead from "../Home/NavHead/NavHead.js";
import { motion } from "framer-motion";
import Card from "react-bootstrap/Card";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { 
  faArrowRight, 
  faPaperPlane, 
  faHistory, 
  faMessage,
  faTimes
} from "@fortawesome/free-solid-svg-icons";
import { Link } from "react-router-dom";
import { faCog, faSave, faEye, faEyeSlash } from "@fortawesome/free-solid-svg-icons";

const Agent = () => {
  // States for chat and UI
  const [formColor, setFormColor] = useState("");
  const [activeButton, setActiveButton] = useState(null);
  const [userInput, setUserInput] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDeployReady, setIsDeployReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);
  const [currentChatId, setCurrentChatId] = useState(Date.now());
  
  
  // New state to store validated tool responses
  const [validatedResponses, setValidatedResponses] = useState({});
  
  // Keep track of all tools that were validated - new state
  const [validatedTools, setValidatedTools] = useState([]);
  
  // Chat history and messages
  const [messages, setMessages] = useState([
    { sender: "bot", text: "Hello, I am Acube! Let's Get Started!" }
  ]);
  const [chatHistory, setChatHistory] = useState([]);
  
  // Tools execution flow
  const [currentToolFlow, setCurrentToolFlow] = useState([]);
  const [currentToolIndex, setCurrentToolIndex] = useState(0);
  const [toolQuestions, setToolQuestions] = useState({});
  
  // Refs
  const chatContainerRef = useRef(null);
  const inputRef = useRef(null);

  // Load chat history from localStorage on component mount
  useEffect(() => {
    const savedHistory = localStorage.getItem('acube-chat-history');
    if (savedHistory) {
      setChatHistory(JSON.parse(savedHistory));
    }
  }, []);

  // Save current chat to history whenever messages change
  useEffect(() => {
    if (messages.length > 1) { // Only update if there's more than the initial message
      updateChatInHistory();
    }
  }, [messages]);

  useEffect(() => {
    // Scroll to the bottom of chat when new messages are added
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Save chat history to localStorage whenever it changes
  useEffect(() => {
    if (chatHistory.length > 0) {
      localStorage.setItem('acube-chat-history', JSON.stringify(chatHistory));
    }
  }, [chatHistory]);

  // Add a useEffect to monitor validatedResponses changes
  useEffect(() => {
    console.log("validatedResponses updated:", validatedResponses);
  }, [validatedResponses]);

  // Handle key press for input
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  const updateChatInHistory = () => {
    // Generate a title based on the conversation content
    let title = "New Conversation";
    
    // Look for a user message to use as title
    const userMessages = messages.filter(m => m.sender === "user");
    if (userMessages.length > 0) {
      // Use the first user message as the title
      title = userMessages[0].text.substring(0, 30);
      if (userMessages[0].text.length > 30) title += "...";
    }
    
    const updatedChat = {
      id: currentChatId,
      title: title,
      messages: [...messages],
      timestamp: new Date().toISOString(),
      serviceType: activeButton ? 
                  (activeButton === "blue" ? "CI/CD Setup" : 
                   activeButton === "red" ? "Modify Resources" : 
                   "Observability") : 
                  "General"
    };
    
    setChatHistory(prevHistory => {
      // Check if this chat already exists in history
      const existingIndex = prevHistory.findIndex(chat => chat.id === currentChatId);
      
      if (existingIndex >= 0) {
        // Update existing chat
        const newHistory = [...prevHistory];
        newHistory[existingIndex] = updatedChat;
        return newHistory;
      } else {
        // Add new chat
        return [...prevHistory, updatedChat];
      }
    });
  };

  const addMessage = (sender, text) => {
    setMessages(prevMessages => [...prevMessages, { sender, text }]);
  };
  
  const handleButtonClick = (color, buttonName) => {
    setFormColor(color);
    setActiveButton(buttonName);
    
    // Add message for service selection
    addMessage("user", `Selected service: ${buttonName === "blue" ? "CI/CD Setup" : 
                          buttonName === "red" ? "Modify Resources" : "Observability"}`);
    
    // Bot asks for user input
    addMessage("bot", "Please describe what type of application you want to deploy on AWS:");
  };
  
  const handleSendMessage = async () => {
    if (!userInput.trim()) return;
    
    const message = userInput;
    setUserInput("");
    addMessage("user", message);
    setIsLoading(true);
    
    // Check if we're awaiting confirmation for tool execution
    if (awaitingConfirmation) {
      console.log("Processing confirmation response");
      if (message.toLowerCase().includes("yes") || message.toLowerCase().includes("confirm") || message.toLowerCase().includes("proceed")) {
        setAwaitingConfirmation(false);
        startToolFlow();
      } else {
        addMessage("bot", "Would you like to modify the plan? Please describe your requirements again.");
        setAwaitingConfirmation(false);
      }
    }
    // Check if we're in the middle of the tool flow
    else if (currentToolFlow.length > 0 && currentToolIndex < currentToolFlow.length) {
      // Handle tool flow questions
      const currentTool = currentToolFlow[currentToolIndex];
      console.log(`Processing answer for tool: ${currentTool}`);
      await validateToolAnswer(currentTool, message);
    }
    // Handle first user input - get CICD plan
    else if (activeButton) {
      console.log("Getting CICD plan");
      await getCICDPlan(message);
    }
    
    setIsLoading(false);
  };
  
  const getCICDPlan = async (userRequest) => {
    try {
      addMessage("bot", "Generating plan...");
      
      const response = await fetch(`http://localhost:8000/acube/cicdplan?user_request=${encodeURIComponent(userRequest)}&service_type=${activeButton === "blue" ? "cicd" : activeButton === "red" ? "resource" : "observability"}`);
      
      const data = await response.json();
      console.log("CICD plan response:", data);
      
      if (data["Tool Execution Order"]) {
        // Store the tool execution order
        setCurrentToolFlow(data["Tool Execution Order"]);
        setToolQuestions(data["Tool Questions"]);
        
        // IMPORTANT: Also reset the validated tools list when starting a new plan
        setValidatedTools([]);
        setValidatedResponses({});
        
        // Show reasoning and tool execution order
        addMessage("bot", "Here's my plan:\n\n" + data["Reasoning Steps"]);
        
        // Display the ordered list of tools
        const toolsList = data["Tool Execution Order"].map((tool, index) => 
          `${index + 1}. ${tool}`
        ).join('\n');
        
        addMessage("bot", `I'll execute the following tools in order:\n${toolsList}\n\nWould you like to proceed with this plan? (Yes/No)`);
        
        // Set awaiting confirmation
        setAwaitingConfirmation(true);
      } else if (data["Credential Error"]) {
        addMessage("bot", "There seems to be an issue with your AWS credentials. Please make sure they're configured correctly.");
      } else {
        addMessage("bot", "Couldn't generate a plan. Please try again with more details.");
      }
    } catch (error) {
      console.error("Error getting plan:", error);
      addMessage("bot", "Failed to get plan. Please check if the server is running.");
    }
  };
  
  const startToolFlow = () => {
    if (currentToolFlow.length > 0) {
      const firstTool = currentToolFlow[0];
      const question = toolQuestions[firstTool];
      
      console.log(`Starting tool flow with first tool: ${firstTool}`);
      addMessage("bot", question || `Please provide information for ${firstTool}:`);
      setCurrentToolIndex(0);
    }
  };
  
  const validateToolAnswer = async (toolName, answer) => {
    try {
      addMessage("bot", `Processing your answer for ${toolName}...`);
      
      const response = await fetch(
        `http://localhost:8000/acube/answervalidator?tool_name=${toolName}&answer=${encodeURIComponent(answer)}`
      );
      
      const data = await response.json();
      
      if (data.variables) {
        addMessage("bot", `Great! I've validated your input for ${toolName}.`);
        
        // Create updated copies of state
        const updatedResponses = {
          ...validatedResponses,
          [toolName]: data.variables
        };
        const newValidatedTools = [...validatedTools, toolName];
        
        // Update state
        setValidatedResponses(updatedResponses);
        setValidatedTools(newValidatedTools);
        
        // Move to next tool if available
        if (currentToolIndex < currentToolFlow.length - 1) {
          const nextIndex = currentToolIndex + 1;
          const nextTool = currentToolFlow[nextIndex];
          const nextQuestion = toolQuestions[nextTool];
          
          setCurrentToolIndex(nextIndex);
          addMessage("bot", nextQuestion || `Please provide information for ${nextTool}:`);
        } else {
          // Pass both updated values to completeSetup
          await completeSetup(updatedResponses, newValidatedTools);
        }
      } else if (data.retry_exception) {
        addMessage("bot", data.retry_exception);
      } else {
        addMessage("bot", `There was an issue with your answer. Please try again.`);
      }
    } catch (error) {
      console.error("Error validating answer:", error);
      addMessage("bot", "Failed to validate your answer. Please try again.");
    }
  };
  
  const completeSetup = async (responses = null, tools = null) => {
    try {
      addMessage("bot", "Setting up your application...");
      
      // Use parameters or fall back to state
      const validResponses = responses || validatedResponses;
      const validTools = tools || validatedTools;
      
      console.log("Starting completeSetup with:", validResponses, validTools);
      
      // Verify we have responses and tools
      if (Object.keys(validResponses).length === 0 || validTools.length === 0) {
        console.warn("Missing validated tools or responses");
        addMessage("bot", "I don't have all the required information to set up your application. Let's try again.");
        return;
      }
      
      // API call results storage
      const apiResults = {};
      
      // Tools to endpoints mapping (enhanced)
      const toolsToEndpoints = {
        'analyzer': { endpoint: 'analyzer', requiredFields: ['folder_path', 'environment_path'] },
        'dockerfile-gen': { endpoint: 'dockerfile-gen', requiredFields: ['python_version'] },
        'creds': { endpoint: 'creds', requiredFields: [] }, // Fixed key name
        'infra': { endpoint: 'infra', requiredFields: [] }, // Fixed key name
        'jenkinsfile-gen': { endpoint: 'jenkinsfile-gen', requiredFields: ['folder_path'] },
        'get-environments': {endpoint: 'get-environments', requiredFields: ['folder_path']}
      };
      
      // Determine endpoints to call based on validated tools
      const endpointsToCall = new Set();
      validTools.forEach(tool => {
        if (toolsToEndpoints[tool]) {
          endpointsToCall.add(toolsToEndpoints[tool].endpoint);
        }
      });
      
      // First pass: collect all endpoints we need to call
      // tools.forEach(tool => {
      //   if (toolsToEndpoints[tool]) {
      //     endpointsToCall.add(toolsToEndpoints[tool].endpoint);
      //   }
      // });
      
      console.log("Endpoints to call based on validated tools:", Array.from(endpointsToCall));
      
      // Variables to store important values
      let workDir = '';
      let entrypoint = '';
      let appType = '';
      let pythonVersion = '';
      
      // Call analyzer if needed (required for most other endpoints)
      if (endpointsToCall.has('analyzer')) {
        try {
          // Check if we have all required fields for analyzer
          const requiredFields = ['folder_path'];
          if (validResponses.analyzer?.environment_path) {
            requiredFields.push('environment_path');
          }

          const hasAllFields = requiredFields.every(field => 
            validResponses.analyzer?.[field] !== undefined
          );
          
          if (!hasAllFields) {
            throw new Error("Missing required fields for analyzer");
          }
          
          addMessage("bot", "Analyzing your project structure...");
          const analyzerResponse = await fetch("http://localhost:8000/analyzer", {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              folder_path: validResponses.analyzer?.folder_path || '',
              environment_path: validResponses.analyzer?.environment_path || ''
            })
          });
          
          const analyzerData = await analyzerResponse.json();
          console.log("Analyzer API response:", analyzerData);
          apiResults['analyzer'] = analyzerData;
          
          if (!analyzerData.success) {
            throw new Error("Project analysis failed");
          }
          
          addMessage("bot", `Project analysis complete! Found app type: ${analyzerData.app_type}`);
          
          // Store important values from analyzer response
          workDir = analyzerData.work_dir;
          entrypoint = analyzerData.entrypoint;
          appType = analyzerData.app_type;
          
          // Get Python version if needed for dockerfile-gen
          if (endpointsToCall.has('dockerfile-gen')) {
            if (validResponses['python-version']?.python_version) {
              pythonVersion = validResponses['python-version'].python_version;
            } else {
              // Fallback to getting Python versions if not provided
              const pythonVersionsResponse = await fetch(
                `http://localhost:8000/get-environments?folder_path=${encodeURIComponent(
                  validResponses['folder-selection']?.folder_path || ''
                )}`
              );
              const pythonVersionsData = await pythonVersionsResponse.json();
              console.log("Python versions:", pythonVersionsData);
              
              pythonVersion = pythonVersionsData && pythonVersionsData.length > 0 ? 
                            pythonVersionsData[0] : "3.9";
            }
          }
        } catch (apiError) {
          console.error("Analyzer API error:", apiError);
          addMessage("bot", `Error during project analysis: ${apiError.message}`);
          return;
        }
      }
      
      // Call dockerfile-gen if needed and we have required data
      if (endpointsToCall.has('dockerfile-gen') && appType && workDir && entrypoint) {
        try {
          addMessage("bot", "Generating Dockerfile...");
          const dockerfileResponse = await fetch(
            `http://localhost:8000/dockerfile-gen?app_type=${encodeURIComponent(appType)}` +
            `&python_version=${encodeURIComponent(pythonVersion)}` +
            `&work_dir=${encodeURIComponent(workDir)}` +
            `&entrypoint=${encodeURIComponent(entrypoint)}` +
            `&folder_path=${encodeURIComponent(validResponses.analyzer?.folder_path || '')}`
          );
          
          const dockerfileData = await dockerfileResponse.json();
          console.log("Dockerfile generation response:", dockerfileData);
          apiResults['dockerfile'] = dockerfileData;
          
          if (!dockerfileData.success) {
            throw new Error("Dockerfile generation failed");
          }
          
          addMessage("bot", "Dockerfile generated successfully!");
        } catch (apiError) {
          console.error("Dockerfile API error:", apiError);
          addMessage("bot", `Error generating Dockerfile: ${apiError.message}`);
        }
      }
      
      // Call jenkinsfile-gen if needed
      // Update the Jenkinsfile-gen section in completeSetup
      if (endpointsToCall.has('jenkinsfile-gen') && validResponses['jenkinsfile-gen']?.folder_path) {
        try {
          addMessage("bot", "Generating Jenkinsfile...");
          const jenkinsfileResponse = await fetch(
            `http://localhost:8000/jenkinsfile-gen?folder_path=${encodeURIComponent(
              validResponses['jenkinsfile-gen'].folder_path // Changed from folder-selection to jenkinsfile-gen
            )}`
          );

          if (!jenkinsfileResponse.ok) {
            throw new Error(`HTTP error! status: ${jenkinsfileResponse.status}`);
          }
          
          const jenkinsfileData = await jenkinsfileResponse.json();
          console.log("Jenkinsfile generation response:", jenkinsfileData);
          apiResults['jenkinsfile'] = jenkinsfileData;
          
          if (!jenkinsfileData.success) {
            throw new Error("Jenkinsfile generation failed");
          }
          
          addMessage("bot", "Jenkinsfile generated successfully!");
        } catch (apiError) {
          console.error("Jenkinsfile API error:", apiError);
          addMessage("bot", `Error generating Jenkinsfile: ${apiError.message}`);
        }
      }

      if (endpointsToCall.has('get-environments') && validResponses['get-environments']?.folder_path) {
        try {
          addMessage("bot", "Getting Python Environments...");
          const environmentsResponse = await fetch(
            `http://localhost:8000/get-environments?folder_path=${encodeURIComponent(
              validResponses['get-environments'].folder_path // Changed from folder-selection to jenkinsfile-gen
            )}`
          );

          if (!environmentsResponse.ok) {
            throw new Error(`HTTP error! status: ${environmentsResponse.status}`);
          }
          
          const environmentData = await environmentsResponse.json();
          console.log("get environments response:", environmentData);
          apiResults['python_versions'] = environmentData;
          
          if (!environmentData.success) {
            throw new Error("Fetching Environments Failed");
          }
          
          addMessage("bot", "Jenkinsfile generated successfully!");
        } catch (apiError) {
          console.error("Jenkinsfile API error:", apiError);
          addMessage("bot", `Error generating Jenkinsfile: ${apiError.message}`);
        }
      }
      
      // Call AWS creds if needed
      if (endpointsToCall.has('creds')) {
        try {
          addMessage("bot", "Retrieving AWS credentials...");
          const credsResponse = await fetch("http://localhost:8000/creds");
          const credsData = await credsResponse.json();
          console.log("AWS credentials response:", credsData);
          apiResults['creds'] = credsData;
          
          if (!credsData.success) {
            throw new Error("Failed to retrieve AWS credentials");
          }
          
          addMessage("bot", "AWS credentials validated!");
        } catch (apiError) {
          console.error("AWS credentials API error:", apiError);
          addMessage("bot", `Error validating AWS credentials: ${apiError.message}`);
        }
      }
      
      // Call infrastructure if needed
      if (endpointsToCall.has('infra') && workDir) {
        try {
          addMessage("bot", "Generating infrastructure code...");
          const infraResponse = await fetch(
            `http://localhost:8000/infra?work_dir=${encodeURIComponent(workDir)}`
          );
          
          const infraData = await infraResponse.json();
          console.log("Infrastructure generation response:", infraData);
          apiResults['infra'] = infraData;
          
          if (!infraData.success) {
            throw new Error("Infrastructure generation failed");
          }
          
          addMessage("bot", "Infrastructure code generated successfully!");
        } catch (apiError) {
          console.error("Infrastructure API error:", apiError);
          addMessage("bot", `Error generating infrastructure: ${apiError.message}`);
        }
      }
      
      // Check if we have any results
      const calledEndpoints = Object.keys(apiResults);
      if (calledEndpoints.length > 0) {
        const allSuccessful = calledEndpoints.every(endpoint => apiResults[endpoint].success);
        console.log("All API results:", apiResults, "All successful:", allSuccessful);
        
        if (allSuccessful) {
          setTimeout(() => {
            const completedSteps = calledEndpoints.map(endpoint => {
              switch(endpoint) {
                case 'analyzer': return 'project analysis';
                case 'dockerfile': return 'Dockerfile generation';
                case 'jenkinsfile': return 'Jenkinsfile generation';
                case 'creds': return 'AWS credential validation';
                case 'infra': return 'infrastructure code generation';
                default: return endpoint;
              }
            }).join(', ');
            
            addMessage("bot", `Success! I've completed the following steps: ${completedSteps}. Your application setup is ready!`);
            
            // Only set deploy ready if we've completed all possible steps
            const allPossibleEndpoints = new Set(['analyzer', 'dockerfile', 'jenkinsfile', 'creds', 'infra']);
            if (calledEndpoints.length === allPossibleEndpoints.size) {
              setIsDeployReady(true);
            }
          }, 2000);
        } else {
          const failedApis = Object.entries(apiResults)
            .filter(([_, result]) => !result.success)
            .map(([api, _]) => api);
          
          addMessage("bot", `There was an issue during setup. The following steps failed: ${failedApis.join(', ')}.`);
        }
      } else {
        addMessage("bot", "No setup steps were executed. Please provide the necessary information first.");
      }
    } catch (error) {
      console.error("Error completing setup:", error);
      addMessage("bot", `There was an error during setup: ${error.message}. Please try again.`);
    }
  };
  
  
  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };
  
  const loadChatHistory = (chatEntry) => {
    // Start a new conversation based on the history
    setCurrentChatId(chatEntry.id);
    setMessages(chatEntry.messages);
    
    // Reset the current state to match the loaded chat
    setCurrentToolFlow([]);
    setCurrentToolIndex(0);
    setToolQuestions({});
    setAwaitingConfirmation(false);
    setValidatedResponses({}); 
    setValidatedTools([]); // Reset validated tools list
    
    // Try to restore service type
    if (chatEntry.serviceType === "CI/CD Setup") {
      setActiveButton("blue");
      setFormColor("blue-form");
    } else if (chatEntry.serviceType === "Modify Resources") {
      setActiveButton("red");
      setFormColor("red-form");
    } else if (chatEntry.serviceType === "Observability") {
      setActiveButton("green");
      setFormColor("green-form");
    }
    
    // Check if this conversation was completed
    const lastMessage = chatEntry.messages[chatEntry.messages.length - 1];
    if (lastMessage && lastMessage.text.includes("Success! I've")) {
      setIsDeployReady(true);
    } else {
      setIsDeployReady(false);
    }
    
    setIsSidebarOpen(false);
  };
  
  const startNewChat = () => {
    setCurrentChatId(Date.now());
    setMessages([{ sender: "bot", text: "Hello, I am Acube! Let's Get Started!" }]);
    setActiveButton(null);
    setFormColor("");
    setCurrentToolFlow([]);
    setCurrentToolIndex(0);
    setToolQuestions({});
    setAwaitingConfirmation(false);
    setIsDeployReady(false);
    setIsSidebarOpen(false);
    setValidatedResponses({});
    setValidatedTools([]); // Reset validated tools list
  };
  
  const deleteChatHistory = (id, e) => {
    e.stopPropagation(); // Prevent loading the chat when clicking delete
    
    setChatHistory(prevHistory => {
      const newHistory = prevHistory.filter(chat => chat.id !== id);
      localStorage.setItem('acube-chat-history', JSON.stringify(newHistory));
      return newHistory;
    });
  };

  return (
    <div className="agent-fullscreen">
      <NavHead />
      
      {/* Sidebar Toggle Button */}
      <button 
        className="sidebar-toggle-btn"
        onClick={toggleSidebar}
      >
        <FontAwesomeIcon icon={isSidebarOpen ? faTimes : faHistory} />
      </button>
      
      <button 
        className="settings-toggle-btn"
        title="Settings"
      >
        <Link to="/settings">
          <FontAwesomeIcon icon={faCog} />
        </Link>
      </button>

      {/* Sidebar */}
      <div className={`chat-sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h3>Chat History</h3>
          <button className="new-chat-btn" onClick={startNewChat}>
            New Chat
          </button>
        </div>
        <div className="sidebar-content">
          {chatHistory.length === 0 ? (
            <p className="no-history">No chat history yet</p>
          ) : (
            <ul className="history-list">
              {chatHistory.map(chat => (
                <li key={chat.id} onClick={() => loadChatHistory(chat)} className="history-item">
                  <div className="history-item-content">
                    <FontAwesomeIcon icon={faMessage} className="history-icon" />
                    <div className="history-details">
                      <span className="history-title">{chat.title}</span>
                      <span className="history-date">
                        {new Date(chat.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <button 
                    className="delete-history-btn" 
                    onClick={(e) => deleteChatHistory(chat.id, e)}
                    title="Delete conversation"
                  >
                    <FontAwesomeIcon icon={faTimes} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      
      {/* Main Chat Area */}
      <div className={`agent-main ${isSidebarOpen ? 'sidebar-open' : ''}`}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.75 }}
          className="agent-container"
        >
          <Card className="agent-card">
            <Card.Body className="agent-card-body">
              {/* Chat Messages Area */}
              <div ref={chatContainerRef} className="chat-messages-container">
                {messages.map((message, index) => (
                  <div 
                    key={index} 
                    className={`message ${message.sender === "bot" ? "bot-message" : "user-message"}`}
                  >
                    {message.sender === "bot" && (
                      <div className="bot-avatar">
                        <img src="/ChatBot-Logo.png" alt="Acube" />
                      </div>
                    )}
                    <div className="message-content">
                      {message.text.split('\n').map((text, i) => (
                        <p key={i}>{text}</p>
                      ))}
                    </div>
                  </div>
                ))}
                
                {isLoading && (
                  <div className="bot-message">
                    <div className="bot-avatar">
                      <img src="/ChatBot-Logo.png" alt="Acube" />
                    </div>
                    <div className="typing-indicator">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Button Options (initial) */}
              {messages.length === 1 && !activeButton && (
                <motion.div
                  initial={{ opacity: 0, y: 80 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 1 }}
                  className="button-options"
                >
                  <button
                    className={`agent-button-blue ${activeButton === "blue" ? "active" : ""}`}
                    onClick={() => handleButtonClick("blue-form", "blue")}
                  >
                    CI/CD Setup
                  </button>
                  <button
                    className={`agent-button-red ${activeButton === "red" ? "active" : ""}`}
                    onClick={() => handleButtonClick("red-form", "red")}
                  >
                    Modify Resources
                  </button>
                  <button
                    className={`agent-button-green ${activeButton === "green" ? "active" : ""}`}
                    onClick={() => handleButtonClick("green-form", "green")}
                  >
                    Observability
                  </button>
                </motion.div>
              )}
              
              {/* Deploy Button (when ready) */}
              {isDeployReady && (
                <motion.div
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="deploy-button-container"
                >
                  <Link to="/main" className="deploy-button-link">
                    <button className="deploy-button">
                      Let's Go! <FontAwesomeIcon icon={faArrowRight} />
                    </button>
                  </Link>
                </motion.div>
              )}
              
              {/* Input Form */}
              {activeButton && !isDeployReady && (
                <div className="chat-input-container">
                  <input
                    type="text"
                    ref={inputRef}
                    className={`chat-input ${formColor}`}
                    placeholder="Type your message..."
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    disabled={isLoading}
                  />
                  <button
                    className={`send-button ${formColor}`}
                    onClick={handleSendMessage}
                    disabled={isLoading || !userInput.trim()}
                  >
                    <FontAwesomeIcon icon={faPaperPlane} />
                  </button>
                </div>
              )}
            </Card.Body>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default Agent;