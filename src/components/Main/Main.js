import React, { useState, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import "./Main.css";
import PipelineCard from "./PipelineCard/PipelineCard.js";
import { useSpring, animated } from "react-spring";
import NavHead from "../Home/NavHead/NavHead.js";
import axios from "axios";
import { motion } from "framer-motion";

// --- Define the mapping from Tool Name to API details and Card ID ---
const toolEndpointMap = {
    'analyzer': {
        endpoint: 'http://localhost:8000/analyzer',
        cardId: 1,
        method: 'POST',
        requiresParams: ['folder_path', 'environment_path'], // environment_path is optional
        providesResultKeys: ['work_dir', 'entrypoint', 'app_type']
    },
    'get-creds': {
        endpoint: 'http://localhost:8000/creds',
        cardId: 2,
        method: 'GET',
        requiresParams: [],
    },
    'dockerfile-gen': {
        endpoint: 'http://localhost:8000/dockerfile-gen',
        cardId: 3,
        method: 'GET',
        requiresParams: ['app_type', 'python_version', 'work_dir', 'entrypoint', 'folder_path'] // Added python_version based on Agent.js logic implicitly needing it sometimes? Verify if needed.
    },
    'jenkinsfile-gen': {
        endpoint: 'http://localhost:8000/jenkinsfile-gen',
        cardId: 3,
        method: 'GET',
        requiresParams: ['folder_path']
    },
    'infra': {
        endpoint: 'http://localhost:8000/infra',
        cardId: 4, // Primarily Infra setup
        // cardId: 5, // Also Jenkins setup - Handled explicitly later
        method: 'GET', // Assuming GET based on Agent, verify if POST is needed
        requiresParams: ['work_dir'] // Example, verify required params
    },
    'get-environments': {
        endpoint: 'http://localhost:8000/get-environments',
        cardId: 1, // Related to analysis
        method: 'GET',
        requiresParams: ['folder_path'],
        providesResultKeys: ['python_versions'] // Added based on sample response
    }
};

// --- Define the base visual card data ---
const baseCardData = [
    { id: 1, task: "Analyzing Tech Stack", desc: `Generating requirements.txt and finding out about application type.` },
    { id: 2, task: `Retrieval of Credentials`, desc: `Retrieving AWS and Github credentials.` },
    { id: 3, task: `Gen AI Script Generation`, desc: `Generating Dockerfile, Jenkinsfile and Terraform files.` },
    { id: 4, task: `Setting up AWS Infrastructure`, desc: `Setting up Infra (e.g., EC2, networking) on AWS.` },
    { id: 5, task: `Setting up Jenkins CI/CD Job`, desc: `Creating your custom job on Jenkins.` },
];


const Main = () => {
    const { state } = useLocation();
    // Safely extract data - Use stable empty objects/arrays as defaults
    const validatedResponses = state?.validatedResponses || {};
    const validatedTools = state?.validatedTools || [];

    // Animation props
    const props = useSpring({ to: { opacity: 1 }, from: { opacity: 0 }, delay: 550 });

    // --- State Definitions ---
    const [taskStatus, setTaskStatus] = useState([]);
    const [allTasksValidated, setAllTasksValidated] = useState(false);
    const [currentExecutingIndex, setCurrentExecutingIndex] = useState(-1);
    const [executionError, setExecutionError] = useState(null);
    const [intermediateResults, setIntermediateResults] = useState({});
    const [displayCardData, setDisplayCardData] = useState([]);
    const [isInitialized, setIsInitialized] = useState(false);

    // --- Effect 1: Initialize Display Cards and Task Status ---
    useEffect(() => {
        console.log("[Effect 1] Initialization Effect Triggered.");
        console.log("  > validatedTools:", validatedTools);

        // Only run initialization if tools are present and we haven't initialized yet
        if (validatedTools && validatedTools.length > 0 && !isInitialized) {
            console.log("  > Tools found, initializing display cards and status...");

            // Filter Cards based on tools that have a mapping
            const relevantCardIds = new Set();
            validatedTools.forEach(toolName => {
                const mapping = toolEndpointMap[toolName];
                if (mapping) {
                    relevantCardIds.add(mapping.cardId);
                    // Special case: If 'infra' is planned, always include the Jenkins card (ID 5)
                    if (toolName === 'infra' && baseCardData.some(c => c.id === 5)) {
                        relevantCardIds.add(5);
                    }
                } else {
                    console.warn(`  > No mapping found for tool: ${toolName}`);
                }
            });
            console.log("  > Relevant Card IDs:", Array.from(relevantCardIds));

            const filteredCards = baseCardData
                .filter(card => relevantCardIds.has(card.id))
                .sort((a, b) => a.id - b.id); // Sort cards by ID for consistent display order

            console.log("  > Filtered Display Card Data:", filteredCards);
            setDisplayCardData(filteredCards);

            // Initialize Status for the filtered cards
            const initialStatus = filteredCards.map(card => ({
                id: card.id,
                task: card.task,
                isAnimating: false,
                validated: false,
                error: null,
                isRunning: false,
            }));
            console.log("  > Initial Task Status:", initialStatus);
            setTaskStatus(initialStatus);

            setIsInitialized(true); // Mark initialization complete
            setCurrentExecutingIndex(0); // Start execution flow
            console.log("  > Initialization complete. Set index to 0.");

        } else if (validatedTools && validatedTools.length === 0 && !isInitialized) {
            console.warn("[Effect 1] validatedTools array is empty. No steps to execute.");
            setExecutionError("Configuration incomplete: No tools were provided.");
            setIsInitialized(true); // Mark init complete even if nothing to do
        } else if (isInitialized) {
             console.log("[Effect 1] Already initialized.");
        } else {
             console.log("[Effect 1] validatedTools not yet available or invalid.");
        }

    // Dependencies: Run when validatedTools reference changes OR isInitialized changes (to prevent re-running)
    }, [validatedTools, isInitialized]); // Use isInitialized to prevent re-running


    // --- runApiCall Function ---
    // ** useCallback Dependency Change: Removed taskStatus **
    const runApiCall = useCallback(async (toolIndex) => {
        console.log(`%c[runApiCall] START - Index: ${toolIndex}`, 'color: blue; font-weight: bold;');

        // --- Guard Checks ---
        // These checks are mostly handled by useEffect 2, but keep for safety
        if (toolIndex >= validatedTools.length) {
            console.log(`[runApiCall] Index ${toolIndex} out of bounds. Execution should have completed.`);
            // Completion check moved to useEffect 2
            return;
        }
         if (executionError) {
             console.log(`[runApiCall] Execution already stopped due to error: "${executionError}"`);
             return;
        }
        // --- End Guard Checks ---

        const toolName = validatedTools[toolIndex];
        console.log(`[runApiCall] Processing Tool Name: '${toolName}'`);

        const mapping = toolEndpointMap[toolName];

        // --- Mapping Check ---
        if (!mapping) {
            console.warn(`[runApiCall] SKIP Tool '${toolName}': No mapping found in toolEndpointMap.`);
            setCurrentExecutingIndex(prev => prev + 1); // Directly move to next tool
            return;
        }
        console.log(`[runApiCall] Mapping found for '${toolName}':`, mapping);
        const { endpoint, cardId, method = 'GET', requiresParams = [], providesResultKeys = [] } = mapping;
        // --- End Mapping Check ---

        // --- UI Update: Start (Using functional update) ---
        setTaskStatus(prevStatus => {
            console.log(`[runApiCall] UI Update: Set Card ID ${cardId} to running.`);
            if (prevStatus.some(task => task.id === cardId)) {
                 return prevStatus.map(task =>
                    task.id === cardId ? { ...task, isRunning: true, isAnimating: true, error: null, validated: false } : task
                 );
            } else {
                 console.warn(`[runApiCall] Card ID ${cardId} not found in taskStatus for tool ${toolName}.`);
                 return prevStatus; // Return previous state if ID not found
            }
        });
        // --- End UI Update: Start ---

        try {
            // --- Prepare Request Data ---
            console.log(`[runApiCall] Preparing parameters for '${toolName}'...`);
            console.log(`  > Required Params: [${requiresParams.join(', ')}]`);
            console.log(`  > Available validatedResponses[${toolName}]:`, JSON.stringify(validatedResponses[toolName]));
            console.log(`  > Available intermediateResults:`, JSON.stringify(intermediateResults));

            const requestParams = {}; // For GET query params
            const requestBody = {};   // For POST body
            let missingParam = false;
            let missingParamName = '';

            for (const paramKey of requiresParams) {
                 // Prefer intermediate result if available (result from previous step)
                let value = intermediateResults[paramKey] ?? validatedResponses[toolName]?.[paramKey];

                // Handle optional 'environment_path' for 'analyzer' specifically
                if (toolName === 'analyzer' && paramKey === 'environment_path' && (value === undefined || value === null || value === '')) {
                    console.log(`  > Optional param '${paramKey}' not found/empty for '${toolName}'. Skipping.`);
                    continue; // Skip this optional param if not found
                }

                if (value === undefined || value === null) {
                    console.error(`[runApiCall] PARAM ERROR: Missing required parameter '${paramKey}' for tool '${toolName}'`);
                    missingParam = true;
                    missingParamName = paramKey;
                    break; // Stop checking params if one is missing
                }

                // Assign to correct object based on method
                if (method.toUpperCase() === 'GET') {
                    requestParams[paramKey] = value;
                } else { // POST, PUT, etc.
                    requestBody[paramKey] = value;
                }
                console.log(`  > Param '${paramKey}' = `, value);
            }

            if (missingParam) {
                throw new Error(`Missing required parameter '${missingParamName}'`);
            }
            // --- End Prepare Request Data ---


            // --- Make API Call ---
            let response;
            const config = {};
            const upperMethod = method.toUpperCase();
            console.log(`%c[runApiCall] EXECUTING: ${upperMethod} ${endpoint}`, 'color: green;');

            if (upperMethod === 'GET') {
                config.params = requestParams;
                console.log(`  > With Params:`, JSON.stringify(config.params));
                response = await axios.get(endpoint, config);
            } else if (upperMethod === 'POST') {
                config.headers = { 'Content-Type': 'application/json' };
                console.log(`  > With Body:`, JSON.stringify(requestBody));
                response = await axios.post(endpoint, requestBody, config);
            } else {
                throw new Error(`Unsupported HTTP method: ${method} for tool ${toolName}`);
            }
            console.log(`[runApiCall] API Response Received for '${toolName}'. Status: ${response.status}. Data:`, response.data);
            // --- End Make API Call ---


            // --- Handle Response ---
             // CHECK BACKEND SUCCESS FLAG or data structure
             if (response.data?.success === false || (toolName === 'get-environments' && !response.data?.python_versions) /* Add other tool-specific failure checks if needed */) {
                const errorMsg = response.data?.error || response.data?.message || `Request failed (API response indicated failure)`;
                console.error(`[runApiCall] API LOGIC ERROR for '${toolName}': ${errorMsg}. Full response data:`, response.data);
                throw new Error(errorMsg); // Treat API-reported failure as an error
            }
            console.log(`[runApiCall] SUCCESS for '${toolName}'.`);
            // --- End Handle Response ---


            // --- Store Results ---
            if (providesResultKeys.length > 0 && response.data) {
                console.log(`[runApiCall] Storing results provided by '${toolName}': [${providesResultKeys.join(', ')}]`);
                const newIntermediateResults = {};
                providesResultKeys.forEach(key => {
                    if (response.data[key] !== undefined) {
                        newIntermediateResults[key] = response.data[key];
                        console.log(`  > Storing ${key}:`, response.data[key]);
                    } else {
                        console.warn(`[runApiCall] Tool '${toolName}' was expected to provide result key '${key}', but it was missing in the response.`);
                    }
                });
                if(Object.keys(newIntermediateResults).length > 0) {
                     // Use functional update for setIntermediateResults too
                     setIntermediateResults(prevIntermediate => {
                         const updated = { ...prevIntermediate, ...newIntermediateResults };
                         console.log("[runApiCall] Updated intermediate results state:", JSON.stringify(updated));
                         return updated;
                     });
                }
            }
            // --- End Store Results ---


            // --- UI Update: Success (Using functional update) ---
            setTaskStatus(prevStatus => {
                console.log(`[runApiCall] UI Update: Set Card ID ${cardId} to validated.`);
                 // Special handling for 'infra' tool - mark both card 4 and 5 as validated
                const idsToValidate = toolName === 'infra' ? [cardId, 5] : [cardId];
                return prevStatus.map(task =>
                    idsToValidate.includes(task.id)
                    ? { ...task, isRunning: false, validated: true, isAnimating: false, error: null }
                    : task
                );
            });
            // --- End UI Update: Success ---


            // --- Advance Execution ---
            console.log(`%c[runApiCall] Advancing index from ${toolIndex} to ${toolIndex + 1}`, 'color: blue; font-weight: bold;');
            setCurrentExecutingIndex(prev => prev + 1);
            // --- End Advance Execution ---

        } catch (error) {
            // --- Error Handling ---
            console.error(`%c[runApiCall] CATCH BLOCK - Error during '${toolName}':`, 'color: red;', error);
            let errorMsg = "An unknown error occurred";

            if (axios.isAxiosError(error)) {
                 if (error.response) {
                     // Got a response from the server, but it's an error status (4xx, 5xx)
                     errorMsg = error.response.data?.error || error.response.data?.message || `Server responded with status ${error.response.status}`;
                     console.error(`  > Server Response Error Status: ${error.response.status}`);
                     console.error(`  > Server Response Error Data:`, error.response.data);
                 } else if (error.request) {
                     // Request was made, but no response received (Network Error, CORS, Timeout)
                     errorMsg = "Network Error: No response received from server. Is the backend running?";
                     console.error("  > No response received:", error.request);
                 } else {
                     // Error setting up the request
                     errorMsg = `Request Setup Error: ${error.message}`;
                     console.error("  > Request setup error:", error.message);
                 }
            } else {
                 // Non-Axios error (e.g., parameter missing error thrown earlier)
                 errorMsg = error.message;
            }

            console.log(`[runApiCall] Setting execution error state: "Failed at step '${toolName}': ${errorMsg}"`);
            setExecutionError(`Failed at step '${toolName}': ${errorMsg}`); // Stop further execution

             // --- UI Update: Error (Using functional update) ---
            setTaskStatus(prevStatus => {
                console.log(`[runApiCall] UI Update: Set Card ID ${cardId} to error state.`);
                 if (prevStatus.some(task => task.id === cardId)) {
                    return prevStatus.map(task =>
                        task.id === cardId ? { ...task, isRunning: false, isAnimating: false, validated: false, error: errorMsg } : task
                    );
                 } else {
                     console.warn(`[runApiCall] Card ID ${cardId} not found in taskStatus during error handling.`);
                     return prevStatus;
                 }
            });
            console.log(`%c[runApiCall] Execution stopped at index ${toolIndex} due to error.`, 'color: red; font-weight: bold;');
            // --- End Error Handling ---
        }

    // ** REMOVED taskStatus from dependencies **
    // Intermediate results are needed because parameters might depend on them.
    // executionError is needed to stop subsequent calls if one fails.
    }, [
        validatedTools,
        validatedResponses,
        intermediateResults, // Needed to prepare params correctly
        executionError,      // Needed for guard check
        displayCardData,     // Needed? Only if cardId mapping depends on it, likely not. Can probably remove.
        // setIntermediateResults, setExecutionError, setTaskStatus, setCurrentExecutingIndex // Setters usually don't need to be dependencies
    ]);


    // --- Effect 2: Trigger API Execution ---
    useEffect(() => {
        console.log(`%c[Effect 2] Execution Trigger Check. Index: ${currentExecutingIndex}, Initialized: ${isInitialized}, Error: ${!!executionError}`, 'color: purple;');

        // Conditions to run the API call for the current index:
        // 1. Must be initialized
        // 2. Index must be valid (0 or greater)
        // 3. Index must be within the bounds of the tools array
        // 4. No execution error must have occurred
        if (isInitialized && currentExecutingIndex >= 0 && currentExecutingIndex < validatedTools.length && !executionError) {
            console.log(`  > Triggering runApiCall for index ${currentExecutingIndex}`);
            runApiCall(currentExecutingIndex);

        // Condition for successful completion:
        // 1. Must be initialized
        // 2. Index must have reached the end of the tools array
        // 3. No execution error occurred
        } else if (isInitialized && currentExecutingIndex === validatedTools.length && !executionError) {
             console.log("  > Execution finished successfully. All tools processed.");
             setAllTasksValidated(true); // Set completion flag

        // Condition for stopping due to error:
        } else if (executionError) {
             console.log("  > Execution stopped due to error state.");

        // Condition for waiting:
        } else if (!isInitialized) {
             console.log("  > Waiting for initialization to complete...");

        // Condition for edge cases (e.g., index out of bounds but no error - shouldn't normally happen)
        } else {
            console.log("  > Execution trigger conditions not met (Edge Case?).");
        }

    // Dependencies: Trigger when the index changes, initialization completes, or an error occurs.
    // runApiCall is included because its definition might change (though less frequently now).
    }, [currentExecutingIndex, isInitialized, executionError, runApiCall, validatedTools.length]);


    // --- JSX Return ---
    return (
        <div>
            <NavHead />
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.75 }}
                style={{ marginTop: '65px' }} // Adjust margin as needed
            >
                <div className="home-container"> {/* Ensure consistent class names */}
                    <div className="content-container"> {/* Ensure consistent class names */}
                        <div className="row justify-content-center">
                            <div className="col-14 text-center"> {/* Check if col-14 is intended or typo for col-12 */}

                                <h1 className="header-card" style={{ color: 'white' }}>
                                     {executionError ? "Setup Failed" : allTasksValidated ? "Setup Complete!" : "aCube is Setting up your Pipeline..."}
                                </h1>

                                {executionError && (
                                     // Display the error message clearly
                                     <p className="error-message" style={{color: '#ff4d4d', backgroundColor: '#330000', padding: '10px', borderRadius: '5px', marginTop: '10px', display: 'inline-block'}}>
                                        <strong>Error:</strong> {executionError}
                                    </p>
                                )}

                                <animated.div style={props}>
                                    {/* Render cards only if initialized and data is available */}
                                    {isInitialized && displayCardData.length > 0 ? (
                                        <div className="card-container">
                                            {displayCardData.map((data) => {
                                                // Find the corresponding status object
                                                const status = taskStatus.find(s => s.id === data.id);
                                                // Render card only if status is found
                                                return status ? (
                                                    <PipelineCard
                                                        key={data.id}
                                                        id={data.id}
                                                        task={status.task} // Use task from status in case it changes? Or keep data.task?
                                                        desc={data.desc}
                                                        isAnimating={status.isAnimating}
                                                        validated={status.validated}
                                                        error={status.error}
                                                        isRunning={status.isRunning}
                                                    />
                                                ) : null; // Don't render if status object isn't ready
                                            })}
                                        </div>
                                    ) : (
                                        // Show initializing message OR if an error occurred before init finished
                                         <p style={{color: 'white', marginTop: '20px'}}>
                                             {executionError ? "" : "Initializing setup steps..."}
                                        </p>
                                    )}
                                </animated.div>
                                <br></br>
                                <animated.div style={props}>
                                    {/* Show success message only when all tasks validated and no error */}
                                    {allTasksValidated && !executionError && (
                                        <div className="success-message">
                                            <h2 style={{ color: 'lightgreen' }}>CI/CD Pipeline setup steps executed successfully!</h2>
                                            {/* Maybe add a link or further instructions here */}
                                        </div>
                                    )}
                                </animated.div>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default Main;