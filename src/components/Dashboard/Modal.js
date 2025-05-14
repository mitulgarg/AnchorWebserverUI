import React from "react";
import { motion, AnimatePresence } from "framer-motion";
// Assuming Dashboard.css is imported in your main App.js or index.js
// import './Dashboard.css'; // Or import CSS here if standalone

const Modal = ({ isOpen, onClose, title, children, footer }) => {
  // AnimatePresence is handled in the parent (Dashboard.js)
  if (!isOpen) return null; // Render null when closed

  return (
    <motion.div
      className="modal-overlay" // Styles handle fixed position and centering
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }} // Exit animation handled by AnimatePresence in parent
      transition={{ duration: 0.2 }}
      onClick={onClose} // Close when clicking the overlay
    >
      <motion.div
        className="modal-content" // Styles handle max-width, background, shadow, etc.
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }} // Exit animation handled by AnimatePresence in parent
        transition={{ duration: 0.2 }}
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside modal
      >
        <div className="modal-header">
          <h2 className="text-xl font-bold text-white">{title}</h2> {/* Use h2 for accessibility */}
          <button
            onClick={onClose}
            className="close-button"
            aria-label="Close"
          >
            &times;
          </button>
        </div>
        {/* The main content area, which should scroll if needed */}
        <div className="modal-body">
          {children}
        </div>
        {/* Optional footer for buttons, passed as a prop */}
        {footer && (
          <div className="button-container">
            {footer}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default Modal;


// import React from "react";
// import { motion, AnimatePresence } from "framer-motion";
// // Assuming Dashboard.css is imported in your main App.js or index.js
// // import './Dashboard.css'; // Or import CSS here if standalone

// const Modal = ({ isOpen, onClose, title, children, footer }) => {
//   // Using AnimatePresence inside the component conditionally rendering itself
//   // is a valid pattern for exit animations when the component is removed from the DOM.
//   // However, AnimatePresence is typically used around components that are added/removed
//   // within a parent. A simpler way is to have AnimatePresence in the parent (Dashboard)
//   // and let it manage the Modal component itself. Let's revert to the Dashboard handling AnimatePresence.

//   if (!isOpen) return null; // Render null when closed

//   return (
//     // Note: AnimatePresence moved back to Dashboard.js for correct exit animation handling
//     <motion.div
//       className="modal-overlay" // Styles handle fixed position and centering
//       initial={{ opacity: 0 }}
//       animate={{ opacity: 1 }}
//       exit={{ opacity: 0 }} // Exit animation handled by AnimatePresence in parent
//       transition={{ duration: 0.2 }}
//       onClick={onClose} // Close when clicking the overlay
//     >
//       <motion.div
//         className="modal-content" // Styles handle max-width, background, shadow, etc.
//         initial={{ opacity: 0, scale: 0.95 }}
//         animate={{ opacity: 1, scale: 1 }}
//         exit={{ opacity: 0, scale: 0.95 }} // Exit animation handled by AnimatePresence in parent
//         transition={{ duration: 0.2 }}
//         onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside modal
//       >
//         <div className="modal-header">
//           <h2 className="text-xl font-bold text-white">{title}</h2> {/* Use h2 for accessibility */}
//           <button
//             onClick={onClose}
//             className="close-button"
//             aria-label="Close"
//           >
//             &times;
//           </button>
//         </div>
//         {/* The main content area, which should scroll if needed */}
//         <div className="modal-body">
//           {children}
//         </div>
//         {/* Optional footer for buttons, passed as a prop */}
//         {footer && (
//           <div className="button-container">
//             {footer}
//           </div>
//         )}
//       </motion.div>
//     </motion.div>
//   );
// };

// export default Modal;


// import React from "react";
// import { motion, AnimatePresence } from "framer-motion";
// // Assuming Dashboard.css is imported in your main App.js or index.js
// // or you can import it here if modal styles are truly standalone,
// // but based on the provided CSS, it's mixed with dashboard styles.
// // import './Dashboard.css'; 

// const Modal = ({ isOpen, onClose, title, children, footer }) => {
//   if (!isOpen) return null;

//   // Prevent scrolling on the body when the modal is open (optional but good UX)
//   // You might want to manage this in a useEffect in the component that uses the modal
//   // document.body.style.overflow = 'hidden'; 
//   // Cleanup: document.body.style.overflow = 'unset'; 

//   return (
//     <AnimatePresence>
//       {isOpen && (
//         <motion.div
//           className="modal-overlay" // Styles handle fixed position and centering
//           initial={{ opacity: 0 }}
//           animate={{ opacity: 1 }}
//           exit={{ opacity: 0 }}
//           transition={{ duration: 0.2 }}
//           onClick={onClose} // Close when clicking the overlay
//         >
//           <motion.div
//             className="modal-content" // Styles handle max-width, background, shadow, etc.
//             initial={{ opacity: 0, scale: 0.95 }}
//             animate={{ opacity: 1, scale: 1 }}
//             exit={{ opacity: 0, scale: 0.95 }}
//             transition={{ duration: 0.2 }}
//             onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside modal
//           >
//             <div className="modal-header">
//               {/* Use a standard h2 or h3 for accessibility */}
//               <h2 className="text-xl font-bold text-white">{title}</h2>
//               <button
//                 onClick={onClose}
//                 className="close-button"
//                 aria-label="Close"
//               >
//                 &times;
//               </button>
//             </div>
//             {/* The main content area, which should scroll if needed */}
//             <div className="modal-body">
//               {children}
//             </div>
//             {/* Optional footer for buttons, passed as a prop */}
//             {footer && (
//               <div className="button-container">
//                 {footer}
//               </div>
//             )}
//           </motion.div>
//         </motion.div>
//       )}
//     </AnimatePresence>
//   );
// };

// export default Modal;