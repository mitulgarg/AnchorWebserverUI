import React, { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion"; // Import AnimatePresence here
import './Dashboard.css'; // Keep CSS here
import Modal from './Modal'; // Import the new Modal component

const Dashboard = () => {
  const [files, setFiles] = useState([]);
  const [expandedFile, setExpandedFile] = useState(null); // Data for the View modal
  const [editingFile, setEditingFile] = useState(null); // Data for the Edit modal
  const [editPrompt, setEditPrompt] = useState("");
  const [isEditing, setIsEditing] = useState(false); // State to control Edit modal visibility
  const [isViewing, setIsViewing] = useState(false); // State to control View modal visibility

  // useRef is not strictly needed for the modal logic itself, but keeping it if it's used elsewhere
  const cardRefs = useRef({});

  // --- Function to fetch files ---
  const fetchFiles = async () => {
      try {
          console.log("Fetching dashboard file data...");
          const res = await fetch("http://localhost:8000/dashboard-file-data");
          if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
          }
          const data = await res.json();
          console.log("Data fetched:", data);
          setFiles(data); // Update the main files state
          return data; // Return the fetched data
      } catch (err) {
          console.error("Error fetching files:", err);
          // Optionally set an error state to display a message to the user
          // e.g., setError("Failed to load files.");
      }
  };

  // --- Initial data fetch on mount ---
  useEffect(() => {
    fetchFiles();
  }, []); // Empty dependency array means this runs only once on mount

  const toggleView = (filename) => {
    // Find the file from the *current* state
    const file = files.find(f => f.name === filename);
    if (file) {
      setExpandedFile(file);
      setIsViewing(true);
    }
  };

  const handleEditClick = (file) => {
    setEditingFile(file);
    setEditPrompt(""); // Reset prompt when opening
    setIsEditing(true);
  };

  const handleCloseViewModal = () => {
    setIsViewing(false);
    // Delay clearing expandedFile state slightly to allow exit animation to start
    setTimeout(() => setExpandedFile(null), 200); // Match modal transition duration
  };

  const handleCloseEditModal = () => {
    setIsEditing(false);
    // Delay clearing editingFile state slightly to allow exit animation to start
    setTimeout(() => {
        setEditingFile(null); // Clear data when closing
        setEditPrompt(""); // Clear prompt when closing
    }, 200); // Match modal transition duration
  };


  const handleEditSubmit = async () => {
    if (!editPrompt.trim() || !editingFile) {
      console.warn("Edit prompt is empty or no file selected.");
      return; // Prevent submission if prompt is empty or no file
    }

    console.log("Submitting edit for:", editingFile.name, "Prompt:", editPrompt);

    try {
      const response = await fetch("http://localhost:8000/edit-file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: editingFile.name,
          original_code: editingFile.code, // Send original code as context (optional, depending on backend)
          prompt: editPrompt,
        }),
      });

      if (!response.ok) {
        // Attempt to read error message from response
        const errorData = await response.json().catch(() => ({ message: `HTTP error! status: ${response.status}` }));
        console.error("Error submitting edit:", response.status, errorData.message);
        alert(`Failed to edit file: ${errorData.message}`); // Provide user feedback
        return;
      }

      // Edit successful
      console.log("Edit successful. Re-fetching data...");

      // Get the filename of the file that was edited BEFORE closing the modal state
      const editedFilename = editingFile.name;

      handleCloseEditModal(); // Close the edit modal first (allows exit animation to start)

      // --- FIX: Re-fetch all files after successful edit ---
      // We await fetchFiles to ensure the state is updated before we try to find the edited file
      const newFilesData = await fetchFiles(); // fetchFiles updates the 'files' state

      // After fetching, find the updated file in the *new* data that was just set to state
      const latestFile = newFilesData?.find(f => f.name === editedFilename);

      // Use a small delay before opening the view modal to allow the edit modal animation
      setTimeout(() => {
          if (latestFile) {
             // Set the expanded file directly using the found latest data
             setExpandedFile(latestFile);
             // Open the view modal
             setIsViewing(true);
             console.log("Opening view modal with re-fetched updated file:", latestFile.name);
          } else {
             console.warn("Edited file not found in the re-fetched list after edit:", editedFilename);
             // Handle case where the edited file might be missing after re-fetch (unlikely but safe)
             // Maybe just show a success message here instead of opening the view modal
             alert("File edited successfully, but could not find it to display the updated version.");
          }
      }, 250); // Adjust delay if needed based on modal close animation duration
      // --- END FIX ---


    } catch (err) {
      // This catch block handles errors from the POST request OR the subsequent fetchFiles call
      console.error("Network or unexpected error during edit or re-fetch:", err);
      alert("An unexpected error occurred.");
    }
  };

  return (
    <div className="home-container">
      <div className="content-container">
        <h1 className="header-card">Review Config Files</h1>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.75 }}
        >
          <div className="card-container">
            {/* Check if files is an array before mapping */}
            {Array.isArray(files) && files.map((file) => (
              <motion.div
                key={file.name}
                ref={el => cardRefs.current[file.name] = el}
                className="pipeline-card"
                whileHover={{ y: -5 }}
              >
                <div className="flex-grow">
                  <h2 className="text-lg font-semibold text-white mb-3">{file.name}</h2>
                </div>
                {/* This div contains the buttons in the card - should be visible */}
                {/* Updated classes to match the new CSS button styles */}
                <div className="flex flex-col items-end space-y-2 mt-auto">
                  <button onClick={() => toggleView(file.name)} className="button-home-card">View</button>
                  <button onClick={() => handleEditClick(file)} className="button-home-card">Edit with GenAI</button>
                </div>
              </motion.div>
            ))}
            {/* Add a loading state/indicator if needed */}
             {!Array.isArray(files) || files.length === 0 && (
              <p className="text-white">Loading files or no files available...</p>
            )}
          </div>
        </motion.div>

        {/* Use AnimatePresence around the conditionally rendered Modals */}
        <AnimatePresence>
            {/* View Modal */}
            {isViewing && expandedFile && (
                <Modal
                  isOpen={isViewing}
                  onClose={handleCloseViewModal} // Use dedicated close handler
                  title={expandedFile.name}
                  footer={
                    <button onClick={handleCloseViewModal} className="button-home">
                      Close
                    </button>
                  }
                >
                  {/* Children content for the modal body */}
                  {/* The <pre> tag automatically updates when expandedFile.code changes */}
                  <pre className="code-block view-code-block">
                    {expandedFile.code}
                  </pre>
                </Modal>
            )}

            {/* Edit Modal */}
            {isEditing && editingFile && (
                <Modal
                  isOpen={isEditing}
                  onClose={handleCloseEditModal} // Use dedicated close handler
                  title={`Edit: ${editingFile.name}`}
                  footer={ // Pass buttons to the footer prop
                    <>
                      <button onClick={handleCloseEditModal} className="button-home">
                        Cancel
                      </button>
                      <button
                        onClick={handleEditSubmit}
                        className="button-home"
                        disabled={!editPrompt.trim()} // Disable if prompt is empty
                      >
                        Submit Edit
                      </button>
                    </>
                  }
                >
                  {/* Children content for the modal body */}
                  <div className="mb-4">
                    <label htmlFor="currentCodePreview" className="form-label">Current File Content:</label>
                    <pre id="currentCodePreview" className="code-block max-h-40 sm:max-h-60 md:max-h-80 lg:max-h-96 overflow-y-auto">
                      {editingFile.code}
                    </pre>
                  </div>
                  <div className="mb-0">
                    <label htmlFor="editPromptInput" className="form-label">Your Instructions (AI Edit Prompt):</label>
                    <textarea
                      id="editPromptInput"
                      className="form-control"
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


// import React, { useEffect, useState, useRef } from "react";
// import { motion, AnimatePresence } from "framer-motion"; // Import AnimatePresence here
// import './Dashboard.css'; // Keep CSS here
// import Modal from './Modal'; // Import the new Modal component

// const Dashboard = () => {
//   const [files, setFiles] = useState([]);
//   const [expandedFile, setExpandedFile] = useState(null); // Data for the View modal
//   const [editingFile, setEditingFile] = useState(null); // Data for the Edit modal
//   const [editPrompt, setEditPrompt] = useState("");
//   const [isEditing, setIsEditing] = useState(false); // State to control Edit modal visibility
//   const [isViewing, setIsViewing] = useState(false); // State to control View modal visibility

//   // useRef is not strictly needed for the modal logic itself, but keeping it if it's used elsewhere
//   const cardRefs = useRef({});

//   useEffect(() => {
//     // Fetch data on component mount
//     fetch("http://localhost:8000/dashboard-file-data")
//       .then((res) => {
//         if (!res.ok) {
//           throw new Error(`HTTP error! status: ${res.status}`);
//         }
//         return res.json();
//       })
//       .then((data) => setFiles(data))
//       .catch((err) => console.error("Error fetching files:", err));
//   }, []); // Empty dependency array means this runs only once on mount

//   const toggleView = (filename) => {
//     // Find the file from the *current* state
//     const file = files.find(f => f.name === filename);
//     if (file) {
//       setExpandedFile(file);
//       setIsViewing(true);
//     }
//   };

//   const handleEditClick = (file) => {
//     setEditingFile(file);
//     setEditPrompt(""); // Reset prompt when opening
//     setIsEditing(true);
//   };

//   const handleCloseViewModal = () => {
//     setIsViewing(false);
//     // Delay clearing expandedFile state slightly to allow exit animation to start
//     setTimeout(() => setExpandedFile(null), 200); // Match modal transition duration
//   };

//   const handleCloseEditModal = () => {
//     setIsEditing(false);
//     // Delay clearing editingFile state slightly to allow exit animation to start
//     setTimeout(() => {
//         setEditingFile(null); // Clear data when closing
//         setEditPrompt(""); // Clear prompt when closing
//     }, 200); // Match modal transition duration
//   };


//   const handleEditSubmit = async () => {
//     if (!editPrompt.trim() || !editingFile) {
//       console.warn("Edit prompt is empty or no file selected.");
//       return; // Prevent submission if prompt is empty or no file
//     }

//     console.log("Submitting edit for:", editingFile.name, "Prompt:", editPrompt);

//     try {
//       const response = await fetch("http://localhost:8000/edit-file", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           filename: editingFile.name,
//           original_code: editingFile.code, // Send original code as context (optional, depending on backend)
//           prompt: editPrompt,
//         }),
//       });

//       if (!response.ok) {
//         // Attempt to read error message from response
//         const errorData = await response.json().catch(() => ({ message: `HTTP error! status: ${response.status}` }));
//         console.error("Error submitting edit:", response.status, errorData.message);
//         alert(`Failed to edit file: ${errorData.message}`); // Provide user feedback
//         return;
//       }

//       const data = await response.json();
//       console.log("Edit successful:", data);

//       // --- FIX: Update the state with the new code and then open the view modal ---
//       const updatedFiles = files.map((f) =>
//         f.name === data.filename ? { ...f, code: data.updated_code } : f
//       );
//       setFiles(updatedFiles); // Update the main file list state

//       handleCloseEditModal(); // Close the edit modal first

//       // Find the updated file from the *newly updated* state
//       const latestFile = updatedFiles.find(f => f.name === data.filename);

//       // After closing the edit modal (allowing animation), open the view modal with the latest file
//       // Use a small delay to ensure the edit modal has started closing
//       setTimeout(() => {
//           if (latestFile) {
//              toggleView(latestFile.name); // Use toggleView to set expandedFile and isViewing
//           }
//       }, 250); // Adjust delay if needed based on modal close animation duration

//     } catch (err) {
//       console.error("Network or unexpected error during edit:", err);
//       alert("An unexpected error occurred during file editing."); // Provide user feedback
//     }
//   };

//   return (
//     <div className="home-container">
//       <div className="content-container">
//         <h1 className="header-card">Dashboard Files</h1>
//         <motion.div
//           initial={{ opacity: 0, y: 20 }}
//           animate={{ opacity: 1, y: 0 }}
//           transition={{ duration: 0.75 }}
//         >
//           <div className="card-container">
//             {/* Check if files is an array before mapping */}
//             {Array.isArray(files) && files.map((file) => (
//               <motion.div
//                 key={file.name}
//                 ref={el => cardRefs.current[file.name] = el}
//                 className="pipeline-card"
//                 whileHover={{ y: -5 }}
//               >
//                 <div className="flex-grow">
//                   <h2 className="text-lg font-semibold text-white mb-3">{file.name}</h2>
//                 </div>
//                 {/* This div contains the buttons in the card - should be visible */}
//                 {/* Updated classes to match the new CSS button styles */}
//                 <div className="flex flex-col items-end space-y-2 mt-auto">
//                   <button onClick={() => toggleView(file.name)} className="button-home-card">View</button>
//                   <button onClick={() => handleEditClick(file)} className="button-home-card">Edit with GenAI</button>
//                 </div>
//               </motion.div>
//             ))}
//             {/* Add a loading state/indicator if needed */}
//              {!Array.isArray(files) || files.length === 0 && (
//               <p className="text-white">Loading files or no files available...</p>
//             )}
//           </div>
//         </motion.div>

//         {/* Use AnimatePresence around the conditionally rendered Modals */}
//         <AnimatePresence>
//             {/* View Modal */}
//             {isViewing && expandedFile && (
//                 <Modal
//                   isOpen={isViewing}
//                   onClose={handleCloseViewModal} // Use dedicated close handler
//                   title={expandedFile.name}
//                   footer={
//                     <button onClick={handleCloseViewModal} className="button-home">
//                       Close
//                     </button>
//                   }
//                 >
//                   {/* Children content for the modal body */}
//                   <pre className="code-block view-code-block">
//                     {expandedFile.code}
//                   </pre>
//                 </Modal>
//             )}

//             {/* Edit Modal */}
//             {isEditing && editingFile && (
//                 <Modal
//                   isOpen={isEditing}
//                   onClose={handleCloseEditModal} // Use dedicated close handler
//                   title={`Edit: ${editingFile.name}`}
//                   footer={ // Pass buttons to the footer prop
//                     <>
//                       <button onClick={handleCloseEditModal} className="button-home">
//                         Cancel
//                       </button>
//                       <button
//                         onClick={handleEditSubmit}
//                         className="button-home"
//                         disabled={!editPrompt.trim()} // Disable if prompt is empty
//                       >
//                         Submit Edit
//                       </button>
//                     </>
//                   }
//                 >
//                   {/* Children content for the modal body */}
//                   <div className="mb-4">
//                     <label htmlFor="currentCodePreview" className="form-label">Current File Content:</label>
//                     <pre id="currentCodePreview" className="code-block max-h-40 sm:max-h-60 md:max-h-80 lg:max-h-96 overflow-y-auto">
//                       {editingFile.code}
//                     </pre>
//                   </div>
//                   <div className="mb-0">
//                     <label htmlFor="editPromptInput" className="form-label">Your Instructions (AI Edit Prompt):</label>
//                     <textarea
//                       id="editPromptInput"
//                       className="form-control"
//                       rows={7}
//                       value={editPrompt}
//                       onChange={(e) => setEditPrompt(e.target.value)}
//                       placeholder="e.g., Refactor this function for clarity, add error handling for X..."
//                     />
//                   </div>
//                 </Modal>
//             )}
//         </AnimatePresence>
//       </div>
//     </div>
//   );
// };

// export default Dashboard;


// import React, { useEffect, useState, useRef } from "react";
// import { motion, AnimatePresence } from "framer-motion"; // Import AnimatePresence here
// import './Dashboard.css'; // Keep CSS here
// import Modal from './Modal'; // Import the new Modal component

// const Dashboard = () => {
//   const [files, setFiles] = useState([]);
//   const [expandedFile, setExpandedFile] = useState(null); // Data for the View modal
//   const [editingFile, setEditingFile] = useState(null); // Data for the Edit modal
//   const [editPrompt, setEditPrompt] = useState("");
//   const [isEditing, setIsEditing] = useState(false); // State to control Edit modal visibility
//   const [isViewing, setIsViewing] = useState(false); // State to control View modal visibility
  
//   // useRef is not strictly needed for the modal logic itself, but keeping it if it's used elsewhere
//   const cardRefs = useRef({});

//   useEffect(() => {
//     // Fetch data on component mount
//     fetch("http://localhost:8000/dashboard-file-data")
//       .then((res) => {
//         if (!res.ok) {
//           throw new Error(`HTTP error! status: ${res.status}`);
//         }
//         return res.json();
//       })
//       .then((data) => setFiles(data))
//       .catch((err) => console.error("Error fetching files:", err));
//   }, []); // Empty dependency array means this runs only once on mount

//   const toggleView = (filename) => {
//     const file = files.find(f => f.name === filename);
//     if (file) {
//       setExpandedFile(file);
//       setIsViewing(true);
//     }
//   };

//   const handleEditClick = (file) => {
//     setEditingFile(file);
//     setEditPrompt(""); // Reset prompt when opening
//     setIsEditing(true);
//   };

//   const handleCloseViewModal = () => {
//     setIsViewing(false);
//     // Delay clearing expandedFile state slightly to allow exit animation to start
//     setTimeout(() => setExpandedFile(null), 200); // Match modal transition duration
//   };

//   const handleCloseEditModal = () => {
//     setIsEditing(false);
//     // Delay clearing editingFile state slightly to allow exit animation to start
//     setTimeout(() => {
//         setEditingFile(null); // Clear data when closing
//         setEditPrompt(""); // Clear prompt when closing
//     }, 200); // Match modal transition duration
//   };

//   const handleEditSubmit = async () => {
//     if (!editPrompt.trim() || !editingFile) {
//       console.warn("Edit prompt is empty or no file selected.");
//       return; // Prevent submission if prompt is empty or no file
//     }

//     console.log("Submitting edit for:", editingFile.name, "Prompt:", editPrompt);

//     try {
//       const response = await fetch("http://localhost:8000/edit-file", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           filename: editingFile.name,
//           original_code: editingFile.code, // Send original code as context (optional, depending on backend)
//           prompt: editPrompt,
//         }),
//       });

//       if (!response.ok) {
//         // Attempt to read error message from response
//         const errorData = await response.json().catch(() => ({ message: `HTTP error! status: ${response.status}` }));
//         console.error("Error submitting edit:", response.status, errorData.message);
//         alert(`Failed to edit file: ${errorData.message}`); // Provide user feedback
//         return;
//       }

//       const data = await response.json();
//       console.log("Edit successful:", data);

//       // Update the state with the new code
//       const updatedFiles = files.map((f) =>
//         f.name === data.filename ? { ...f, code: data.updated_code } : f
//       );
//       setFiles(updatedFiles);

//       // Now directly set the updated file as the expanded file and open the View modal
//       const latestFile = updatedFiles.find(f => f.name === data.filename);
//       if (latestFile) {
//         setExpandedFile(latestFile); // Set the updated file directly
//         setIsViewing(true); // Open the View modal
//       }

//       handleCloseEditModal(); // Close the edit modal first

//     } catch (err) {
//       console.error("Network or unexpected error during edit:", err);
//       alert("An unexpected error occurred during file editing."); // Provide user feedback
//     }
//   };

//   return (
//     <div className="home-container">
//       <div className="content-container">
//         <h1 className="header-card">Dashboard Files</h1>
//         <motion.div
//           initial={{ opacity: 0, y: 20 }}
//           animate={{ opacity: 1, y: 0 }}
//           transition={{ duration: 0.75 }}
//         >
//           <div className="card-container">
//             {/* Check if files is an array before mapping */}
//             {Array.isArray(files) && files.map((file) => (
//               <motion.div
//                 key={file.name}
//                 ref={el => cardRefs.current[file.name] = el}
//                 className="pipeline-card"
//                 whileHover={{ y: -5 }}
//               >
//                 <div className="flex-grow">
//                   <h2 className="text-lg font-semibold text-white mb-3">{file.name}</h2>
//                 </div>
//                 {/* This div contains the buttons in the card - should be visible */}
//                 <div className="flex flex-col items-end space-y-2 mt-auto">
//                   <button onClick={() => toggleView(file.name)} className="button-home-card">View</button>
//                   <button onClick={() => handleEditClick(file)} className="button-home-card">Edit with GenAI</button>
//                 </div>
//               </motion.div>
//             ))}
//             {/* Add a loading state/indicator if needed */}
//             {!Array.isArray(files) || files.length === 0 && (
//               <p className="text-white">Loading files or no files available...</p>
//             )}
//           </div>
//         </motion.div>

//         {/* Use AnimatePresence around the conditionally rendered Modals */}
//         <AnimatePresence>
//             {/* View Modal */}
//             {isViewing && expandedFile && (
//                 <Modal
//                   isOpen={isViewing}
//                   onClose={handleCloseViewModal} // Use dedicated close handler
//                   title={expandedFile.name}
//                   footer={
//                     <button onClick={handleCloseViewModal} className="button-home">
//                       Close
//                     </button>
//                   }
//                 >
//                   {/* Children content for the modal body */}
//                   <pre className="code-block view-code-block">
//                     {expandedFile.code}
//                   </pre>
//                 </Modal>
//             )}

//             {/* Edit Modal */}
//             {isEditing && editingFile && (
//                 <Modal
//                   isOpen={isEditing}
//                   onClose={handleCloseEditModal} // Use dedicated close handler
//                   title={`Edit: ${editingFile.name}`}
//                   footer={ // Pass buttons to the footer prop
//                     <>
//                       <button onClick={handleCloseEditModal} className="button-home">
//                         Cancel
//                       </button>
//                       <button
//                         onClick={handleEditSubmit}
//                         className="button-home"
//                         disabled={!editPrompt.trim()} // Disable if prompt is empty
//                       >
//                         Submit Edit
//                       </button>
//                     </>
//                   }
//                 >
//                   {/* Children content for the modal body */}
//                   <div className="mb-4">
//                     <label htmlFor="currentCodePreview" className="form-label">Current File Content:</label>
//                     <pre id="currentCodePreview" className="code-block max-h-40 sm:max-h-60 md:max-h-80 lg:max-h-96 overflow-y-auto">
//                       {editingFile.code}
//                     </pre>
//                   </div>
//                   <div className="mb-0">
//                     <label htmlFor="editPromptInput" className="form-label">Your Instructions (AI Edit Prompt):</label>
//                     <textarea
//                       id="editPromptInput"
//                       className="form-control"
//                       rows={7}
//                       value={editPrompt}
//                       onChange={(e) => setEditPrompt(e.target.value)}
//                       placeholder="e.g., Refactor this function for clarity, add error handling for X..."
//                     />
//                   </div>
//                 </Modal>
//             )}
//         </AnimatePresence>
//       </div>
//     </div>
//   );
// };

// export default Dashboard;

