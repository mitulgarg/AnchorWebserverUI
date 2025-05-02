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
  faCog // Added faCog here as it was used but not imported
} from "@fortawesome/free-solid-svg-icons";
import { Link } from "react-router-dom";
// Removed unused faSave, faEye, faEyeSlash if they are not used elsewhere

const Agent = () => {
  // States for chat and UI
  const [formColor, setFormColor] = useState("");
  const [activeButton, setActiveButton] = useState(null);
  const [userInput, setUserInput] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDeployReady, setIsDeployReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);
  const [currentChatId, setCurrentChatId] = useState(() => Date.now()); // Use function for initial state if complex

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

  // Add a new state to track if we're processing tools
  const [isProcessingTools, setIsProcessingTools] = useState(false);

  // Refs
  const chatContainerRef = useRef(null);
  const inputRef = useRef(null);

  // Load chat history from localStorage on component mount
  useEffect(() => {
    const savedHistory = localStorage.getItem('acube-chat-history');
    if (savedHistory) {
      try {
        setChatHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Failed to parse chat history:", e);
        localStorage.removeItem('acube-chat-history'); // Clear corrupted history
      }
    }
  }, []);

  // --- fetchDynamicQuestion - (Modified slightly for clarity) ---
  const fetchDynamicQuestion = async (toolName) => {
    console.log(`Workspaceing question for tool: ${toolName}`);
    setIsLoading(true); // Show loading indicator while fetching
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
        // For Pass tools, skip asking and go straight to validation
        // Use await here to ensure handlePassTool completes before setIsLoading(false)
        await handlePassTool(toolName);
      } else {
        addMessage("bot", question);
        setIsLoading(false); // Hide loading only if we need user input
      }
    } catch (error) {
      console.error("Error fetching dynamic question:", error);
      addMessage("bot", `Failed to fetch the next question: ${error.message}. Please try again.`);
      setIsLoading(false); // Hide loading on error
      setIsProcessingTools(false); // Stop processing if question fails
    }
    // Note: setIsLoading(false) is handled within handlePassTool for the 'Pass' case
  };

  const handlePassTool = async (toolName) => {
    console.log(`Handling 'Pass' for tool: ${toolName}`);
    setIsLoading(true); // Keep loading true during auto-processing

    try {
       // Validate the tool with empty answer
       const validateResponse = await fetch(
           `http://localhost:8000/acube/answervalidator?tool_name=${encodeURIComponent(toolName)}&answer=`
       );
       if (!validateResponse.ok) {
          throw new Error(`HTTP error! status: ${validateResponse.status}`);
       }
       const data = await validateResponse.json();

       if (data.variables) {
           addMessage("bot", `Processing ${toolName} automatically...`);

           let finalResponses = {}; // To capture the state for completeSetup
           let finalTools = [];     // To capture the state for completeSetup

           // Queue state updates using functional form for responses and tools
           setValidatedResponses(prevResponses => {
             const newResponses = { ...prevResponses, [toolName]: data.variables };
             finalResponses = newResponses; // Capture for potential completion step
             console.log("Updated responses in handlePassTool:", newResponses);
             return newResponses;
           });

           setValidatedTools(prevTools => {
             const newTools = [...prevTools, toolName];
             finalTools = newTools; // Capture for potential completion step
             return newTools;
           });

           // Prepare for next step determination
           let nextToolName = null;
           let shouldCompleteSetup = false;

           // Atomically update the index and determine the *next* tool or completion
           setCurrentToolIndex(prevIndex => {
               const nextIndex = prevIndex + 1; // Calculate the index for the *next* step
               console.log(`[handlePassTool] Index updated from ${prevIndex} to ${nextIndex}`);

               if (nextIndex < currentToolFlow.length) {
                   // If there's a next tool in the flow
                   nextToolName = currentToolFlow[nextIndex];
                   console.log(`[handlePassTool] Determined next tool: ${nextToolName} at index ${nextIndex}`);
               } else {
                   // If this was the last tool
                   console.log("[handlePassTool] This was the last tool. Flagging for completion.");
                   shouldCompleteSetup = true;
               }
               return nextIndex; // Return the updated index for React state
           });

           // === Crucial Delay ===
           // Introduce a minimal delay using a Promise and setTimeout with 0ms.
           // This allows React's state updates (especially setCurrentToolIndex)
           // to be processed before we act on the 'nextToolName' or 'shouldCompleteSetup' flags.
           // It helps break potential race conditions in complex async flows.
           await new Promise(resolve => setTimeout(resolve, 0));
           // =====================

           // Now execute the next step based on the flags set during the index update
           if (shouldCompleteSetup) {
               console.log("[handlePassTool] Proceeding to complete setup...");
               setIsProcessingTools(false);
               setCurrentToolFlow([]); // Okay to clear flow now
                // Reset index explicitly for safety after completion or cancellation
               setCurrentToolIndex(0);

               // Pass the captured final state to completeSetup
               await completeSetup(finalResponses, finalTools);
               // Note: completeSetup handles setIsLoading(false) in its finally block

           } else if (nextToolName) {
               console.log(`[handlePassTool] Calling fetchDynamicQuestion for: ${nextToolName}`);
               await fetchDynamicQuestion(nextToolName); // fetchDynamicQuestion will handle setIsLoading
           } else {
               // Defensive coding: Should not happen if logic is correct
               console.error("[handlePassTool] Error: Could not determine next step after processing.");
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
 }; // --- End of handlePassTool ---


  // Save current chat to history whenever messages change
  useEffect(() => {
    if (messages.length > 1) { // Only update if there's more than the initial message
      updateChatInHistory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, currentChatId]); // Add currentChatId dependency

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
    } else {
      // Optional: Clear localStorage if history becomes empty
      localStorage.removeItem('acube-chat-history');
    }
  }, [chatHistory]);

  // Add a useEffect to monitor validatedResponses changes (for debugging)
  useEffect(() => {
    console.log("State validatedResponses updated:", validatedResponses);
  }, [validatedResponses]);

  // Handle key press for input
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !isLoading) { // Prevent sending while loading
      handleSendMessage();
    }
  };

  const updateChatInHistory = () => {
    let title = "New Conversation";
    const userMessages = messages.filter(m => m.sender === "user");
    if (userMessages.length > 0) {
      title = userMessages[0].text.substring(0, 30) + (userMessages[0].text.length > 30 ? "..." : "");
    } else if (messages.length > 1) {
        // Use first bot message (after initial) if no user message yet
        title = messages[1].text.substring(0, 30) + (messages[1].text.length > 30 ? "..." : "");
    }

    const updatedChat = {
      id: currentChatId,
      title: title,
      messages: [...messages],
      timestamp: new Date().toISOString(),
      serviceType: activeButton ?
                  (activeButton === "blue" ? "CI/CD Setup" :
                   activeButton === "red" ? "Modify Resources" :
                   activeButton === "green" ? "Observability" : "General") // Added green button case
                  : "General"
    };

    setChatHistory(prevHistory => {
      const existingIndex = prevHistory.findIndex(chat => chat.id === currentChatId);
      const newHistory = [...prevHistory];
      if (existingIndex >= 0) {
        newHistory[existingIndex] = updatedChat;
      } else {
        newHistory.push(updatedChat); // Add to end for new chats
      }
       // Sort history by timestamp descending (most recent first)
       newHistory.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      return newHistory;
    });
  };


  const addMessage = (sender, text) => {
    // Prevent adding empty messages
    if (!text || (typeof text === 'string' && !text.trim())) {
      console.warn("Attempted to add an empty message.");
      return;
    }
    setMessages(prevMessages => [...prevMessages, { sender, text }]);
  };

  const handleButtonClick = (color, buttonName) => {
    setFormColor(`${color}-form`); // Match input form class logic
    setActiveButton(buttonName);
    setIsDeployReady(false); // Reset deploy state if a new service is selected
    setMessages([{ sender: "bot", text: "Hello, I am Acube! Let's Get Started!" }]); // Reset messages for new service
    setCurrentChatId(Date.now()); // Start a new chat session ID

    const serviceName = buttonName === "blue" ? "CI/CD Setup" :
                        buttonName === "red" ? "Modify Resources" :
                        buttonName === "green" ? "Observability" : "Unknown Service"; // Added green button case

    // Add message for service selection *after* resetting messages
    addMessage("user", `Selected service: ${serviceName}`);

    // Bot asks for user input
    addMessage("bot", `Okay, starting ${serviceName}. Please describe what you want to achieve:`);
  };


  // Update handleSendMessage
  const handleSendMessage = async () => {
    if (!userInput.trim() || isLoading) return; // Prevent sending empty or while loading

    const message = userInput.trim();
    setUserInput(""); // Clear input immediately
    addMessage("user", message);
    setIsLoading(true); // Set loading true

    try {
      if (awaitingConfirmation) {
        const normalized = message.toLowerCase();
        if (normalized === "yes" || normalized === "y" || normalized === "confirm") {
          addMessage("bot", "Great! Let's get started with the setup.");
          setAwaitingConfirmation(false);
          setIsProcessingTools(true);
          // No setTimeout needed, startToolFlow will handle loading state
          await startToolFlow(); // Make startToolFlow async if it involves awaits
        } else {
          addMessage("bot", "Okay, plan cancelled. Please describe what you'd like to do instead.");
          setAwaitingConfirmation(false);
          setActiveButton(null); // Reset state to allow new selection or description
          setFormColor("");
           setIsLoading(false); // Stop loading as we are waiting for new input
        }
      } else if (isProcessingTools) {
        const currentTool = currentToolFlow[currentToolIndex];
        // validateToolAnswer will handle isLoading state internally
        await validateToolAnswer(currentTool, message);
      } else if (activeButton) {
        // Initial request after selecting service
        // getCICDPlan will handle isLoading state internally
        await getCICDPlan(message);
      } else {
         // General conversation or unexpected state
         addMessage("bot", "Please select a service first (CI/CD Setup, Modify Resources, Observability) or describe your goal.");
         setIsLoading(false); // Stop loading
      }
    } catch (error) {
      console.error("Error in handleSendMessage:", error);
      addMessage("bot", `An error occurred: ${error.message}`);
      setIsLoading(false); // Ensure loading is false on error
      // Consider resetting state if error is critical
      // setIsProcessingTools(false);
      // setAwaitingConfirmation(false);
    }
    // isLoading state is managed within the called async functions now
  };


  const getCICDPlan = async (userRequest) => {
     // setIsLoading(true) // Already set in handleSendMessage
     addMessage("bot", "Generating plan...");
     try {
         const serviceTypeParam = activeButton === "blue" ? "cicd" :
                                 activeButton === "red" ? "resource" :
                                 activeButton === "green" ? "observability" : "general"; // Added green case

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
             setValidatedTools([]); // Reset validated tools for new plan
             setValidatedResponses({}); // Reset responses for new plan
             setCurrentToolIndex(0); // Reset index for new plan

             addMessage("bot", "Here's my plan:\n\n" + data["Reasoning Steps"]);

             const toolsList = data["Tool Execution Order"].map((tool, index) =>
                 `${index + 1}. ${tool}`
             ).join('\n');

             addMessage("bot", `I'll execute the following tools in order:\n${toolsList}\n\nWould you like to proceed with this plan? (Yes/No)`);
             setAwaitingConfirmation(true);
         } else if (data["Credential Error"]) {
             addMessage("bot", "There seems to be an issue with your AWS credentials. Please make sure they're configured correctly via Settings.");
             setAwaitingConfirmation(false); // Cannot proceed
         } else {
             addMessage("bot", "Sorry, I couldn't generate a plan based on your request. Could you please provide more details or try rephrasing?");
             setAwaitingConfirmation(false); // Reset confirmation state
         }
     } catch (error) {
         console.error("Error getting plan:", error);
         addMessage("bot", `Failed to get plan: ${error.message}. Please check if the server is running and try again.`);
         setAwaitingConfirmation(false); // Reset confirmation state
     } finally {
         setIsLoading(false); // Stop loading after plan generation attempt
     }
  };

  // Make startToolFlow async to handle potential awaits inside fetchDynamicQuestion
  const startToolFlow = async () => {
    if (currentToolFlow.length > 0) {
      console.log("Starting tool flow...");
      // Reset state specific to a tool run
      setValidatedResponses({});
      setValidatedTools([]);
      setCurrentToolIndex(0);
      setIsProcessingTools(true); // Ensure this is set
      // Fetch the first question - fetchDynamicQuestion handles loading state
      await fetchDynamicQuestion(currentToolFlow[0]);
    } else {
        console.warn("startToolFlow called with empty currentToolFlow.");
        addMessage("bot", "Something went wrong, the execution plan is empty.");
        setIsProcessingTools(false);
        setIsLoading(false);
    }
  };

  // --- validateToolAnswer - (REVISED AGAIN to mirror handlePassTool fix) ---
  const validateToolAnswer = async (toolName, answer) => {
    addMessage("bot", `Processing your answer for ${toolName}...`);
    // setIsLoading(true); // Already set in handleSendMessage, or ensure it's set if called otherwise

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

        let finalResponses = {}; // To capture the state for completeSetup
        let finalTools = [];     // To capture the state for completeSetup

        // Queue state updates using functional form for responses and tools
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
          return newTools;
        });

        // Prepare for next step determination
        let nextToolName = null;
        let shouldCompleteSetup = false;

        // Atomically update the index and determine the *next* tool or completion
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
            return nextIndex; // Return the updated index
        });

        // === Crucial Delay ===
        await new Promise(resolve => setTimeout(resolve, 0));
        // =====================

        // Now execute the next step based on the flags
        if (shouldCompleteSetup) {
            console.log("[validateToolAnswer] Proceeding to complete setup...");
            setIsProcessingTools(false);
            setCurrentToolFlow([]);
            setCurrentToolIndex(0); // Reset index

             // Pass the captured final state
            await completeSetup(finalResponses, finalTools);
            // completeSetup handles setIsLoading(false)

        } else if (nextToolName) {
            console.log(`[validateToolAnswer] Calling fetchDynamicQuestion for: ${nextToolName}`);
            await fetchDynamicQuestion(nextToolName); // fetchDynamicQuestion handles setIsLoading
        } else {
            console.error("[validateToolAnswer] Error: Could not determine next step after validation.");
            addMessage("bot", "An unexpected error occurred processing the steps.");
            setIsLoading(false);
            setIsProcessingTools(false);
        }

      } else if (data.retry_exception) {
        addMessage("bot", data.retry_exception);
        setIsLoading(false); // Stop loading, waiting for user retry
      } else {
        addMessage("bot", `There was an issue with your answer for ${toolName}. Please try again.`);
        setIsLoading(false); // Stop loading, waiting for user retry
      }
    } catch (error) {
      console.error(`Error validating answer for ${toolName}:`, error);
      addMessage("bot", `Failed to validate your answer for ${toolName}: ${error.message}. Please try again.`);
      setIsLoading(false); // Stop loading on error
      setIsProcessingTools(false); // Stop processing flow on validation error
    }
  }; // --- End of validateToolAnswer ---


  // --- completeSetup - (Minor logging improvements) ---
  // Agent.js (Replace the entire existing completeSetup function with this one)

