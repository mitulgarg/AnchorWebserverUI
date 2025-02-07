import React, { useState } from "react";
import './Agent.css';
import NavHead from "../Home/NavHead/NavHead.js";
import { motion } from "framer-motion";
import Card from "react-bootstrap/Card";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";


const Agent = () => {
  const [temples, setTemples] = useState([]);
  const [flip, setFlip] = useState(false);
  const [query, setQuery] = useState("");
  const [templestwo, setTemplestwo] = useState([]);

  const handleSearch = () => {
    if (query) {
      const filteredTemples = temples.filter((temple) =>
        temple.temple_name.toString().toLowerCase().includes(query.toString().toLowerCase())
      );
      setTemplestwo(filteredTemples);
      console.log(filteredTemples);
    }
    if(query===""){
      setTemplestwo(temples)
    }
  };

  return (
    <div>
      <NavHead />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="d-flex justify-content-center align-items-center min-vh-100 bg-light"
      >
        <Card style={{ height: '75vh' , width:"120vh"}} className="w-180 max-w-md p-4 shadow-lg rounded-3 bg-white">
          <Card.Body className="d-flex flex-column gap-3">
            {/* Chat Display */}
            <div className="h-64 overflow-auto p-3 bg-light rounded shadow-sm">
              <div className="text-secondary small"><img style={{height:'45px' , width:'45px'}}src="/ChatBot-Logo.png"></img> : How can I assist you today?</div>
            </div>


            {/* Buttons */}

            <div className="d-flex justify-content-center gap-2">
              <Button variant="secondary">CI/CD Setup</Button>
              <Button variant="secondary">Resource Modification/Creation</Button>
              <Button variant="secondary">Observability</Button>
            </div>


            <div style={{"marginTop":"42%"}}>



            {/* Input Form */}
            <div className="d-flex gap-2">
              <Form.Control
                type="text"
                placeholder="Type your message..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              
              <Button variant="primary" onClick={handleSearch}>
                Send
              </Button>
            </div>
            </div>
          </Card.Body>
        </Card>
      </motion.div>
    </div>
  );
};

export default Agent;
