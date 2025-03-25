import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Card from "react-bootstrap/Card";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCog, faSave, faEye, faEyeSlash } from "@fortawesome/free-solid-svg-icons";
import NavHead from "../Home/NavHead/NavHead.js";
import './SettingsPage.css'

const SettingsPage = () => {
  const [publicKey, setPublicKey] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [showPublicKey, setShowPublicKey] = useState(false);
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');

  // Load saved keys from localStorage on component mount
  useEffect(() => {
    const savedPublicKey = localStorage.getItem('acube-public-key');
    const savedPrivateKey = localStorage.getItem('acube-private-key');
    
    if (savedPublicKey) setPublicKey(savedPublicKey);
    if (savedPrivateKey) setPrivateKey(savedPrivateKey);
  }, []);

  const handleSaveKeys = () => {
    // Basic validation
    if (!publicKey.trim() || !privateKey.trim()) {
      setSaveStatus('Please enter both public and private keys');
      return;
    }

    try {
      // Save keys to localStorage
      localStorage.setItem('acube-public-key', publicKey);
      localStorage.setItem('acube-private-key', privateKey);
      
      setSaveStatus('Keys saved successfully!');
      
      // Clear status message after 3 seconds
      setTimeout(() => setSaveStatus(''), 3000);
    } catch (error) {
      setSaveStatus('Error saving keys');
      console.error('Error saving keys:', error);
    }
  };

  return (
    <div className="settings-fullscreen">
      <NavHead />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.75 }}
        className="settings-container"
      >
        <Card className="settings-card">
          <Card.Header className="settings-header">
            <h2>
              <FontAwesomeIcon icon={faCog} /> Acube Settings
            </h2>
          </Card.Header>
          <Card.Body className="settings-card-body">
            <div className="key-input-container">
              <div className="key-input-group">
                <label htmlFor="public-key">Public Key</label>
                <div className="input-with-toggle">
                  <input
                    type={showPublicKey ? "text" : "password"}
                    id="public-key"
                    value={publicKey}
                    onChange={(e) => setPublicKey(e.target.value)}
                    placeholder="Enter your public key"
                    className="key-input"
                  />
                  <button 
                    onClick={() => setShowPublicKey(!showPublicKey)}
                    className="toggle-visibility-btn"
                  >
                    <FontAwesomeIcon icon={showPublicKey ? faEyeSlash : faEye} />
                  </button>
                </div>
              </div>

              <div className="key-input-group">
                <label htmlFor="private-key">Private Key</label>
                <div className="input-with-toggle">
                  <input
                    type={showPrivateKey ? "text" : "password"}
                    id="private-key"
                    value={privateKey}
                    onChange={(e) => setPrivateKey(e.target.value)}
                    placeholder="Enter your private key"
                    className="key-input"
                  />
                  <button 
                    onClick={() => setShowPrivateKey(!showPrivateKey)}
                    className="toggle-visibility-btn"
                  >
                    <FontAwesomeIcon icon={showPrivateKey ? faEyeSlash : faEye} />
                  </button>
                </div>
              </div>

              {saveStatus && (
                <div className={`save-status ${saveStatus.includes('successfully') ? 'success' : 'error'}`}>
                  {saveStatus}
                </div>
              )}

              <div className="settings-actions">
                <button 
                  onClick={handleSaveKeys}
                  className="save-keys-btn"
                >
                  <FontAwesomeIcon icon={faSave} /> Save Keys
                </button>
              </div>
            </div>
          </Card.Body>
        </Card>
      </motion.div>
    </div>
  );
};

export default SettingsPage;