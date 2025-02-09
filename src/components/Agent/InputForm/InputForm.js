import React, { useState } from "react";
import "./InputForm.css";

const InputForm = ({ onSend, formColor }) => {
  const [message, setMessage] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (message.trim()) {
      onSend(message);
      setMessage(""); // Clear the input field
    }
  };

  return (
    <div className={`chat-input-container ${formColor}`}>
      <form onSubmit={handleSubmit} className="chat-form">
        <input
          type="text"
          placeholder="Type your message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="chat-input"
        />
        <button type="submit" className="chat-submit-button">
          Send
        </button>
      </form>
    </div>
  );
};

export default InputForm;