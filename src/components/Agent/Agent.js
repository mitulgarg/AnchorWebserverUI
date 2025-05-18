// Agent.js

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
  faTimes,
  faCog,
  faClipboardList, // Icon for Review Dashboard
  faCogs // Icon for Setup CI/CD (or keep faArrowRight)
} from "@fortawesome/free-solid-svg-icons";
// Import useNavigate for navigation
import { Link, useNavigate } from "react-router-dom";

const Agent = () => {
  // --- Hooks ---
  const navigate = useNavigate(); // Hook for navigation

  // --- States ---
  const [formColor, setFormColor] = useState("");
  const [activeButton, setActiveButton] = useState(null);
  const [userInput, setUserInput] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  // const [isDeployReady, setIsDeployReady] = useState(false); // State for showing the 'View/Deploy' button - Replaced by showPostCollectionOptions
  const [isLoading, setIsLoading] = useState(false);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);
  const [currentChatId, setCurrentChatId] = useState(() => `chat-${Date.now()}`); // Ensure unique ID

  // State to store validated tool responses
  const [validatedResponses, setValidatedResponses] = useState({});
  // Keep track of all tools that were validated - state
  const [validatedTools, setValidatedTools] = useState([]);

  // Chat history and messages
  const [messages, setMessages] = useState([
    { sender: "bot", text: "Hello, I am Acube! Let's Get Started!" }
  ]);
  const [chatHistory, setChatHistory] = useState([]);

  // Tools execution flow
  const [currentToolFlow, setCurrentToolFlow] = useState([]);
  const [currentToolIndex, setCurrentToolIndex] = useState(0);

  // State to track if we're processing tools
  const [isProcessingTools, setIsProcessingTools] = useState(false);

  // --- New States for post-collection options ---
  const [showPostCollectionOptions, setShowPostCollectionOptions] = useState(false);
  const [finalizedValidatedResponses, setFinalizedValidatedResponses] = useState({});
  const [finalizedValidatedTools, setFinalizedValidatedTools] = useState([]);


  // --- Refs ---
  const chatContainerRef = useRef(null);
  const inputRef = useRef(null); // Ref for the input field

  // --- Effects ---

  // Load chat history from localStorage on component mount
  useEffect(() => {
    const savedHistory = localStorage.getItem('acube-chat-history');
    if (savedHistory) {
      try {
        const parsedHistory = JSON.parse(savedHistory);
        // Sort history by timestamp descending (most recent first) on load
        parsedHistory.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        setChatHistory(parsedHistory);
      } catch (e) {
        console.error("Failed to parse chat history:", e);
        localStorage.removeItem('acube-chat-history'); // Clear corrupted history
      }
    }
  }, []);

  // Save current chat to history whenever messages change
  useEffect(() => {
    // Only update history if it's not the very initial state or empty
    if (messages.length > 1 || (messages.length === 1 && messages[0].text !== "Hello, I am Acube! Let's Get Started!")) {
      updateChatInHistory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, currentChatId, activeButton]); // Add dependencies that affect the chat entry

  // Scroll to the bottom of chat when new messages are added
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Save chat history to localStorage whenever it changes
  useEffect(() => {
    if (chatHistory.length > 0) {
      localStorage.setItem('acube-chat-history', JSON.stringify(chatHistory));
    } else {
      localStorage.removeItem('acube-chat-history');
    }
  }, [chatHistory]);

  // Debugging: Monitor validatedResponses changes
  useEffect(() => {
    console.log("State validatedResponses updated:", validatedResponses);
  }, [validatedResponses]);

   // Debugging: Monitor validatedTools changes
   useEffect(() => {
    console.log("State validatedTools updated:", validatedTools);
  }, [validatedTools]);

  // --- Functions ---

  const addMessage = (sender, text) => {
    if (!text || (typeof text === 'string' && !text.trim())) {
      console.warn("Attempted to add an empty message.");
      return;
    }
    setMessages(prevMessages => [...prevMessages, { sender, text }]);
  };

  const updateChatInHistory = () => {
    let title = "New Conversation";
    const userMessages = messages.filter(m => m.sender === "user");
    if (userMessages.length > 0) {
      title = userMessages[0].text.substring(0, 30) + (userMessages[0].text.length > 30 ? "..." : "");
    } else if (messages.length > 1) {
      title = messages[1].text.substring(0, 30) + (messages[1].text.length > 30 ? "..." : "");
    }

    const serviceType = activeButton ?
                        (activeButton === "blue" ? "CI/CD Setup" :
                         activeButton === "red" ? "Modify Resources" :
                         activeButton === "green" ? "Observability" : "General")
                        : "General";

    const updatedChat = {
      id: currentChatId,
      title: title,
      messages: [...messages],
      timestamp: new Date().toISOString(),
      serviceType: serviceType,
      // Persist if post-collection options were shown and what data was ready
      // This might be useful if you want to resume to the button choice step
      // showPostCollectionOptions: showPostCollectionOptions,
      // finalizedValidatedResponses: showPostCollectionOptions ? finalizedValidatedResponses : {},
      // finalizedValidatedTools: showPostCollectionOptions ? finalizedValidatedTools : [],
    };

    setChatHistory(prevHistory => {
      const existingIndex = prevHistory.findIndex(chat => chat.id === currentChatId);
      const newHistory = [...prevHistory];
      if (existingIndex >= 0) {
        newHistory[existingIndex] = updatedChat;
      } else {
        newHistory.push(updatedChat);
      }
       newHistory.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      return newHistory;
    });
  };


  const fetchDynamicQuestion = async (toolName) => {
    console.log(`Workspaceing question for tool: ${toolName}`);
    setIsLoading(true);
    try {
      const response = await fetch(
        `http://localhost:8000/acube/dynamicquestion?tool_name=${encodeURIComponent(toolName)}`
      );
      if (!response.ok) {
         throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      const question = data[toolName];

      if (question === 'Pass') {
        console.log(`Tool ${toolName} returned Pass - auto validating`);
        await handlePassTool(toolName);
      } else {
        addMessage("bot", question);
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Error fetching dynamic question:", error);
      addMessage("bot", `Failed to fetch the next question: ${error.message}. Please try again.`);
      setIsLoading(false);
      setIsProcessingTools(false);
    }
  };

  const handlePassTool = async (toolName) => {
    console.log(`Handling 'Pass' for tool: ${toolName}`);
    setIsLoading(true);

    try {
       const validateResponse = await fetch(
           `http://localhost:8000/acube/answervalidator?tool_name=${encodeURIComponent(toolName)}&answer=`
       );
       if (!validateResponse.ok) {
          throw new Error(`HTTP error! status: ${validateResponse.status}`);
       }
       const data = await validateResponse.json();

       if (data.variables) {
           addMessage("bot", `Processing ${toolName} automatically...`);

           let currentResponses = {};
           let currentTools = [];

           setValidatedResponses(prevResponses => {
             const newResponses = { ...prevResponses, [toolName]: data.variables };
             currentResponses = newResponses;
             console.log("Updated responses in handlePassTool:", newResponses);
             return newResponses;
           });

           setValidatedTools(prevTools => {
             const newTools = [...prevTools, toolName];
             currentTools = newTools;
             console.log("Updated tools in handlePassTool:", newTools);
             return newTools;
           });

           let nextToolName = null;
           let shouldCompleteDataCollection = false;

           setCurrentToolIndex(prevIndex => {
               const nextIndex = prevIndex + 1;
               if (nextIndex < currentToolFlow.length) {
                   nextToolName = currentToolFlow[nextIndex];
               } else {
                   shouldCompleteDataCollection = true;
               }
               return nextIndex;
           });

           // Ensure state updates are processed before proceeding
           await new Promise(resolve => setTimeout(resolve, 0));


           if (shouldCompleteDataCollection) {
               console.log("[handlePassTool] All tools processed. Proceeding to show options.");
               completeSetup(currentResponses, currentTools); // Pass the latest collected data
           } else if (nextToolName) {
               await fetchDynamicQuestion(nextToolName);
           } else {
               console.error("[handlePassTool] Error: Could not determine next step.");
               addMessage("bot", "An unexpected error occurred processing the steps.");
               setIsLoading(false);
               setIsProcessingTools(false);
           }

       } else if (data.retry_exception) {
          addMessage("bot", `Automatic processing failed for ${toolName}: ${data.retry_exception}`);
          setIsLoading(false);
          setIsProcessingTools(false);
       } else {
          addMessage("bot", `There was an unexpected error processing ${toolName} automatically.`);
          setIsLoading(false);
          setIsProcessingTools(false);
       }
    } catch (error) {
       console.error(`Error in handlePassTool for ${toolName}:`, error);
       addMessage("bot", `Error during automatic processing for ${toolName}: ${error.message}`);
       setIsLoading(false);
       setIsProcessingTools(false);
    }
 };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !isLoading && !showPostCollectionOptions) { // Prevent send if options are shown
      handleSendMessage();
    }
  };

  const handleButtonClick = (color, buttonName) => {
    startNewChat(); 

    setFormColor(`${color}-form`);
    setActiveButton(buttonName);

    const serviceName = buttonName === "blue" ? "CI/CD Setup" :
                        buttonName === "red" ? "Modify Resources" :
                        buttonName === "green" ? "Observability" : "Unknown Service";
    setMessages([
       { sender: "bot", text: "Hello, I am Acube! Let's Get Started!" },
       { sender: "user", text: `Selected service: ${serviceName}` },
       { sender: "bot", text: `Okay, starting ${serviceName}. Please describe what you want to achieve:` }
    ]);
    inputRef.current?.focus();
  };

  const handleSendMessage = async () => {
    if (!userInput.trim() || isLoading || showPostCollectionOptions) return;

    const message = userInput.trim();
    setUserInput("");
    addMessage("user", message);
    setIsLoading(true);

    try {
      if (awaitingConfirmation) {
        const normalized = message.toLowerCase();
        if (normalized === "yes" || normalized === "y" || normalized === "confirm") {
          addMessage("bot", "Great! Let's get started with the setup.");
          setAwaitingConfirmation(false);
          setIsProcessingTools(true);
          await startToolFlow(); 
        } else {
          addMessage("bot", "Okay, plan cancelled. Please describe what you'd like to do instead, or select a service.");
          setAwaitingConfirmation(false);
          setActiveButton(null);
          setFormColor("");
          setCurrentToolFlow([]);
          setIsLoading(false);
        }
      } else if (isProcessingTools) {
        const currentTool = currentToolFlow[currentToolIndex];
        await validateToolAnswer(currentTool, message);
      } else if (activeButton) {
        await getCICDPlan(message);
      } else {
         addMessage("bot", "Please select a service (CI/CD Setup, Modify Resources, Observability) or describe your goal if you have selected one.");
         setIsLoading(false);
      }
    } catch (error) {
      console.error("Error in handleSendMessage:", error);
      addMessage("bot", `An error occurred: ${error.message}`);
      setIsLoading(false);
      setIsProcessingTools(false);
      setAwaitingConfirmation(false);
      setCurrentToolFlow([]);
      setCurrentToolIndex(0);
    }
  };

  const getCICDPlan = async (userRequest) => {
     addMessage("bot", "Generating plan...");
     setIsLoading(true); // Ensure loading is true
     try {
         const serviceTypeParam = activeButton === "blue" ? "cicd" :
                                 activeButton === "red" ? "resource" :
                                 activeButton === "green" ? "observability" : "general";

         const response = await fetch(
             `http://localhost:8000/acube/cicdplan?user_request=${encodeURIComponent(userRequest)}&service_type=${serviceTypeParam}`
         );
         if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
         }
         const data = await response.json();
         console.log("CICD plan response:", data);

         if (data["Tool Execution Order"] && data["Tool Execution Order"].length > 0) {
             setCurrentToolFlow(data["Tool Execution Order"]);
             setValidatedTools([]); 
             setValidatedResponses({}); 
             setCurrentToolIndex(0);

             addMessage("bot", "Here's my plan:\n\n" + data["Reasoning Steps"]);
             const toolsList = data["Tool Execution Order"].map((tool, index) => `${index + 1}. ${tool}`).join('\n');
             addMessage("bot", `I'll execute the following tools in order:\n${toolsList}\n\nWould you like to proceed with this plan? (Yes/No)`);
             setAwaitingConfirmation(true);
             setIsLoading(false);
         } else if (data["Credential Error"]) {
             addMessage("bot", "There seems to be an issue with your AWS credentials. Please make sure they're configured correctly via Settings.");
             setAwaitingConfirmation(false);
             setIsLoading(false);
         } else {
             addMessage("bot", "Sorry, I couldn't generate a plan based on your request. Could you please provide more details or try rephrasing?");
             setAwaitingConfirmation(false);
             setIsLoading(false);
         }
     } catch (error) {
         console.error("Error getting plan:", error);
         addMessage("bot", `Failed to get plan: ${error.message}. Please check if the server is running and try again.`);
         setAwaitingConfirmation(false);
         setIsLoading(false);
     }
  };

  const startToolFlow = async () => {
    if (currentToolFlow.length > 0) {
      console.log("Starting tool flow...");
      setValidatedResponses({});
      setValidatedTools([]);
      setCurrentToolIndex(0);
      setIsProcessingTools(true);
      setShowPostCollectionOptions(false); // Ensure options are hidden when flow starts
      await fetchDynamicQuestion(currentToolFlow[0]);
    } else {
        console.warn("startToolFlow called with empty currentToolFlow.");
        addMessage("bot", "Something went wrong, the execution plan is empty.");
        setIsProcessingTools(false);
        setIsLoading(false);
    }
  };

  const validateToolAnswer = async (toolName, answer) => {
    addMessage("bot", `Processing your answer for ${toolName}...`);
    setIsLoading(true); // Ensure loading is true

    try {
      const response = await fetch(
        `http://localhost:8000/acube/answervalidator?tool_name=${encodeURIComponent(toolName)}&answer=${encodeURIComponent(answer)}`
      );
      if (!response.ok) {
         throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();

      if (data.variables) {
        addMessage("bot", `Great! I've validated your input for ${toolName}.`);

        let currentResponses = {};
        let currentTools = [];

        setValidatedResponses(prevResponses => {
          const newResponses = { ...prevResponses, [toolName]: data.variables };
          currentResponses = newResponses;
          return newResponses;
        });

        setValidatedTools(prevTools => {
          const newTools = [...prevTools, toolName];
          currentTools = newTools;
          return newTools;
        });

        let nextToolName = null;
        let shouldCompleteDataCollection = false;

        setCurrentToolIndex(prevIndex => {
            const nextIndex = prevIndex + 1;
            if (nextIndex < currentToolFlow.length) {
                nextToolName = currentToolFlow[nextIndex];
            } else {
                shouldCompleteDataCollection = true;
            }
            return nextIndex;
        });

        // Ensure state updates are processed before proceeding
        await new Promise(resolve => setTimeout(resolve, 0));

        if (shouldCompleteDataCollection) {
            console.log("[validateToolAnswer] All tools processed. Proceeding to show options.");
            completeSetup(currentResponses, currentTools); // Pass the latest collected data
        } else if (nextToolName) {
            await fetchDynamicQuestion(nextToolName);
        } else {
            console.error("[validateToolAnswer] Error: Could not determine next step after validation.");
            addMessage("bot", "An unexpected error occurred processing the steps.");
            setIsLoading(false);
            setIsProcessingTools(false);
        }

      } else if (data.retry_exception) {
        addMessage("bot", data.retry_exception);
        setIsLoading(false);
      } else {
        addMessage("bot", `There was an issue with your answer for ${toolName}. Please try again.`);
        setIsLoading(false);
      }
    } catch (error) {
      console.error(`Error validating answer for ${toolName}:`, error);
      addMessage("bot", `Failed to validate your answer for ${toolName}: ${error.message}. Please try again.`);
      setIsLoading(false);
      setIsProcessingTools(false);
    }
  };

  // --- MODIFIED completeSetup ---
  const completeSetup = (responses, tools) => {
    console.log("Entering completeSetup function (Agent.js)...");
    addMessage("bot", "All inputs collected. Please choose your next step from the options below.");
    
    const validResponses = responses || {};
    const validTools = tools || [];

    console.log("Data collection complete. Tools:", JSON.stringify(validTools));
    console.log("Data collection complete. Responses:", JSON.stringify(validResponses));

    if (!validTools || validTools.length === 0) {
        console.error("completeSetup called with no validated tools. Cannot proceed.");
        addMessage("bot", "It seems no steps were successfully configured. Cannot proceed.");
        setIsLoading(false);
        setIsProcessingTools(false);
        setCurrentToolFlow([]);
        setCurrentToolIndex(0);
        setValidatedResponses({});
        setValidatedTools([]);
        setActiveButton(null); 
        setFormColor("");
        setShowPostCollectionOptions(false);
        return; 
    }

    setFinalizedValidatedResponses(validResponses);
    setFinalizedValidatedTools(validTools);
    
    setIsProcessingTools(false);
    setCurrentToolFlow([]); // Clear the flow as it's done
    setCurrentToolIndex(0);
    setShowPostCollectionOptions(true); // Show the new buttons
    setIsLoading(false); // Stop loading indicator
  };
  // --- End of MODIFIED completeSetup ---

  // --- New Button Handlers for Post-Collection Options ---
  const handleNavigateToReviewDashboard = () => {
    console.log("Navigating to /review-dashboard with data:", finalizedValidatedResponses, finalizedValidatedTools);
    setIsLoading(true); // Optional: show loading while navigating
    setShowPostCollectionOptions(false); // Hide buttons

    navigate('/review-dashboard', {
        state: {
            validatedResponses: finalizedValidatedResponses,
            validatedTools: finalizedValidatedTools,
            serviceType: activeButton 
        }
    });
    // Consider if a full chat reset is needed here or if the user might come "back"
    // For now, just hide options. If they come back, they might resume or start new.
    // startNewChat(); // If you want to force a new chat session after this action
  };

  const handleNavigateToMain = () => {
    console.log("Navigating to /main with data:", finalizedValidatedResponses, finalizedValidatedTools);
    setIsLoading(true); // Optional: show loading while navigating
    setShowPostCollectionOptions(false); // Hide buttons

    navigate('/main', {
        state: {
            validatedResponses: finalizedValidatedResponses,
            validatedTools: finalizedValidatedTools,
            serviceType: activeButton
        }
    });
    // startNewChat(); // If you want to force a new chat session after this action
  };


  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const loadChatHistory = (chatEntry) => {
    if (!chatEntry || !chatEntry.id || !chatEntry.messages) {
      console.error("Attempted to load invalid chat entry:", chatEntry);
      return;
    }
    console.log("Loading chat:", chatEntry.id, chatEntry.title);

    setCurrentChatId(chatEntry.id);
    setMessages(chatEntry.messages);
    setCurrentToolFlow([]);
    setCurrentToolIndex(0);
    setAwaitingConfirmation(false);
    setValidatedResponses({}); 
    setValidatedTools([]);   
    setIsProcessingTools(false);
    setIsLoading(false);
    setShowPostCollectionOptions(false); // Reset this when loading history
    // setFinalizedValidatedResponses({}); // Reset finalized data too
    // setFinalizedValidatedTools([]);

    let serviceRestored = false;
    if (chatEntry.serviceType === "CI/CD Setup") {
      setActiveButton("blue"); setFormColor("blue-form"); serviceRestored = true;
    } else if (chatEntry.serviceType === "Modify Resources") {
      setActiveButton("red"); setFormColor("red-form"); serviceRestored = true;
    } else if (chatEntry.serviceType === "Observability") {
      setActiveButton("green"); setFormColor("green-form"); serviceRestored = true;
    } else {
       setActiveButton(null); setFormColor("");
    }
    
    // Check if loaded chat was at the stage of showing post-collection options.
    // This logic depends on how you save the state in `updateChatInHistory`.
    // For now, we assume loading a chat resets to before post-collection options.
    // if (chatEntry.showPostCollectionOptions && chatEntry.finalizedValidatedTools?.length > 0) {
    //    setFinalizedValidatedResponses(chatEntry.finalizedValidatedResponses);
    //    setFinalizedValidatedTools(chatEntry.finalizedValidatedTools);
    //    setShowPostCollectionOptions(true);
    //    addMessage("bot", "Resumed: All inputs collected. Please choose your next step.");
    // }


    if (!serviceRestored && chatEntry.messages.length > 1) {
        setActiveButton("general"); 
        setFormColor("");
    }
    setIsSidebarOpen(false);
  };

  const startNewChat = () => {
    console.log("Starting new chat");
    setCurrentChatId(`chat-${Date.now()}`);
    setMessages([{ sender: "bot", text: "Hello, I am Acube! Let's Get Started!" }]);
    setActiveButton(null);
    setFormColor("");
    setCurrentToolFlow([]);
    setCurrentToolIndex(0);
    setAwaitingConfirmation(false);
    // setIsDeployReady(false); // Replaced
    setShowPostCollectionOptions(false);
    setFinalizedValidatedResponses({});
    setFinalizedValidatedTools([]);
    setIsSidebarOpen(false);
    setValidatedResponses({});
    setValidatedTools([]);
    setIsProcessingTools(false);
    setIsLoading(false);
  };

  const deleteChatHistory = (idToDelete, e) => {
    e.stopPropagation();
    console.log("Deleting chat:", idToDelete);
    setChatHistory(prevHistory => {
      const newHistory = prevHistory.filter(chat => chat.id !== idToDelete);
      if (newHistory.length > 0) {
          localStorage.setItem('acube-chat-history', JSON.stringify(newHistory));
      } else {
          localStorage.removeItem('acube-chat-history');
      }
      return newHistory;
    });

    if (currentChatId === idToDelete) {
        startNewChat(); 
    }
  };

  // --- JSX Return ---
  return (
    <div className="agent-fullscreen">
      <NavHead />

      <button className="sidebar-toggle-btn" onClick={toggleSidebar} title={isSidebarOpen ? "Close History" : "Open History"}>
        <FontAwesomeIcon icon={isSidebarOpen ? faTimes : faHistory} />
      </button>

      <Link to="/settings" className="settings-toggle-btn" title="Settings">
         <FontAwesomeIcon icon={faCog} />
      </Link>

      <div className={`chat-sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h3>Chat History</h3>
          <button className="new-chat-btn" onClick={startNewChat} title="Start New Chat"> New Chat </button>
        </div>
        <div className="sidebar-content">
          {chatHistory.length === 0 ? (
            <p className="no-history">No chat history yet</p>
          ) : (
            <ul className="history-list">
              {chatHistory.map(chat => (
                <li key={chat.id} onClick={() => loadChatHistory(chat)} className="history-item" title={`Load: ${chat.title}`}>
                  <div className="history-item-content">
                    <FontAwesomeIcon icon={faMessage} className="history-icon" />
                    <div className="history-details">
                      <span className="history-title">{chat.title || "Untitled Chat"}</span>
                      <span className="history-date">
                        {new Date(chat.timestamp).toLocaleDateString()} {new Date(chat.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                  <button className="delete-history-btn" onClick={(e) => deleteChatHistory(chat.id, e)} title="Delete conversation">
                    <FontAwesomeIcon icon={faTimes} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className={`agent-main ${isSidebarOpen ? 'sidebar-open' : ''}`}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="agent-container"
        >
          <Card className="agent-card">
            <Card.Body className="agent-card-body">
              <div ref={chatContainerRef} className="chat-messages-container">
                {messages.map((message, index) => (
                  <div
                    key={`${message.sender}-${index}-${message.text.substring(0, 10)}`}
                    className={`message ${message.sender === "bot" ? "bot-message" : "user-message"}`}
                  >
                    {message.sender === "bot" && (
                      <div className="bot-avatar"> <img src="/ChatBot-Logo.png" alt="Acube Bot" /> </div>
                    )}
                    <div className="message-content"> <div style={{ whiteSpace: 'pre-wrap' }}>{message.text}</div> </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="message bot-message">
                    <div className="bot-avatar"> <img src="/ChatBot-Logo.png" alt="Acube Bot Typing" /> </div>
                    <div className="message-content"> <div className="typing-indicator"> <span></span><span></span><span></span> </div> </div>
                  </div>
                )}
              </div>

              {/* Initial Button Options for Service Selection */}
              {!activeButton && messages.length === 1 && messages[0].text === "Hello, I am Acube! Let's Get Started!" && !showPostCollectionOptions && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="button-options"
                >
                  <button className={`agent-button agent-button-blue`} onClick={() => handleButtonClick("blue", "blue")}> CI/CD Setup </button>
                  <button className={`agent-button agent-button-red`} onClick={() => handleButtonClick("red", "red")}> Modify Resources </button>
                  <button className={`agent-button agent-button-green`} onClick={() => handleButtonClick("green", "green")}> Observability </button>
                </motion.div>
              )}

              {/* Post Data Collection Buttons */}
              {showPostCollectionOptions && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="button-options post-collection-options" // Add a new class for specific styling if needed
                >
                  <button
                    className={`agent-button agent-button-review`} // Define this class in your CSS
                    onClick={handleNavigateToReviewDashboard}
                    title="Review collected data before proceeding"
                  >
                    <FontAwesomeIcon icon={faClipboardList} /> Review Dashboard
                  </button>
                  <button
                    className={`agent-button agent-button-proceed`} // Define this class in your CSS
                    onClick={handleNavigateToMain}
                    title="Proceed directly to setup"
                  >
                    <FontAwesomeIcon icon={faCogs} /> Setup CI/CD
                  </button>
                </motion.div>
              )}
              
              {/* Input Form: Show if not loading, not showing post-collection options, and ( (service active) OR (general chat progressed beyond initial) ) */}
              { (activeButton || (messages.length > 1 && !isProcessingTools && !awaitingConfirmation)) && !showPostCollectionOptions && !isLoading && (
                 <div className={`chat-input-container ${formColor}`}>
                  <input
                    type="text"
                    ref={inputRef}
                    className="chat-input"
                    placeholder={isLoading ? "Acube is thinking..." : (awaitingConfirmation ? "Confirm plan (Yes/No)" : "Type your message...")}
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    disabled={isLoading} 
                    aria-label="Chat input"
                  />
                  <button
                     className="send-button"
                    onClick={handleSendMessage}
                    disabled={isLoading || !userInput.trim()}
                    title="Send Message"
                    aria-label="Send Message"
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