const completeSetup = async (responses = null, tools = null) => {
  console.log("Entering completeSetup function...");
  addMessage("bot", "Finalizing setup based on your inputs...");
  setIsLoading(true); // Set loading state

  // --- Reset state related to the interactive flow ---
  setIsProcessingTools(false);
  setCurrentToolFlow([]);
  setCurrentToolIndex(0);
  setIsDeployReady(false); // Default to not ready, set true only on full success

  // --- Determine the definitive list of responses and tools ---
  // Use provided parameters if they exist, otherwise fallback to component state
  // Clone objects/arrays to prevent unintended modifications to state
  const validResponses = responses ? { ...responses } : { ...validatedResponses };
  const validTools = tools ? [...tools] : [...validatedTools];

  console.log("completeSetup using tools:", JSON.stringify(validTools));
  console.log("completeSetup using responses:", JSON.stringify(validResponses));

  // --- Basic Input Validation ---
  if (!validTools || validTools.length === 0) {
      console.warn("completeSetup called with no validated tools. Aborting setup.");
      addMessage("bot", "It seems no steps were successfully configured. Cannot proceed with setup.");
      setIsLoading(false); // Turn off loading
      return; // Exit the function
  }

  if (!validResponses || Object.keys(validResponses).length === 0) {
      // Allow proceeding but log a warning, as some tools might not need responses (e.g., 'get-creds')
      console.warn("completeSetup called with tools but no validated responses. Proceeding cautiously.");
      // Optional: addMessage("bot", "Warning: Some required information might be missing.");
  }

  // --- Initialization ---
  const apiResults = {}; // Store results of each API call (success/failure)
  let workDir = '';       // Will be populated by analyzer
  let entrypoint = '';    // Will be populated by analyzer
  let appType = '';       // Will be populated by analyzer
  let pythonVersion = ''; // May come from 'dockerfile-gen' response or analyzer
  let folderPath = '';    // Crucial path, obtained from various tools

  // --- Tool to Endpoint Mapping ---
  // Ensure keys here EXACTLY match the tool names received in `validTools`
  const toolsToEndpoints = {
      'get-environments': { endpoint: 'get-environments' },
      'analyzer': { endpoint: 'analyzer' },
      'dockerfile-gen': { endpoint: 'dockerfile-gen' },
      'jenkinsfile-gen': { endpoint: 'jenkinsfile-gen' },
      'get-creds': { endpoint: 'creds' }, // Note the mapping
      'infra': { endpoint: 'infra' }
      // Add other mappings as needed
  };

  // --- Determine which endpoints need to be called ---
  const endpointsToCall = new Map(); // Using Map: endpointName -> toolName
  validTools.forEach(toolName => {
      if (toolsToEndpoints[toolName]) {
          const endpointName = toolsToEndpoints[toolName].endpoint;
          endpointsToCall.set(endpointName, toolName); // Map endpoint to the tool that triggered it
      } else {
          console.warn(`No endpoint mapping defined for validated tool: ${toolName}`);
      }
  });
  console.log("Endpoints determined to be called:", Array.from(endpointsToCall.keys()));

  // --- Execute API Calls Sequentially ---
  // Outer try/catch for general orchestration errors, finally ensures loading stops
  try {

      // --- Step 1: Get Environments (Optional, provides context) ---
      if (endpointsToCall.has('get-environments')) {
          const toolName = endpointsToCall.get('get-environments');
          const toolData = validResponses[toolName] || {}; // Use empty object if no data
          folderPath = toolData.folder_path || folderPath; // Update folderPath if available

          if (folderPath) {
              console.log(`Executing API call for: get-environments (Tool: ${toolName})`);
              addMessage("bot", "Fetching Python environment details...");
              try {
                  const response = await fetch(`http://localhost:8000/get-environments?folder_path=${encodeURIComponent(folderPath)}`);
                  if (!response.ok) {
                      throw new Error(`HTTP error ${response.status}`);
                  }
                  const data = await response.json();
                  console.log("API Response (get-environments):", data);
                  apiResults['get-environments'] = data; // Store result
                  if (!data.success) {
                      throw new Error(data.error || "Failed to fetch environments");
                  }
                  addMessage("bot", "Python environment details fetched.");
              } catch (error) {
                  console.error(`API Error (get-environments): ${error.message}`);
                  addMessage("bot", `Error fetching environments: ${error.message}`);
                  apiResults['get-environments'] = { success: false, error: error.message };
              }
          } else {
              console.warn(`Skipping get-environments: Missing folder_path for tool ${toolName}`);
              apiResults['get-environments'] = { success: false, error: "Missing folder_path input" };
          }
      }

      // --- Step 2: Analyzer (Crucial for many subsequent steps) ---
      let analyzerSucceeded = false; // Flag to check prerequisite for later steps
      if (endpointsToCall.has('analyzer')) {
          const toolName = endpointsToCall.get('analyzer');
          const toolData = validResponses[toolName] || {};
          folderPath = toolData.folder_path || folderPath; // Update folderPath again if available
          const environmentPath = toolData.environment_path; // Optional env path

          if (folderPath) {
              console.log(`Executing API call for: analyzer (Tool: ${toolName})`);
              addMessage("bot", "Analyzing project structure...");
              try {
                  const requestBody = { folder_path: folderPath };
                  if (environmentPath) {
                      requestBody.environment_path = environmentPath;
                  }
                  const response = await fetch("http://localhost:8000/analyzer", {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(requestBody)
                  });
                  if (!response.ok) {
                      throw new Error(`HTTP error ${response.status}`);
                  }
                  const data = await response.json();
                  console.log("API Response (analyzer):", data);
                  apiResults['analyzer'] = data; // Store result
                  if (!data.success) {
                      throw new Error(data.error || "Project analysis failed");
                  }
                  // Store critical info from successful analysis
                  workDir = data.work_dir;
                  entrypoint = data.entrypoint;
                  appType = data.app_type;
                  analyzerSucceeded = true; // Set flag
                  addMessage("bot", `Project analysis complete! App type: ${appType || 'Unknown'}.`);
              } catch (error) {
                  console.error(`API Error (analyzer): ${error.message}`);
                  addMessage("bot", `Error during project analysis: ${error.message}`);
                  apiResults['analyzer'] = { success: false, error: error.message };
              }
          } else {
              console.warn(`Skipping analyzer: Missing folder_path for tool ${toolName}`);
              addMessage("bot", "Cannot analyze project: Folder path is missing.");
              apiResults['analyzer'] = { success: false, error: "Missing folder_path input" };
          }
      }

      // --- Step 3: Dockerfile Generation (Depends on Analyzer) ---
      if (endpointsToCall.has('dockerfile-gen')) {
          if (analyzerSucceeded && appType && workDir && entrypoint) {
              const toolName = endpointsToCall.get('dockerfile-gen');
              const toolData = validResponses[toolName] || {};
              folderPath = toolData.folder_path || folderPath; // Ensure folder path is known
              pythonVersion = toolData.python_version || pythonVersion || '3.9'; // Get python version (provide default)

              if (folderPath) {
                  console.log(`Executing API call for: dockerfile-gen (Tool: ${toolName})`);
                  addMessage("bot", `Generating Dockerfile for ${appType}...`);
                  try {
                      const url = `http://localhost:8000/dockerfile-gen?app_type=${encodeURIComponent(appType)}` +
                                  `&python_version=${encodeURIComponent(pythonVersion)}` +
                                  `&work_dir=${encodeURIComponent(workDir)}` +
                                  `&entrypoint=${encodeURIComponent(entrypoint)}` +
                                  `&folder_path=${encodeURIComponent(folderPath)}`;
                      const response = await fetch(url);
                      if (!response.ok) {
                          throw new Error(`HTTP error ${response.status}`);
                      }
                      const data = await response.json();
                      console.log("API Response (dockerfile-gen):", data);
                      apiResults['dockerfile-gen'] = data;
                      if (!data.success) {
                          throw new Error(data.error || "Dockerfile generation failed");
                      }
                      addMessage("bot", "Dockerfile generated successfully!");
                  } catch (error) {
                      console.error(`API Error (dockerfile-gen): ${error.message}`);
                      addMessage("bot", `Error generating Dockerfile: ${error.message}`);
                      apiResults['dockerfile-gen'] = { success: false, error: error.message };
                  }
              } else {
                   console.warn(`Skipping dockerfile-gen: folder_path is missing (Tool: ${toolName})`);
                   apiResults['dockerfile-gen'] = { success: false, error: "Missing folder_path" };
              }
          } else {
              console.warn("Skipping dockerfile-gen: Prerequisites not met (analyzer success, appType, workDir, entrypoint).");
               apiResults['dockerfile-gen'] = { success: false, error: "Missing prerequisites from analyzer step" };
          }
      }

      // --- Step 4: Jenkinsfile Generation (Requires folder_path) ---
      if (endpointsToCall.has('jenkinsfile-gen')) {
          const toolName = endpointsToCall.get('jenkinsfile-gen');
          const toolData = validResponses[toolName] || {};
          folderPath = toolData.folder_path || folderPath; // Ensure folder path is known

          if (folderPath) {
              console.log(`Executing API call for: jenkinsfile-gen (Tool: ${toolName})`);
              addMessage("bot", "Generating Jenkinsfile...");
              try {
                   const url = `http://localhost:8000/jenkinsfile-gen?folder_path=${encodeURIComponent(folderPath)}`;
                   const response = await fetch(url);
                   if (!response.ok) {
                       throw new Error(`HTTP error ${response.status}`);
                   }
                   const data = await response.json();
                   console.log("API Response (jenkinsfile-gen):", data);
                   apiResults['jenkinsfile-gen'] = data;
                   if (!data.success) {
                       throw new Error(data.error || "Jenkinsfile generation failed");
                   }
                   addMessage("bot", "Jenkinsfile generated successfully!");
              } catch (error) {
                   console.error(`API Error (jenkinsfile-gen): ${error.message}`);
                   addMessage("bot", `Error generating Jenkinsfile: ${error.message}`);
                   apiResults['jenkinsfile-gen'] = { success: false, error: error.message };
              }
          } else {
              console.warn(`Skipping jenkinsfile-gen: Missing folder_path (Tool: ${toolName})`);
              apiResults['jenkinsfile-gen'] = { success: false, error: "Missing folder_path" };
          }
      }

      // --- Step 5: AWS Creds Check ---
      if (endpointsToCall.has('creds')) {
           const toolName = endpointsToCall.get('creds'); // Actually 'get-creds' tool maps to 'creds' endpoint
           console.log(`Executing API call for: creds (Tool: ${toolName})`);
           addMessage("bot", "Checking AWS credentials setup...");
           try {
               const response = await fetch("http://localhost:8000/creds");
               if (!response.ok) {
                   throw new Error(`HTTP error ${response.status}`);
               }
               const data = await response.json();
               console.log("API Response (creds):", data);
               apiResults['creds'] = data;
               if (!data.success) {
                   throw new Error(data.error || "Failed to retrieve/validate AWS credentials");
               }
               addMessage("bot", "AWS credentials checked successfully!");
           } catch (error) {
               console.error(`API Error (creds): ${error.message}`);
               addMessage("bot", `Error checking AWS credentials: ${error.message}`);
               apiResults['creds'] = { success: false, error: error.message };
           }
       }

      // --- Step 6: Infrastructure Generation (Depends on Analyzer) ---
      if (endpointsToCall.has('infra')) {
           if (analyzerSucceeded && workDir) {
               const toolName = endpointsToCall.get('infra');
               console.log(`Executing API call for: infra (Tool: ${toolName})`);
               addMessage("bot", "Generating infrastructure code (Terraform, Jenkins jobs)...");
               try {
                   const url = `http://localhost:8000/infra?work_dir=${encodeURIComponent(workDir)}`;
                   const response = await fetch(url);
                   if (!response.ok) {
                       throw new Error(`HTTP error ${response.status}`);
                   }
                   const data = await response.json();
                   console.log("API Response (infra):", data);
                   apiResults['infra'] = data;
                   if (!data.success) {
                       throw new Error(data.error || "Infrastructure generation failed");
                   }
                   addMessage("bot", "Infrastructure code generated successfully!");
               } catch (error) {
                   console.error(`API Error (infra): ${error.message}`);
                   addMessage("bot", `Error generating infrastructure: ${error.message}`);
                   apiResults['infra'] = { success: false, error: error.message };
               }
           } else {
               console.warn("Skipping infra: Prerequisites not met (analyzer success, workDir).");
               apiResults['infra'] = { success: false, error: "Missing prerequisites from analyzer step" };
           }
       }

      // --- If we reach here, the main orchestration try block completed ---
      console.log("All planned API calls attempted.");

  } catch (orchestrationError) {
      // Catch errors in the setup logic itself (e.g., programming errors above)
      console.error("Critical error during completeSetup orchestration:", orchestrationError);
      addMessage("bot", `A critical error occurred during the setup process: ${orchestrationError.message}.`);
      // apiResults might be incomplete, but we'll still proceed to finally and summary
  } finally {
      // --- This block always runs, whether try succeeded or failed ---
      console.log("Executing finally block of completeSetup.");
      console.log("Final API Results state:", JSON.stringify(apiResults));

      // --- Final Summary based on apiResults ---
      const executedEndpointNames = Object.keys(apiResults);

      if (executedEndpointNames.length > 0) {
          const successfulEndpoints = executedEndpointNames.filter(name => apiResults[name]?.success === true);
          const failedEndpoints = executedEndpointNames.filter(name => apiResults[name]?.success === false);

          if (failedEndpoints.length === 0 && successfulEndpoints.length === executedEndpointNames.length) {
              // All executed APIs succeeded
               const completedSteps = successfulEndpoints.map(name => name).join(', '); // Simple list of names
               addMessage("bot", `Success! All setup steps completed: ${completedSteps}. Your application environment is ready!`);
               setIsDeployReady(true); // Set ready for deploy button
          } else {
              // Some or all APIs failed
               const failedStepsList = failedEndpoints.map(name => `${name} (${apiResults[name]?.error || 'Unknown error'})`).join(', ');
               const successStepsList = successfulEndpoints.join(', ') || 'None';
               addMessage("bot", `Setup finished. Successful steps: ${successStepsList}. Failed steps: ${failedStepsList}.`);
               setIsDeployReady(false); // Not fully ready
          }
      } else if (endpointsToCall.size > 0) {
          // We intended to call endpoints, but apiResults is empty (likely hit the outer catch early)
           addMessage("bot", "Setup process could not be completed due to an early critical error.");
           setIsDeployReady(false);
      } else {
          // No endpoints were determined to be called based on the plan
          addMessage("bot", "No setup steps were executed based on the provided plan.");
          setIsDeployReady(false);
      }

      // Ensure loading is turned off *after* summary message and state is set
      setIsLoading(false);
      console.log("Exiting completeSetup function.");
  } // End finally block

}; // End of completeSetup function definition


  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const loadChatHistory = (chatEntry) => {
    if (!chatEntry || !chatEntry.id || !chatEntry.messages) {
      console.error("Attempted to load invalid chat entry:", chatEntry);
      return;
    }

    console.log("Loading chat:", chatEntry.id, chatEntry.title);
    // Start a new conversation based on the history
    setCurrentChatId(chatEntry.id);
    setMessages(chatEntry.messages);

    // Reset the current interaction state
    setCurrentToolFlow([]);
    setCurrentToolIndex(0);
    setAwaitingConfirmation(false);
    setValidatedResponses({});
    setValidatedTools([]);
    setIsProcessingTools(false);
    setIsLoading(false); // Ensure loading is off when loading history

    // Restore service type and form color
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

    // Check if this conversation was completed (heuristic)
    const lastMessage = chatEntry.messages[chatEntry.messages.length - 1];
    // Improved check for success message
    if (lastMessage && lastMessage.sender === 'bot' && lastMessage.text.toLowerCase().startsWith("success!")) {
        setIsDeployReady(true);
    } else {
        setIsDeployReady(false);
    }

    // If no service was restored but messages exist beyond initial, show input
    if (!serviceRestored && chatEntry.messages.length > 1) {
        setActiveButton("general"); // Use a generic active state if needed
        setFormColor(""); // Default form color
    }


    setIsSidebarOpen(false); // Close sidebar after loading
  };

  const startNewChat = () => {
    console.log("Starting new chat");
    setCurrentChatId(Date.now());
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
    setIsLoading(false); // Ensure loading is off
  };

  const deleteChatHistory = (idToDelete, e) => {
    e.stopPropagation(); // Prevent loading the chat when clicking delete
    console.log("Deleting chat:", idToDelete);
    setChatHistory(prevHistory => {
      const newHistory = prevHistory.filter(chat => chat.id !== idToDelete);
      // Update localStorage immediately
      if (newHistory.length > 0) {
          localStorage.setItem('acube-chat-history', JSON.stringify(newHistory));
      } else {
          localStorage.removeItem('acube-chat-history');
      }
      return newHistory;
    });

    // If the deleted chat was the currently active one, start a new chat
    if (currentChatId === idToDelete) {
        startNewChat();
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
                        {new Date(chat.timestamp).toLocaleDateString()} {new Date(chat.timestamp).toLocaleTimeString()}
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
          transition={{ duration: 0.5 }} // Slightly faster transition
          className="agent-container"
        >
          <Card className="agent-card">
            <Card.Body className="agent-card-body">
              {/* Chat Messages Area */}
              <div ref={chatContainerRef} className="chat-messages-container">
                {messages.map((message, index) => (
                  <div
                    key={index} // Use index as key is okay if list isn't reordered, but prefer unique ID if possible
                    className={`message ${message.sender === "bot" ? "bot-message" : "user-message"}`}
                  >
                    {message.sender === "bot" && (
                      <div className="bot-avatar">
                        {/* Ensure the path to your logo is correct relative to the public folder */}
                        <img src="/ChatBot-Logo.png" alt="Acube Bot" />
                      </div>
                    )}
                    <div className="message-content">
                       {/* Using pre-wrap to preserve newlines from backend */}
                       <div style={{ whiteSpace: 'pre-wrap' }}>{message.text}</div>
                    </div>
                  </div>
                ))}

                {isLoading && (
                  <div className="message bot-message"> {/* Typing indicator styled as a bot message */}
                    <div className="bot-avatar">
                      <img src="/ChatBot-Logo.png" alt="Acube Bot Typing" />
                    </div>
                    <div className="message-content">
                        <div className="typing-indicator">
                        <span></span>
                        <span></span>
                        <span></span>
                        </div>
                    </div>
                  </div>
                )}
              </div> {/* End chat-messages-container */}

              {/* Button Options (only show if no service selected and messages array is just the initial one) */}
              {!activeButton && messages.length === 1 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }} // Less dramatic entry
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="button-options"
                >
                  <button
                    className={`agent-button agent-button-blue ${activeButton === "blue" ? "active" : ""}`} // Added base class
                    onClick={() => handleButtonClick("blue", "blue")}
                  >
                    CI/CD Setup
                  </button>
                  <button
                    className={`agent-button agent-button-red ${activeButton === "red" ? "active" : ""}`} // Added base class
                    onClick={() => handleButtonClick("red", "red")}
                  >
                    Modify Resources
                  </button>
                  <button
                    className={`agent-button agent-button-green ${activeButton === "green" ? "active" : ""}`} // Added base class
                    onClick={() => handleButtonClick("green", "green")}
                  >
                    Observability
                  </button>
                </motion.div>
              )}

              {/* Deploy Button (conditionally rendered) */}
              {isDeployReady && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="deploy-button-container"
                >
                  {/* Link might need adjustment based on where /main leads */}
                  <Link to="/main" className="deploy-button-link">
                    <button className="deploy-button">
                      View/Deploy Setup <FontAwesomeIcon icon={faArrowRight} />
                    </button>
                  </Link>
                </motion.div>
              )}

              {/* Input Form (show if a service is active OR conversation started, but not deploy ready) */}
              {activeButton && !isDeployReady && (
                 <div className={`chat-input-container ${formColor}`}> {/* Apply color class here */}
                  <input
                    type="text"
                    ref={inputRef}
                    className="chat-input" // Removed formColor from here, handled by parent
                    placeholder={isLoading ? "Acube is thinking..." : "Type your message..."}
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    // --- CHANGE THIS LINE ---
                    disabled={isLoading} // Only disable when isLoading is true
                    // --- END CHANGE ---
                    aria-label="Chat input"
                  />
                  <button
                     className="send-button" // Removed formColor from here, handled by parent
                    onClick={handleSendMessage}
                    // Keep this button logic - disable if loading OR input is empty
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
      </div> {/* End agent-main */}
    </div> // End agent-fullscreen
  );
};

export default Agent;