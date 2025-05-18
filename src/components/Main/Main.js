import React, { useState, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import "./Main.css";
import PipelineCard from "./PipelineCard/PipelineCard.js";
import { useSpring, animated } from "react-spring";
import NavHead from "../Home/NavHead/NavHead.js";
import axios from "axios";
import { motion } from "framer-motion";

// --- Define the mapping from Tool Name to API details and Card ID ---
// This map remains comprehensive for Main.js
const toolEndpointMap = {
    'analyzer': {
        endpoint: 'http://localhost:8000/analyzer',
        cardId: 1,
        method: 'POST',
        requiresParams: ['folder_path', 'environment_path'],
        providesResultKeys: ['work_dir', 'entrypoint', 'app_type', 'python_version']
    },
    'get-creds': {
        endpoint: 'http://localhost:8000/creds',
        cardId: 3,
        method: 'GET',
        requiresParams: [],
    },
    'dockerfile-gen': {
        endpoint: 'http://localhost:8000/dockerfile-gen',
        cardId: 2, // Associated with Gen AI Script Generation
        method: 'GET',
        requiresParams: ['app_type', 'python_version', 'work_dir', 'entrypoint', 'folder_path']
    },
    'jenkinsfile-gen': {
        endpoint: 'http://localhost:8000/jenkinsfile-gen',
        cardId: 2, // Associated with Gen AI Script Generation
        method: 'GET',
        requiresParams: ['folder_path']
    },
    'infra': {
        endpoint: 'http://localhost:8000/infra',
        cardId: 4,
        method: 'GET',
        requiresParams: ['work_dir', 'instance_size'] // Verify required params
    },
    'get-environments': {
        endpoint: 'http://localhost:8000/get-environments',
        cardId: 1, // Related to analysis, pre-requisite
        method: 'GET',
        requiresParams: ['folder_path'],
        providesResultKeys: ['python_versions']
    },
    'github-webhook-setup': {
        endpoint: 'http://localhost:8000/github-webhook-setup',
        cardId: 4, // Or a new card ID if preferred, let's assume infra related for now
        method: 'GET',
        requiresParams: ['folder_path'], // Example, verify
    }
    // ... other tools like terraform-gen, etc.
};

// --- Define the base visual card data ---
const baseCardData = [
    { id: 1, task: "Analyzing Tech Stack", desc: `Generating requirements.txt and finding out about application type.` },
    { id: 3, task: `Retrieval of Credentials`, desc: `Retrieving AWS and Github credentials.` },
    { id: 2, task: `Gen AI Script Generation`, desc: `Generating Dockerfile, Jenkinsfile and Terraform files.` },
    { id: 4, task: `Setting up AWS Infrastructure`, desc: `Setting up Infra (e.g., EC2, networking) on AWS.` },
    { id: 5, task: `Setting up Jenkins CI/CD Job`, desc: `Creating your custom job on Jenkins.` },
];

// --- Define tools that are executed in Dashboard.js ---
const DASHBOARD_EXECUTED_TOOLS = ['get-environments', 'analyzer', 'dockerfile-gen', 'jenkinsfile-gen'];


const Main = () => {
    const { state } = useLocation();
    // Safely extract data
    const initialAgentResponses = state?.initialResponses || {}; // Original responses from Agent via Dashboard
    const dashboardResults = state?.intermediateDashboardResults || {}; // Results from Dashboard APIs
    const validatedTools = state?.validatedTools || [];
    // console.log("Main.js received initialAgentResponses:", initialAgentResponses);
    // console.log("Main.js received dashboardResults:", dashboardResults);
    // console.log("Main.js received validatedTools:", validatedTools);


    const props = useSpring({ to: { opacity: 1 }, from: { opacity: 0 }, delay: 550 });

    const [taskStatus, setTaskStatus] = useState([]);
    const [allTasksValidated, setAllTasksValidated] = useState(false);
    const [currentExecutingIndex, setCurrentExecutingIndex] = useState(-1); // Start at -1, init effect sets to 0
    const [executionError, setExecutionError] = useState(null);
    // Intermediate results will now be a combination of original agent data and dashboard results
    const [intermediateResults, setIntermediateResults] = useState({});
    const [displayCardData, setDisplayCardData] = useState([]);
    const [isInitialized, setIsInitialized] = useState(false);


    // --- Effect 1: Initialize Display Cards and Task Status ---
    useEffect(() => {
        console.log("[Effect 1] Main.js Initialization Effect Triggered.");
        console.log("  > validatedTools:", validatedTools);

        // Combine initial agent responses and dashboard results for parameter sourcing
        // Dashboard results take precedence
        const combinedInitialData = { ...initialAgentResponses };
        for (const toolKey in initialAgentResponses) {
            if (typeof initialAgentResponses[toolKey] === 'object' && initialAgentResponses[toolKey] !== null) {
                combinedInitialData[toolKey] = {...initialAgentResponses[toolKey]};
            } else {
                combinedInitialData[toolKey] = initialAgentResponses[toolKey];
            }
        }
        // Merge dashboard direct results (like 'work_dir', 'python_version' etc.)
        // These are top-level keys in dashboardResults
        for (const key in dashboardResults) {
            combinedInitialData[key] = dashboardResults[key];
        }
        setIntermediateResults(combinedInitialData);
        console.log("  > Initialized intermediateResults with combined data:", combinedInitialData);


        if (validatedTools && validatedTools.length > 0 && !isInitialized) {
            console.log("  > Tools found, initializing display cards and status...");

            const relevantCardIds = new Set();
            validatedTools.forEach(toolName => {
                const mapping = toolEndpointMap[toolName];
                if (mapping) {
                    relevantCardIds.add(mapping.cardId);
                    if (toolName === 'infra' && baseCardData.some(c => c.id === 5)) {
                        relevantCardIds.add(5);
                    }
                } else {
                    console.warn(`  > No mapping found for tool: ${toolName} in Main.js`);
                }
            });
            console.log("  > Relevant Card IDs:", Array.from(relevantCardIds));

            const filteredCards = baseCardData
                .filter(card => relevantCardIds.has(card.id))
                .sort((a, b) => a.id - b.id);
            console.log("  > Filtered Display Card Data:", filteredCards);
            setDisplayCardData(filteredCards);

            const initialStatus = filteredCards.map(card => {
                // Check if ALL tools associated with this card were executed in the dashboard
                const toolsForThisCard = validatedTools.filter(toolName => toolEndpointMap[toolName]?.cardId === card.id);
                const allToolsForCardAreDashboardExecuted = toolsForThisCard.length > 0 &&
                    toolsForThisCard.every(tool => DASHBOARD_EXECUTED_TOOLS.includes(tool));

                // Special case for cardId 5 (Jenkins setup), it's validated if 'infra' tool (card 4) is validated
                // and 'infra' is NOT a dashboard tool (which it isn't in our current list)
                let isPreValidated = allToolsForCardAreDashboardExecuted;
                if (card.id === 5 && validatedTools.includes('infra') && DASHBOARD_EXECUTED_TOOLS.includes('infra')) {
                    // If infra was a dashboard tool (hypothetically), then card 5 would also be pre-validated.
                    // Currently 'infra' is not, so this condition won't make card 5 pre-validated by default.
                    // It will be validated when 'infra' tool completes successfully.
                }


                return {
                    id: card.id,
                    task: card.task,
                    isAnimating: false,
                    validated: isPreValidated,
                    error: null,
                    isRunning: false,
                };
            });
            console.log("  > Initial Task Status (Main.js):", initialStatus);
            setTaskStatus(initialStatus);
            setIsInitialized(true);
            setCurrentExecutingIndex(0); // Start execution flow
            console.log("  > Main.js Initialization complete. Set index to 0.");

        } else if (validatedTools && validatedTools.length === 0 && !isInitialized) {
            console.warn("[Effect 1] Main.js: validatedTools array is empty.");
            setExecutionError("Configuration incomplete: No tools were provided for execution.");
            setIsInitialized(true);
        } else if (isInitialized) {
            console.log("[Effect 1] Main.js Already initialized.");
        } else {
            console.log("[Effect 1] Main.js validatedTools not yet available.");
        }
    }, [validatedTools, isInitialized, initialAgentResponses, dashboardResults]);


    const runApiCall = useCallback(async (toolIndex) => {
        console.log(`%c[Main.js runApiCall] START - Index: ${toolIndex}`, 'color: blue; font-weight: bold;');

        if (toolIndex >= validatedTools.length) return;
        if (executionError) return;

        const toolName = validatedTools[toolIndex];
        console.log(`[Main.js runApiCall] Processing Tool Name: '${toolName}'`);

        // --- Skip tools already run in Dashboard.js ---
        if (DASHBOARD_EXECUTED_TOOLS.includes(toolName)) {
            console.log(`%c[Main.js runApiCall] SKIP Tool '${toolName}': Already executed in Dashboard.`, 'color: orange;');
            // Ensure its card is marked as validated if not already by init
            const mapping = toolEndpointMap[toolName];
            if (mapping) {
                 setTaskStatus(prevStatus => prevStatus.map(task =>
                    task.id === mapping.cardId && !task.validated
                    ? { ...task, validated: true, isRunning: false, isAnimating: false, error: null }
                    : task
                ));
            }
            setCurrentExecutingIndex(prev => prev + 1);
            return;
        }
        // --- End Skip ---

        const mapping = toolEndpointMap[toolName];
        if (!mapping) {
            console.warn(`[Main.js runApiCall] SKIP Tool '${toolName}': No mapping found.`);
            setCurrentExecutingIndex(prev => prev + 1);
            return;
        }
        console.log(`[Main.js runApiCall] Mapping found for '${toolName}':`, mapping);
        const { endpoint, cardId, method = 'GET', requiresParams = [], providesResultKeys = [] } = mapping;

        setTaskStatus(prevStatus => {
            if (prevStatus.some(task => task.id === cardId)) {
                 return prevStatus.map(task =>
                    task.id === cardId ? { ...task, isRunning: true, isAnimating: true, error: null, validated: false } : task
                 );
            }
            return prevStatus;
        });

        try {
            console.log(`[Main.js runApiCall] Preparing parameters for '${toolName}'...`);
            console.log(`  > Required Params: [${requiresParams.join(', ')}]`);
            console.log(`  > Available intermediateResults:`, JSON.stringify(intermediateResults));
            // Note: initialAgentResponses contains tool-specific sub-objects.
            // dashboardResults contains top-level keys from providesResultKeys of dashboard tools.
            // intermediateResults is a merge of these and accumulates more results.

            const requestParams = {};
            const requestBody = {};
            let missingParam = false;
            let missingParamName = '';

            for (const paramKey of requiresParams) {
                let value;
                // 1. Check intermediateResults (which includes dashboard results and previous step results)
                value = intermediateResults[paramKey];

                // 2. If not found, check tool-specific section in initialAgentResponses
                if (value === undefined && initialAgentResponses[toolName]?.[paramKey] !== undefined) {
                    value = initialAgentResponses[toolName][paramKey];
                }
                // 3. If still not found, check tool-specific section in *any* initialAgentResponse (less common but for shared params)
                if (value === undefined) {
                    for (const respToolKey in initialAgentResponses) {
                        if (typeof initialAgentResponses[respToolKey] === 'object' && initialAgentResponses[respToolKey]?.[paramKey] !== undefined) {
                            value = initialAgentResponses[respToolKey][paramKey];
                            break;
                        }
                    }
                }


                // Handle optional 'environment_path' for 'analyzer' (though analyzer is a dashboard tool)
                if (toolName === 'analyzer' && paramKey === 'environment_path' && (value === undefined || value === null || value === '')) {
                    console.log(`  > Optional param '${paramKey}' not found/empty for '${toolName}'. Skipping.`);
                    continue;
                }

                if (value === undefined || value === null) {
                    console.error(`[Main.js runApiCall] PARAM ERROR: Missing required parameter '${paramKey}' for tool '${toolName}'`);
                    missingParam = true;
                    missingParamName = paramKey;
                    break;
                }

                if (method.toUpperCase() === 'GET') {
                    requestParams[paramKey] = value;
                } else {
                    requestBody[paramKey] = value;
                }
                console.log(`  > Param '${paramKey}' for ${toolName} = `, value);
            }

            if (missingParam) {
                throw new Error(`Missing required parameter '${missingParamName}' for ${toolName}`);
            }

            let response;
            const config = {};
            const upperMethod = method.toUpperCase();
            console.log(`%c[Main.js runApiCall] EXECUTING: ${upperMethod} ${endpoint}`, 'color: green;');

            if (upperMethod === 'GET') {
                config.params = requestParams;
                response = await axios.get(endpoint, config);
            } else if (upperMethod === 'POST') {
                config.headers = { 'Content-Type': 'application/json' };
                response = await axios.post(endpoint, requestBody, config);
            } else {
                throw new Error(`Unsupported HTTP method: ${method} for tool ${toolName}`);
            }
            console.log(`[Main.js runApiCall] API Response for '${toolName}'. Status: ${response.status}. Data:`, response.data);

            if (response.data?.success === false) { // Simplified check, adapt if needed
                const errorMsg = response.data?.error || response.data?.message || `Request failed (API indicated failure for ${toolName})`;
                throw new Error(errorMsg);
            }
            console.log(`[Main.js runApiCall] SUCCESS for '${toolName}'.`);

            if (providesResultKeys.length > 0 && response.data) {
                const newStepResults = {};
                providesResultKeys.forEach(key => {
                    if (response.data[key] !== undefined) {
                        newStepResults[key] = response.data[key];
                    }
                });
                if(Object.keys(newStepResults).length > 0) {
                     setIntermediateResults(prevIntermediate => {
                         const updated = { ...prevIntermediate, ...newStepResults };
                         console.log("[Main.js runApiCall] Updated intermediate results state:", JSON.stringify(updated));
                         return updated;
                     });
                }
            }

            setTaskStatus(prevStatus => {
                const idsToValidate = toolName === 'infra' ? [cardId, 5] : [cardId]; // Card 5 (Jenkins) validates with infra
                return prevStatus.map(task =>
                    idsToValidate.includes(task.id)
                    ? { ...task, isRunning: false, validated: true, isAnimating: false, error: null }
                    : task
                );
            });

            console.log(`%c[Main.js runApiCall] Advancing index from ${toolIndex} to ${toolIndex + 1}`, 'color: blue; font-weight: bold;');
            setCurrentExecutingIndex(prev => prev + 1);

        } catch (error) {
            console.error(`%c[Main.js runApiCall] CATCH BLOCK - Error during '${toolName}':`, 'color: red;', error);
            let errorMsg = "An unknown error occurred";
            if (axios.isAxiosError(error)) {
                 // ... (standard axios error handling) ...
                 if (error.response) {
                     errorMsg = error.response.data?.error || error.response.data?.message || `Server responded with status ${error.response.status}`;
                 } else if (error.request) {
                     errorMsg = "Network Error: No response received from server.";
                 } else {
                     errorMsg = `Request Setup Error: ${error.message}`;
                 }
            } else {
                 errorMsg = error.message;
            }
            setExecutionError(`Failed at step '${toolName}': ${errorMsg}`);
            setTaskStatus(prevStatus => {
                 if (prevStatus.some(task => task.id === cardId)) {
                    return prevStatus.map(task =>
                        task.id === cardId ? { ...task, isRunning: false, isAnimating: false, validated: false, error: errorMsg } : task
                    );
                 }
                 return prevStatus;
            });
        }
    }, [
        validatedTools,
        initialAgentResponses, // Use this instead of validatedResponses directly
        intermediateResults,
        executionError,
        // No setters in deps
    ]);


    // --- Effect 2: Trigger API Execution ---
    useEffect(() => {
        console.log(`%c[Main.js Effect 2] Execution Trigger. Index: ${currentExecutingIndex}, Initialized: ${isInitialized}, Error: ${!!executionError}`, 'color: purple;');
    
        if (isInitialized && currentExecutingIndex >= 0 && currentExecutingIndex < validatedTools.length && !executionError) {
            const currentToolName = validatedTools[currentExecutingIndex];
            const mapping = toolEndpointMap[currentToolName];
            let isCurrentToolCardAlreadyRunning = false;
    
            if (mapping && taskStatus.length > 0) {
                const currentTaskState = taskStatus.find(ts => ts.id === mapping.cardId);
                if (currentTaskState && currentTaskState.isRunning) {
                    // If the card for the current tool is already marked as running,
                    // it implies runApiCall was invoked, set this status, and this effect re-ran.
                    // We should not call runApiCall again for the same index until the current one finishes or errors out.
                    isCurrentToolCardAlreadyRunning = true;
                    console.log(`  > Tool '${currentToolName}' (card ${mapping.cardId}) at index ${currentExecutingIndex} is already marked as running. Waiting.`);
                }
            }
    
            if (!isCurrentToolCardAlreadyRunning) {
                console.log(`  > Triggering runApiCall for index ${currentExecutingIndex} (Tool: ${validatedTools[currentExecutingIndex]})`);
                runApiCall(currentExecutingIndex);
            }
    
        } else if (isInitialized && currentExecutingIndex === validatedTools.length && !executionError && validatedTools.length > 0) {
             console.log("  > Main.js Execution finished successfully. All tools processed.");
             const allDisplayCardsValidated = taskStatus.length > 0 && taskStatus.every(ts => ts.validated);
             if(allDisplayCardsValidated) {
                setAllTasksValidated(true);
             } else {
                console.warn("  > Execution loop finished, but not all display cards are marked validated. Error or skipped dashboard tasks might affect this if not handled in init.");
                if (taskStatus.filter(ts => !ts.validated).every(ts => {
                    const toolsForCard = validatedTools.filter(tool => toolEndpointMap[tool]?.cardId === ts.id);
                    return toolsForCard.every(tool => DASHBOARD_EXECUTED_TOOLS.includes(tool));
                })) {
                    console.log("  > Remaining unvalidated cards correspond to dashboard-executed tools. Considering setup complete.");
                    setAllTasksValidated(true);
                }
             }
        } else if (executionError) {
             console.log("  > Main.js Execution stopped due to error state.");
        } else if (!isInitialized) {
             console.log("  > Main.js Waiting for initialization...");
        } else if (isInitialized && validatedTools.length === 0 && !executionError) {
            console.log("  > Main.js: No tools to execute. Marking as complete if applicable.");
            setAllTasksValidated(true); // No tools, so "complete"
        }
    }, [currentExecutingIndex, isInitialized, executionError, runApiCall, validatedTools, taskStatus, toolEndpointMap]); // Added toolEndpointMap to dependencies

    return (
        <div>
            <NavHead />
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.75 }}
                style={{ marginTop: '65px' }}
            >
                <div className="home-container">
                    <div className="content-container">
                        <div className="row justify-content-center">
                            <div className="col-12 text-center"> {/* Corrected to col-12 Bootstrap standard */}
                                <h1 className="header-card" style={{ color: 'white' }}>
                                     {executionError ? "Setup Failed" : allTasksValidated ? "Setup Complete!" : "aCube is Setting up your Pipeline..."}
                                </h1>
                                {executionError && (
                                     <p className="error-message main-error-message"> {/* Added specific class */}
                                        <strong>Error:</strong> {executionError}
                                    </p>
                                )}
                                <animated.div style={props}>
                                    {isInitialized && displayCardData.length > 0 ? (
                                        <div className="card-container">
                                            {displayCardData.map((data) => {
                                                const status = taskStatus.find(s => s.id === data.id);
                                                return status ? (
                                                    <PipelineCard
                                                        key={data.id}
                                                        id={data.id}
                                                        task={status.task}
                                                        desc={data.desc}
                                                        isAnimating={status.isAnimating}
                                                        validated={status.validated}
                                                        error={status.error}
                                                        isRunning={status.isRunning}
                                                    />
                                                ) : null;
                                            })}
                                        </div>
                                    ) : (
                                         <p style={{color: 'white', marginTop: '20px'}}>
                                             {executionError ? "" : (validatedTools.length === 0 && isInitialized) ? "No setup steps configured for this pipeline." : "Initializing setup steps..."}
                                        </p>
                                    )}
                                </animated.div>
                                <br></br>
                                <animated.div style={props}>
                                    {allTasksValidated && !executionError && (
                                        <div className="success-message">
                                            <h2 style={{ color: 'lightgreen' }}>CI/CD Pipeline setup steps executed successfully!</h2>
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