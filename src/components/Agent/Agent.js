import React, { useState } from "react";
import './Agent.css';
import NavHead from "../Home/NavHead/NavHead.js";
import { motion } from "framer-motion";
import Card from "react-bootstrap/Card";
import Button from "react-bootstrap/Button";
import { Link } from 'react-router-dom';
import InputForm from './InputForm/InputForm.js';


const Agent = () => {
  const [query, setQuery] = useState("");

  const handleSearch = () => {
    if (query) {
      console.log(query);
    }
  };

  return (
    <div>
      <NavHead />
      {/* Static Background */}
      <div className="d-flex justify-content-center align-items-center min-vh-100">
        {/* Motion applied to the card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.75 }}
        >
          <Card style={{ height: '700px', width: '800px' }} className="w-180 max-w-md p-4 shadow-lg rounded-3 bg-black">
            <Card.Body className="d-flex flex-column gap-3">

              <div className="h-64 overflow-auto p-3 bg-black rounded shadow-sm">
                <div className="text-secondary small">
                  <img
                    className="chatbot-logo"
                    src="/ChatBot-Logo.png"
                    alt="ChatBot Logo"
                  />
    <span className="ms-3 text-white fs-5"> How can I assist you today?</span>
                </div>
              </div>


              <div className="d-flex justify-content-center gap-2">
                <Button variant="secondary">Option 1</Button>
                <Button variant="secondary">Option 2</Button>
                <Button variant="secondary">Option 3</Button>
              </div>


              <div className="mt-auto">
              <InputForm />
              </div>
            </Card.Body>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default Agent;

