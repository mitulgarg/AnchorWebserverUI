import React, { useState } from "react";
import "./InputForm.css";

const InputForm = ({ onSend, formColor, disabled }) => {
  const [message, setMessage] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!disabled && message.trim()) {
      onSend(message);
      setMessage(""); // Clear the input field
    }
  };

  return (
    <div
      className={`chat-input-container ${formColor}`}
      style={{
        opacity: disabled ? 0.5 : 1, // Grey out when disabled
        pointerEvents: disabled ? "none" : "auto", // Block interaction when disabled
      }}
    >
      <form onSubmit={handleSubmit} className="chat-form">
        <input
          type="text"
          placeholder="Type your message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="chat-input"
          disabled={disabled} // Disable input field
        />
        <button type="submit" className="chat-submit-button" disabled={disabled}>
          Send
        </button>
      </form>
    </div>
  );
};

export default InputForm;

// import React from "react";
// import "./InputForm.css";

// const InputForm = ({ onSend, formColor, disabled }) => {
//   const [inputValue, setInputValue] = React.useState("");

//   const handleInputChange = (event) => {
//     setInputValue(event.target.value);
//   };

//   const handleFormSubmit = (event) => {
//     event.preventDefault();
//     if (!disabled && inputValue.trim()) {
//       onSend(inputValue);
//       setInputValue("");
//     }
//   };

//   return (
//     <form
//       onSubmit={handleFormSubmit}
//       className={`input-form ${formColor}`}
//       style={{
//         opacity: disabled ? 0.5 : 1, // Greyed out when disabled
//         pointerEvents: disabled ? "none" : "auto", // Prevent interaction when disabled
//       }}
//     >
//       <input
//         type="text"
//         className="form-control"
//         placeholder="Type your response..."
//         value={inputValue}
//         onChange={handleInputChange}
//         disabled={disabled} // Disable input field
//       />
//       <button type="submit" className="btn btn-primary" disabled={disabled}>
//         Send
//       </button>
//     </form>
//   );
// };

// export default InputForm;




// import React, { useState } from "react";
// import "./InputForm.css";
// const InputForm = ({ onSend, formColor }) => {
//   const [message, setMessage] = useState("");

//   const handleSubmit = (e) => {
//     e.preventDefault();
//     if (message.trim()) {
//       onSend(message);
//       setMessage(""); // Clear the input field
//     }
//   };

//   return (
//     <div className={`chat-input-container ${formColor}`}>
//       <form onSubmit={handleSubmit} className="chat-form">
//         <input
//           type="text"
//           placeholder="Type your message..."
//           value={message}
//           onChange={(e) => setMessage(e.target.value)}
//           className="chat-input"
//         />
//         <button type="submit" className="chat-submit-button">
//           Send
//         </button>
//       </form>
//     </div>
//   );
// };

// export default InputForm;