import React, { useState, useEffect, useRef } from "react";
import "./Agent.css";
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
    addMessage("bot", "Please describe what you'd like to do with your application, and I'll help you set up the process:");
  };
  
  const handleSendMessage = async () => {
    if (!userInput.trim()) return;
    
    const message = userInput;
    setUserInput("");
    addMessage("user", message);
    setIsLoading(true);
    
    // Check if we're awaiting confirmation for tool execution
    if (awaitingConfirmation) {
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
      await validateToolAnswer(currentTool, message);
    }
    // Handle first user input - get CICD plan
    else if (activeButton) {
      await getCICDPlan(message);
    }
    
    setIsLoading(false);
  };
  
  const getCICDPlan = async (userRequest) => {
    try {
      addMessage("bot", "Generating plan...");
      
      const response = await fetch(`http://localhost:8000/acube/cicdplan?user_request=${encodeURIComponent(userRequest)}&service_type=${activeButton === "blue" ? "cicd" : activeButton === "red" ? "resource" : "observability"}`);
      
      const data = await response.json();
      
      if (data["Tool Execution Order"]) {
        setCurrentToolFlow(data["Tool Execution Order"]);
        setToolQuestions(data["Tool Questions"]);
        
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
      
      addMessage("bot", question || `Please provide information for ${firstTool}:`);
      setCurrentToolIndex(0);
    }
  };
  
  const validateToolAnswer = async (toolName, answer) => {
    try {
      addMessage("bot", `Processing your answer for ${toolName}...`);
      
      const response = await fetch(`http://localhost:8000/acube/answervalidator?tool_name=${toolName}&answer=${encodeURIComponent(answer)}`);
      
      const data = await response.json();
      
      if (data.variables) {
        addMessage("bot", `Great! I've validated your input for ${toolName}.`);
        
        // Move to next tool if available
        if (currentToolIndex < currentToolFlow.length - 1) {
          const nextIndex = currentToolIndex + 1;
          const nextTool = currentToolFlow[nextIndex];
          const nextQuestion = toolQuestions[nextTool];
          
          setCurrentToolIndex(nextIndex);
          addMessage("bot", nextQuestion || `Please provide information for ${nextTool}:`);
        } else {
          // Complete the setup
          await completeSetup();
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
  
  const completeSetup = async () => {
    try {
      addMessage("bot", "Setting up your application...");
      
      // Here you would actually call the necessary endpoints to set up the application
      // For example, analyzer, dockerfile-gen, etc.
      // For now, we'll just simulate success
      
      setTimeout(() => {
        addMessage("bot", "Success! I've set up your pipeline, generated all necessary files, and prepared your infrastructure.");
        
        // Set deploy readiness
        setIsDeployReady(true);
      }, 2000);
    } catch (error) {
      console.error("Error completing setup:", error);
      addMessage("bot", `There was an error during setup: ${error.message}. Please try again.`);
    }
  };
  
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSendMessage();
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
    if (lastMessage && lastMessage.text.includes("Success! I've set up your pipeline")) {
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