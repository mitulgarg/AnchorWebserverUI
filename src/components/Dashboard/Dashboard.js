import React, { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios"; // Import axios
import './Dashboard.css';
import Modal from './Modal';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRight, faSpinner } from "@fortawesome/free-solid-svg-icons";

// --- Define the mapping from Tool Name to API details (subset for Dashboard) ---
// This can be imported from a shared file or defined here if specific to Dashboard
const toolEndpointMap = {
    'analyzer': {
        endpoint: 'http://localhost:8000/analyzer',
        method: 'POST',
        requiresParams: ['folder_path', 'environment_path'], // environment_path is optional
        providesResultKeys: ['work_dir', 'entrypoint', 'app_type', 'python_version'] // Added python_version as analyzer might determine it
    },
    'dockerfile-gen': {
        endpoint: 'http://localhost:8000/dockerfile-gen',
        method: 'GET',
        requiresParams: ['app_type', 'python_version', 'work_dir', 'entrypoint', 'folder_path']
    },
    'jenkinsfile-gen': {
        endpoint: 'http://localhost:8000/jenkinsfile-gen',
        method: 'GET',
        requiresParams: ['folder_path']
    },
    'get-environments': {
        endpoint: 'http://localhost:8000/get-environments',
        method: 'GET',
        requiresParams: ['folder_path'],
        providesResultKeys: ['python_versions']
    },
    // Add other tools if they also generate files viewable/editable in dashboard
};

// Define which tools are for file generation in the dashboard
const DASHBOARD_FILE_GEN_TOOLS = ['get-environments', 'analyzer', 'dockerfile-gen', 'jenkinsfile-gen'];


