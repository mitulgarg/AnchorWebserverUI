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
  faCog
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
  const [isDeployReady, setIsDeployReady] = useState(false); // State for showing the 'View/Deploy' button
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
      // Add state relevant for resuming later, e.g., if deploy was ready
      // isDeployReady: isDeployReady // Persist deploy readiness state
    };

    setChatHistory(prevHistory => {
      const existingIndex = prevHistory.findIndex(chat => chat.id === currentChatId);
      const newHistory = [...prevHistory];
      if (existingIndex >= 0) {
        newHistory[existingIndex] = updatedChat;
      } else {
        // Add new entry and ensure it's at the top if sorting is descending
        newHistory.push(updatedChat);
      }
       // Sort history by timestamp descending (most recent first)
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
        await handlePassTool(toolName); // handlePassTool handles loading state internally
      } else {
        addMessage("bot", question);
        setIsLoading(false); // Stop loading, wait for user input
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
    setIsLoading(true); // Keep loading during auto-processing

    try {
       const validateResponse = await fetch(
           `http://localhost:8000/acube/answervalidator?tool_name=${encodeURIComponent(toolName)}&answer=` // Empty answer for 'Pass'
       );
       if (!validateResponse.ok) {
          throw new Error(`HTTP error! status: ${validateResponse.status}`);
       }
       const data = await validateResponse.json();

       if (data.variables) {
           addMessage("bot", `Processing ${toolName} automatically...`);

           let finalResponses = {};
           let finalTools = [];

           setValidatedResponses(prevResponses => {
             const newResponses = { ...prevResponses, [toolName]: data.variables };
             finalResponses = newResponses; // Capture for completion step
             console.log("Updated responses in handlePassTool:", newResponses);
             return newResponses;
           });

           setValidatedTools(prevTools => {
             const newTools = [...prevTools, toolName];
             finalTools = newTools; // Capture for completion step
              console.log("Updated tools in handlePassTool:", newTools);
             return newTools;
           });

           let nextToolName = null;
           let shouldCompleteSetup = false;

           setCurrentToolIndex(prevIndex => {
               const nextIndex = prevIndex + 1;
               console.log(`[handlePassTool] Index updated from ${prevIndex} to ${nextIndex}`);

               if (nextIndex < currentToolFlow.length) {
                   nextToolName = currentToolFlow[nextIndex];
                   console.log(`[handlePassTool] Determined next tool: ${nextToolName} at index ${nextIndex}`);
               } else {
                   console.log("[handlePassTool] This was the last tool. Flagging for completion.");
                   shouldCompleteSetup = true;
               }
               return nextIndex;
           });

           await new Promise(resolve => setTimeout(resolve, 0)); // Ensure state updates propagate

           if (shouldCompleteSetup) {
               console.log("[handlePassTool] Proceeding to complete setup (navigate)...");
               // No longer setting isProcessingTools false here, handled in completeSetup
               // No longer setting currentToolFlow/Index here, handled in completeSetup
               completeSetup(finalResponses, finalTools); // Navigate
               // setIsLoading(false) will be handled by navigation or if completeSetup errors before nav

           } else if (nextToolName) {
               console.log(`[handlePassTool] Calling fetchDynamicQuestion for: ${nextToolName}`);
               await fetchDynamicQuestion(nextToolName); // Continues the flow, fetch handles loading
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
    if (e.key === 'Enter' && !isLoading) {
      handleSendMessage();
    }
  };

  const handleButtonClick = (color, buttonName) => {
    startNewChat(); // Start a fresh state for the new service

    setFormColor(`${color}-form`);
    setActiveButton(buttonName);

    const serviceName = buttonName === "blue" ? "CI/CD Setup" :
                        buttonName === "red" ? "Modify Resources" :
                        buttonName === "green" ? "Observability" : "Unknown Service";

    // Add messages *after* resetting state
    setMessages([ // Reset messages completely
       { sender: "bot", text: "Hello, I am Acube! Let's Get Started!" },
       { sender: "user", text: `Selected service: ${serviceName}` },
       { sender: "bot", text: `Okay, starting ${serviceName}. Please describe what you want to achieve:` }
    ]);

    // Focus input field after selection
    inputRef.current?.focus();
  };

  const handleSendMessage = async () => {
    if (!userInput.trim() || isLoading) return;

    const message = userInput.trim();
    setUserInput("");
    addMessage("user", message);
    setIsLoading(true); // Set loading true

    try {
      if (awaitingConfirmation) {
        const normalized = message.toLowerCase();
        if (normalized === "yes" || normalized === "y" || normalized === "confirm") {
          addMessage("bot", "Great! Let's get started with the setup.");
          setAwaitingConfirmation(false);
          // Removed direct call to startToolFlow, let getCICDPlan handle it if needed
          // await startToolFlow(); // Start processing tools
          // Let's rethink: Confirmation means we *start* the flow now.
          setIsProcessingTools(true);
          await startToolFlow(); // Start the flow after 'yes'

        } else {
          addMessage("bot", "Okay, plan cancelled. Please describe what you'd like to do instead, or select a service.");
          setAwaitingConfirmation(false);
          setActiveButton(null); // Reset state
          setFormColor("");
          setCurrentToolFlow([]); // Clear plan
          setIsLoading(false); // Stop loading
        }
      } else if (isProcessingTools) {
        const currentTool = currentToolFlow[currentToolIndex];
        await validateToolAnswer(currentTool, message); // Validate the answer
      } else if (activeButton) {
        // Initial request for the selected service
        await getCICDPlan(message); // Get the plan
      } else {
         // General conversation or initial state without service selected
         addMessage("bot", "Please select a service (CI/CD Setup, Modify Resources, Observability) or describe your goal if you have selected one.");
         setIsLoading(false); // Stop loading
      }
    } catch (error) {
      console.error("Error in handleSendMessage:", error);
      addMessage("bot", `An error occurred: ${error.message}`);
      setIsLoading(false);
      // Reset states on major error
      setIsProcessingTools(false);
      setAwaitingConfirmation(false);
      setCurrentToolFlow([]);
      setCurrentToolIndex(0);
    }
  };

  const getCICDPlan = async (userRequest) => {
     // isLoading is already true from handleSendMessage
     addMessage("bot", "Generating plan...");
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
             setValidatedTools([]); // Reset for new plan
             setValidatedResponses({}); // Reset for new plan
             setCurrentToolIndex(0); // Reset for new plan

             addMessage("bot", "Here's my plan:\n\n" + data["Reasoning Steps"]);

             const toolsList = data["Tool Execution Order"].map((tool, index) =>
                 `${index + 1}. ${tool}`
             ).join('\n');

             addMessage("bot", `I'll execute the following tools in order:\n${toolsList}\n\nWould you like to proceed with this plan? (Yes/No)`);
             setAwaitingConfirmation(true);
             setIsLoading(false); // Stop loading, wait for confirmation
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
     // Removed finally block for isLoading, handled within try/catch now
  };

  const startToolFlow = async () => {
    if (currentToolFlow.length > 0) {
      console.log("Starting tool flow...");
      // Reset responses/tools specific to this run (already done in getCICDPlan potentially, but safe to repeat)
      setValidatedResponses({});
      setValidatedTools([]);
      setCurrentToolIndex(0);
      setIsProcessingTools(true); // Ensure this is set
      await fetchDynamicQuestion(currentToolFlow[0]); // Fetch first question, handles loading state
    } else {
        console.warn("startToolFlow called with empty currentToolFlow.");
        addMessage("bot", "Something went wrong, the execution plan is empty.");
        setIsProcessingTools(false);
        setIsLoading(false);
    }
  };

  const validateToolAnswer = async (toolName, answer) => {
    // isLoading is already true from handleSendMessage
    addMessage("bot", `Processing your answer for ${toolName}...`);

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

        let finalResponses = {};
        let finalTools = [];

        setValidatedResponses(prevResponses => {
          const newResponses = { ...prevResponses, [toolName]: data.variables };
          finalResponses = newResponses;
          console.log(`Tool ${toolName} validated successfully:`, data.variables);
          console.log("Updated responses in validateToolAnswer:", newResponses);
          return newResponses;
        });

        setValidatedTools(prevTools => {
          const newTools = [...prevTools, toolName];
          finalTools = newTools;
           console.log("Updated tools in validateToolAnswer:", newTools);
          return newTools;
        });

        let nextToolName = null;
        let shouldCompleteSetup = false;

        setCurrentToolIndex(prevIndex => {
            const nextIndex = prevIndex + 1;
            console.log(`[validateToolAnswer] Index updated from ${prevIndex} to ${nextIndex}`);

            if (nextIndex < currentToolFlow.length) {
                nextToolName = currentToolFlow[nextIndex];
                console.log(`[validateToolAnswer] Determined next tool: ${nextToolName} at index ${nextIndex}`);
            } else {
                console.log("[validateToolAnswer] This was the last tool. Flagging for completion.");
                shouldCompleteSetup = true;
            }
            return nextIndex;
        });

        await new Promise(resolve => setTimeout(resolve, 0)); // Ensure state updates propagate

        if (shouldCompleteSetup) {
            console.log("[validateToolAnswer] Proceeding to complete setup (navigate)...");
            // No longer setting isProcessingTools false here, handled in completeSetup
            // No longer setting currentToolFlow/Index here, handled in completeSetup
            completeSetup(finalResponses, finalTools); // Navigate
            // setIsLoading(false) will be handled by navigation or if completeSetup errors before nav

        } else if (nextToolName) {
            console.log(`[validateToolAnswer] Calling fetchDynamicQuestion for: ${nextToolName}`);
            await fetchDynamicQuestion(nextToolName); // Continues the flow, fetch handles loading
        } else {
            console.error("[validateToolAnswer] Error: Could not determine next step after validation.");
            addMessage("bot", "An unexpected error occurred processing the steps.");
            setIsLoading(false);
            setIsProcessingTools(false);
        }

      } else if (data.retry_exception) {
        addMessage("bot", data.retry_exception); // Ask user to retry
        setIsLoading(false); // Stop loading, wait for user retry
      } else {
        addMessage("bot", `There was an issue with your answer for ${toolName}. Please try again.`);
        setIsLoading(false); // Stop loading, wait for user retry
      }
    } catch (error) {
      console.error(`Error validating answer for ${toolName}:`, error);
      addMessage("bot", `Failed to validate your answer for ${toolName}: ${error.message}. Please try again.`);
      setIsLoading(false);
      setIsProcessingTools(false); // Stop flow on validation error
    }
  };

  // --- MODIFIED completeSetup ---
  // This function now ONLY navigates to Main.js, passing the collected data.
  const completeSetup = (responses, tools) => {
    console.log("Entering completeSetup function (Agent.js)...");
    addMessage("bot", "All inputs collected. Proceeding to setup execution...");
    setIsLoading(true); // Show loading briefly while preparing navigation

    // Use the passed arguments directly as they represent the final state
    const validResponses = responses || {};
    const validTools = tools || [];

    console.log("CompleteSetup preparing to navigate with tools:", JSON.stringify(validTools));
    console.log("CompleteSetup preparing to navigate with responses:", JSON.stringify(validResponses));

    // Basic Check: Ensure there are tools to execute
    if (!validTools || validTools.length === 0) {
        console.error("completeSetup called with no validated tools. Cannot navigate.");
        addMessage("bot", "It seems no steps were successfully configured. Cannot proceed.");
        // Reset states as the flow is broken
        setIsLoading(false);
        setIsProcessingTools(false);
        setCurrentToolFlow([]);
        setCurrentToolIndex(0);
        setValidatedResponses({});
        setValidatedTools([]);
        setActiveButton(null); // Go back to service selection maybe?
        setFormColor("");
        return; // Stop here
    }

    // Reset agent's processing state before navigating away
    setIsProcessingTools(false);
    setCurrentToolFlow([]);
    setCurrentToolIndex(0);
    // Optionally clear validatedResponses/Tools from Agent state now,
    // as they are being passed to Main.js. Keep if needed for history reload.
    // setValidatedResponses({});
    // setValidatedTools([]);


    // --- Navigate to Main.js ---
    // Pass the collected tools and responses via location state
    try {
        console.log("Navigating to /main...");
        navigate('/main', {
            state: {
                validatedResponses: validResponses,
                validatedTools: validTools,
                // Optional: Pass other context if needed by Main.js
                // serviceType: activeButton // Example: 'blue', 'red', 'green'
            }
        });
        // setIsLoading(false); // Navigation will unmount or change view, loading state might not matter after this point.
    } catch (navError) {
        console.error("Navigation error:", navError);
        addMessage("bot", "Error trying to proceed to the setup screen.");
        setIsLoading(false); // Stop loading if navigation fails
    }
  }; // --- End of MODIFIED completeSetup ---


  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const loadChatHistory = (chatEntry) => {
    if (!chatEntry || !chatEntry.id || !chatEntry.messages) {
      console.error("Attempted to load invalid chat entry:", chatEntry);
      return;
    }

    console.log("Loading chat:", chatEntry.id, chatEntry.title);

    // --- Reset all interactive states ---
    setCurrentChatId(chatEntry.id);
    setMessages(chatEntry.messages);
    setCurrentToolFlow([]);
    setCurrentToolIndex(0);
    setAwaitingConfirmation(false);
    setValidatedResponses({}); // Clear previous run's data
    setValidatedTools([]);   // Clear previous run's data
    setIsProcessingTools(false);
    setIsLoading(false);
    setIsDeployReady(false); // Reset deploy ready state, determine based on loaded chat below

    // --- Restore service type and form color from history ---
    let serviceRestored = false;
    if (chatEntry.serviceType === "CI/CD Setup") {
      setActiveButton("blue");
      setFormColor("blue-form");
      serviceRestored = true;
    } else if (chatEntry.serviceType === "Modify Resources") {
      setActiveButton("red");
      setFormColor("red-form");
      serviceRestored = true;
    } else if (chatEntry.serviceType === "Observability") {
      setActiveButton("green");
      setFormColor("green-form");
      serviceRestored = true;
    } else {
       setActiveButton(null);
       setFormColor("");
    }

    // --- Determine if the loaded chat represents a completed setup ---
    // Check if the *last* message indicates success AND we are NOT currently processing tools.
    // This check might need refinement based on how `Main.js` signals completion back to `Agent.js` (if it does).
    // For now, we assume loading history means we *aren't* mid-execution.
    const lastMessage = chatEntry.messages[chatEntry.messages.length - 1];
    // A more robust check might involve looking for the navigation trigger message or a specific success marker saved in history.
    if (lastMessage && lastMessage.sender === 'bot' && lastMessage.text.startsWith("All inputs collected.")) {
        // Heuristic: If the last message was the one *before* navigating, assume setup *might* be complete or viewable.
        // This button's purpose might need redefining - maybe it should re-run the navigation?
        // Setting isDeployReady based on past history is tricky. Let's keep it false on load for now.
        // setIsDeployReady(true);
        setIsDeployReady(false); // Safer default on load
        console.log("Loaded chat ended before potential execution phase.");
    } else {
         setIsDeployReady(false);
    }

    // If no service was restored but messages exist beyond initial, potentially set a general active state
    if (!serviceRestored && chatEntry.messages.length > 1) {
        setActiveButton("general"); // Or keep null depending on desired UX
        setFormColor("");
    }


    setIsSidebarOpen(false); // Close sidebar after loading
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
    setIsDeployReady(false);
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
        startNewChat(); // Start fresh if the active chat was deleted
    }
  };

  // --- JSX Return ---
  return (
    <div className="agent-fullscreen">
      <NavHead />

      {/* Sidebar Toggle Button */}
      <button
        className="sidebar-toggle-btn"
        onClick={toggleSidebar}
        title={isSidebarOpen ? "Close History" : "Open History"}
      >
        <FontAwesomeIcon icon={isSidebarOpen ? faTimes : faHistory} />
      </button>

      {/* Settings Button */}
      <Link to="/settings" className="settings-toggle-btn" title="Settings">
         <FontAwesomeIcon icon={faCog} />
      </Link>


      {/* Sidebar */}
      <div className={`chat-sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h3>Chat History</h3>
          <button className="new-chat-btn" onClick={startNewChat} title="Start New Chat">
            New Chat
          </button>
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
          transition={{ duration: 0.5 }}
          className="agent-container"
        >
          <Card className="agent-card">
            <Card.Body className="agent-card-body">
              {/* Chat Messages Area */}
              <div ref={chatContainerRef} className="chat-messages-container">
                {messages.map((message, index) => (
                  <div
                    // Using a combination of index and sender for slightly better key, though not ideal if messages are ever inserted/deleted mid-list. ID would be best.
                    key={`${message.sender}-${index}-${message.text.substring(0, 10)}`}
                    className={`message ${message.sender === "bot" ? "bot-message" : "user-message"}`}
                  >
                    {message.sender === "bot" && (
                      <div className="bot-avatar">
                        <img src="/ChatBot-Logo.png" alt="Acube Bot" />
                      </div>
                    )}
                    <div className="message-content">
                       <div style={{ whiteSpace: 'pre-wrap' }}>{message.text}</div>
                    </div>
                  </div>
                ))}

                {isLoading && (
                  <div className="message bot-message"> {/* Typing indicator */}
                    <div className="bot-avatar">
                      <img src="/ChatBot-Logo.png" alt="Acube Bot Typing" />
                    </div>
                    <div className="message-content">
                        <div className="typing-indicator">
                        <span></span><span></span><span></span>
                        </div>
                    </div>
                  </div>
                )}
              </div> {/* End chat-messages-container */}

              {/* Button Options */}
              {/* Show if no service selected AND it's the initial message state */}
               {!activeButton && messages.length === 1 && messages[0].text === "Hello, I am Acube! Let's Get Started!" && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="button-options"
                >
                  <button
                    className={`agent-button agent-button-blue`}
                    onClick={() => handleButtonClick("blue", "blue")}
                  >
                    CI/CD Setup
                  </button>
                  <button
                    className={`agent-button agent-button-red`}
                    onClick={() => handleButtonClick("red", "red")}
                  >
                    Modify Resources
                  </button>
                  <button
                    className={`agent-button agent-button-green`}
                    onClick={() => handleButtonClick("green", "green")}
                  >
                    Observability
                  </button>
                </motion.div>
              )}

              {/* Deploy Button -> Removed as setup happens in Main.js */}
              {/* {isDeployReady && ( ... )} */}

               {/* Input Form */}
               {/* Show input if a service button is active OR if it's a general chat that has progressed beyond the initial message */}
               {(activeButton || (messages.length > 1 && !isProcessingTools && !awaitingConfirmation)) && !isDeployReady && (
                 <div className={`chat-input-container ${formColor}`}>
                  <input
                    type="text"
                    ref={inputRef}
                    className="chat-input"
                    placeholder={isLoading ? "Acube is thinking..." : (awaitingConfirmation ? "Confirm plan (Yes/No)" : "Type your message...")}
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    disabled={isLoading} // Disable only when actively loading/processing
                    aria-label="Chat input"
                  />
                  <button
                     className="send-button"
                    onClick={handleSendMessage}
                    disabled={isLoading || !userInput.trim()} // Disable if loading OR input empty
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
      </div> {/* End agent-main */}
    </div> // End agent-fullscreen
  );
};

export default Agent;