import React, { useState } from "react";
import "./InputForm.css";

const InputForm = ({ onSend }) => {
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  
  const handleSubmit = (e) => {
    e.preventDefault();
    if (message.trim()) {
      onSend(message);
      setMessage(""); // Clear the input field
    }
  };

  const handleSearch = () => {
    if (query) {
      console.log(query);
    }
  };
  
  return (
    <div className="chat-input-container">
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


// import React, { useState } from "react";
// import "./InputForm.css";
// import Button from "react-bootstrap/Button";
// import Form from "react-bootstrap/Form";
// import { Link } from 'react-router-dom';



// const InputForm = ({ onSend }) => {
//   const [message, setMessage] = useState("");
//   const [query, setQuery] = useState("");

//   const handleSearch = () => {
//     if (query) {
//       console.log(query);
//     }
//   };
  
//   const handleSubmit = (e) => {
//     e.preventDefault();
//     if (message.trim()) {
//       onSend(message);
//       setMessage(""); // Clear the input field
//     }
//   };


//   return (
//     <div className="chat-input-container">
//       <Form onSubmit={handleSubmit} className="chat-form d-flex align-items-center">
//         <Form.Control
//                   type="text"
//                   placeholder="Type your message..."
//                   value={query}
//                   onChange={(e) => setQuery(e.target.value)}
//                   className="chat-input"
//         />
//         <Button type="submit" variant="primary" className="chat-submit-button">
//           Send
//         </Button>
//       </Form>

//       {/* <Form.Control
//                   type="text"
//                   placeholder="Type your message..."
//                   value={query}
//                   onChange={(e) => setQuery(e.target.value)}
//                 />

//               <Link className=" text-white text-decoration-none" to={`/forms`}>
//                   <button className="button-agent" onClick={handleSearch}>
//                     <FontAwesomeIcon icon={faArrowRight} />
//                     </button>
//               </Link> */}


//     </div>



//   );
// };

// export default InputForm;