const Dashboard = () => {
  const [files, setFiles] = useState([]);
  const [expandedFile, setExpandedFile] = useState(null);
  const [editingFile, setEditingFile] = useState(null);
  const [editPrompt, setEditPrompt] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isViewing, setIsViewing] = useState(false);

  const cardRefs = useRef({});
  const location = useLocation();
  const navigate = useNavigate();

  const [agentData, setAgentData] = useState(null);
  const [isGeneratingFiles, setIsGeneratingFiles] = useState(false);
  const [generationError, setGenerationError] = useState(null);
  const [initialFileGenComplete, setInitialFileGenComplete] = useState(false);
  // Store results from dashboard API calls to pass to Main.js if needed
  const [dashboardApiResults, setDashboardApiResults] = useState({});

  useEffect(() => {
    if (location.state) {
      console.log("Data received in Dashboard:", location.state);
      setAgentData({
        validatedResponses: location.state.validatedResponses || {},
        validatedTools: location.state.validatedTools || [],
        serviceType: location.state.serviceType,
      });
      // Reset generation status if new agent data comes in
      setInitialFileGenComplete(false);
      setGenerationError(null);
      setDashboardApiResults({});
    }
  }, [location.state]);

  const fetchFiles = async () => {
    try {
      console.log("Fetching dashboard file data...");
      const res = await fetch("http://localhost:8000/dashboard-file-data");
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data = await res.json();
      console.log("Dashboard files fetched:", data);
      setFiles(data);
      return data;
    } catch (err) {
      console.error("Error fetching files:", err);
      // Don't set generation error here, as this is for fetching display files
    }
  };

  // --- Function to run initial file generation APIs ---
  const generateInitialFiles = useCallback(async () => {
    if (!agentData || !agentData.validatedTools || agentData.validatedTools.length === 0) {
      console.warn("Cannot generate files: Agent data is missing or incomplete.");
      setGenerationError("Missing initial data to generate files.");
      return;
    }

    setIsGeneratingFiles(true);
    setGenerationError(null);
    let currentApiResults = { ...agentData.validatedResponses }; // Start with what agent provided

    // Filter tools to run only those specified in DASHBOARD_FILE_GEN_TOOLS and present in validatedTools
    const toolsToRunInDashboard = agentData.validatedTools.filter(tool =>
        DASHBOARD_FILE_GEN_TOOLS.includes(tool)
    );

    if (toolsToRunInDashboard.length === 0) {
        console.log("No dashboard-specific file generation tools found in the validated tool list for the current flow.");
        setIsGeneratingFiles(false);
        setInitialFileGenComplete(true); // Mark as complete to allow proceeding
        await fetchFiles(); // Fetch any existing files if needed
        return;
    }
    console.log("Starting generation for tools in Dashboard:", toolsToRunInDashboard);

    try {
      for (const toolName of toolsToRunInDashboard) {
        const mapping = toolEndpointMap[toolName];
        if (!mapping) {
          console.warn(`No mapping found for dashboard tool: ${toolName}. Skipping.`);
          continue;
        }

        console.log(`[Dashboard] Processing Tool: ${toolName}`);
        const { endpoint, method = 'GET', requiresParams = [], providesResultKeys = [] } = mapping;

        const requestParams = {};
        const requestBody = {};
        let missingParam = false;
        let missingParamName = '';

        for (const paramKey of requiresParams) {
          let value = currentApiResults[toolName]?.[paramKey] ?? currentApiResults[paramKey]; // Check tool-specific then general

          // Handle optional 'environment_path' for 'analyzer' specifically
          if (toolName === 'analyzer' && paramKey === 'environment_path' && (value === undefined || value === null || value === '')) {
              console.log(`  > Optional param '${paramKey}' not found/empty for '${toolName}'. Skipping.`);
              continue;
          }

          if (value === undefined || value === null) {
            // Fallback to values from other tools if they provided it (e.g. analyzer provides work_dir for dockerfile-gen)
            for (const otherTool of Object.keys(currentApiResults)) {
                if(typeof currentApiResults[otherTool] === 'object' && currentApiResults[otherTool] !== null && currentApiResults[otherTool][paramKey] !== undefined) {
                    value = currentApiResults[otherTool][paramKey];
                    break;
                }
            }
             // Final check for top-level keys in currentApiResults (from providesResultKeys)
            if ((value === undefined || value === null) && currentApiResults[paramKey] !== undefined) {
                value = currentApiResults[paramKey];
            }


            if (value === undefined || value === null) {
                console.error(`[Dashboard] PARAM ERROR for ${toolName}: Missing '${paramKey}'. Available:`, JSON.stringify(currentApiResults));
                missingParam = true;
                missingParamName = paramKey;
                break;
            }
          }

          if (method.toUpperCase() === 'GET') {
            requestParams[paramKey] = value;
          } else {
            requestBody[paramKey] = value;
          }
          console.log(`  > [Dashboard] Param '${paramKey}' for ${toolName} = `, value);
        }

        if (missingParam) {
          throw new Error(`Tool '${toolName}': Missing required parameter '${missingParamName}'`);
        }

        let response;
        const config = {};
        const upperMethod = method.toUpperCase();
        console.log(`%c[Dashboard] EXECUTING: ${upperMethod} ${endpoint}`, 'color: orange;');

        if (upperMethod === 'GET') {
          config.params = requestParams;
          response = await axios.get(endpoint, config);
        } else if (upperMethod === 'POST') {
          config.headers = { 'Content-Type': 'application/json' };
          response = await axios.post(endpoint, requestBody, config);
        } else {
          throw new Error(`Unsupported HTTP method: ${method} for tool ${toolName}`);
        }
        console.log(`[Dashboard] API Response for '${toolName}':`, response.data);

        if (response.data?.success === false || (toolName === 'get-environments' && !response.data?.python_versions)) {
            const errorMsg = response.data?.error || response.data?.message || `Request failed for ${toolName}`;
            throw new Error(errorMsg);
        }

        if (providesResultKeys.length > 0 && response.data) {
          const newResults = {};
          providesResultKeys.forEach(key => {
            if (response.data[key] !== undefined) {
              newResults[key] = response.data[key];
              // Store directly into currentApiResults for subsequent dashboard steps
              currentApiResults[key] = response.data[key];
              console.log(`  > [Dashboard] Storing intermediate result ${key}:`, response.data[key]);
            }
          });
          // Accumulate all direct API call results into dashboardApiResults to pass to Main.js
          setDashboardApiResults(prev => ({...prev, ...newResults}));
        }
      }

      console.log("All dashboard file generation APIs called successfully.");
      setInitialFileGenComplete(true);
      await fetchFiles(); // Refresh file list after generation

    } catch (error) {
      console.error("[Dashboard] Error during file generation:", error);
      let errorMsg = "An unknown error occurred during file generation.";
      if (axios.isAxiosError(error)) {
           if (error.response) {
               errorMsg = error.response.data?.error || error.response.data?.message || `Server error (${error.response.status})`;
           } else if (error.request) {
               errorMsg = "Network Error: Could not connect to the server.";
           } else {
               errorMsg = `Request Setup Error: ${error.message}`;
           }
      } else {
           errorMsg = error.message;
      }
      setGenerationError(errorMsg);
    } finally {
      setIsGeneratingFiles(false);
    }
  }, [agentData]); // Removed setDashboardApiResults from deps as it's updated via functional update

  // --- Effect to trigger initial file generation ---
  useEffect(() => {
    // Only run if agentData is present, and files haven't been generated yet, and not currently generating.
    if (agentData && !initialFileGenComplete && !isGeneratingFiles && !generationError) {
      generateInitialFiles();
    }
  }, [agentData, initialFileGenComplete, isGeneratingFiles, generationError, generateInitialFiles]);


  const toggleView = (filename) => {
    const file = files.find(f => f.name === filename);
    if (file) {
      setExpandedFile(file);
      setIsViewing(true);
    }
  };

  const handleEditClick = (file) => {
    setEditingFile(file);
    setEditPrompt("");
    setIsEditing(true);
  };

  const handleCloseViewModal = () => {
    setIsViewing(false);
    setTimeout(() => setExpandedFile(null), 200);
  };

  const handleCloseEditModal = () => {
    setIsEditing(false);
    setTimeout(() => {
      setEditingFile(null);
      setEditPrompt("");
    }, 200);
  };

  const handleEditSubmit = async () => {
    if (!editPrompt.trim() || !editingFile) {
      console.warn("Edit prompt is empty or no file selected.");
      return;
    }
    console.log("Submitting edit for:", editingFile.name, "Prompt:", editPrompt);
    try {
      const response = await fetch("http://localhost:8000/edit-file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: editingFile.name,
          original_code: editingFile.code,
          prompt: editPrompt,
        }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: `HTTP error! status: ${response.status}` }));
        throw new Error(errorData.message || `Failed to edit file (status: ${response.status})`);
      }
      console.log("Edit successful. Re-fetching data...");
      const editedFilename = editingFile.name;
      handleCloseEditModal(); // Close modal first
      const newFilesData = await fetchFiles(); // Then re-fetch
      const latestFile = newFilesData?.find(f => f.name === editedFilename);

      setTimeout(() => { // Timeout to allow modal to close before opening new one
        if (latestFile) {
          setExpandedFile(latestFile);
          setIsViewing(true);
        } else {
          console.warn("Edited file not found after re-fetch:", editedFilename);
        }
      }, 250);

    } catch (err) {
      console.error("Error submitting edit or re-fetching:", err);
      alert(`An error occurred: ${err.message}`);
    }
  };

  const handleProceedToSetup = () => {
    if (agentData && agentData.validatedTools && agentData.validatedTools.length > 0 && initialFileGenComplete) {
      console.log("Proceeding to /main with data:", agentData, "and dashboard API results:", dashboardApiResults);
      navigate('/main', {
        state: {
          ...agentData, // validatedResponses, validatedTools, serviceType
          // Merge dashboard results with original validatedResponses.
          // Dashboard results should take precedence for keys they provide.
          // This ensures Main.js gets the most up-to-date values for keys like 'work_dir', 'app_type' etc.
          // if they were determined or updated by dashboard API calls.
          initialResponses: { // Pass the original validatedResponses for clarity
            ...agentData.validatedResponses
          },
          intermediateDashboardResults: dashboardApiResults, // Pass results from dashboard steps
        }
      });
    } else if (generationError) {
        alert(`Cannot proceed due to an error during file generation: ${generationError}`);
    } else if (!initialFileGenComplete) {
        alert("File generation is not yet complete. Please wait.");
    }
    else {
      alert("Setup data from the previous step is missing or file generation failed. Please go back or check errors.");
    }
  };

  return (
    <div className="home-container">
      <div className="content-container">
        <div className="dashboard-header-bar">
          <h1 className="header-card">Review Config Files</h1>
          {initialFileGenComplete && !generationError && agentData && agentData.validatedTools && agentData.validatedTools.length > 0 && (
            <motion.button
              onClick={handleProceedToSetup}
              className="button-proceed-to-setup"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              Proceed to Setup <FontAwesomeIcon icon={faArrowRight} style={{ marginLeft: '8px' }} />
            </motion.button>
          )}
        </div>

        {isGeneratingFiles && (
          <div className="loading-message-dashboard">
            <FontAwesomeIcon icon={faSpinner} spin size="2x" />
            <p>Generating initial configuration files, please wait...</p>
          </div>
        )}

        {generationError && (
          <div className="error-message-dashboard">
            <p><strong>Error during file generation:</strong> {generationError}</p>
            <p>Please check the console for more details and try again, or contact support.</p>
            {/* You could add a retry button here that calls generateInitialFiles again */}
          </div>
        )}

        {initialFileGenComplete && !generationError && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.75 }}
          >
            {(!Array.isArray(files) || files.length === 0) && !isGeneratingFiles && (
                 <p className="text-white" style={{marginTop: '20px'}}>
                    No configuration files found or generated. If you expected files,
                    please check the previous steps or logs.
                </p>
            )}
            {Array.isArray(files) && files.length > 0 && (
                <div className="card-container">
                {files.map((file) => (
                  <motion.div
                    key={file.name}
                    ref={el => cardRefs.current[file.name] = el}
                    className="pipeline-card" // Ensure this class provides adequate styling
                    whileHover={{ y: -5 }}
                  >
                    <div className="flex-grow"> {/* Corrected from flex-grow-1 */}
                      <h2 className="text-lg font-semibold text-white mb-3">{file.name}</h2>
                    </div>
                    <div className="flex flex-col items-end space-y-2 mt-auto">
                      <button onClick={() => toggleView(file.name)} className="button-home-card">View</button>
                      <button onClick={() => handleEditClick(file)} className="button-home-card">Edit with GenAI</button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        <AnimatePresence>
          {isViewing && expandedFile && (
            <Modal
              isOpen={isViewing}
              onClose={handleCloseViewModal}
              title={expandedFile.name}
              footer={
                <button onClick={handleCloseViewModal} className="button-home">
                  Close
                </button>
              }
            >
              <pre className="code-block view-code-block">
                {expandedFile.code}
              </pre>
            </Modal>
          )}

          {isEditing && editingFile && (
            <Modal
              isOpen={isEditing}
              onClose={handleCloseEditModal}
              title={`Edit: ${editingFile.name}`}
              footer={
                <>
                  <button onClick={handleCloseEditModal} className="button-home">
                    Cancel
                  </button>
                  <button
                    onClick={handleEditSubmit}
                    className="button-home" // Ensure this class is styled appropriately
                    disabled={!editPrompt.trim()}
                  >
                    Submit Edit
                  </button>
                </>
              }
            >
              <div className="mb-4">
                <label htmlFor="currentCodePreview" className="form-label">Current File Content:</label>
                <pre id="currentCodePreview" className="code-block max-h-40 sm:max-h-60 md:max-h-80 lg:max-h-96 overflow-y-auto">
                  {editingFile.code}
                </pre>
              </div>
              <div className="mb-0"> {/* Changed from mb-4 to mb-0 if it's the last element */}
                <label htmlFor="editPromptInput" className="form-label">Your Instructions (AI Edit Prompt):</label>
                <textarea
                  id="editPromptInput"
                  className="form-control" // Ensure this class provides textarea styling
                  rows={7}
                  value={editPrompt}
                  onChange={(e) => setEditPrompt(e.target.value)}
                  placeholder="e.g., Refactor this function for clarity, add error handling for X..."
                />
              </div>
            </Modal>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Dashboard;