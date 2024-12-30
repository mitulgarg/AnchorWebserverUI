import React, { useState } from "react";
import "./Form.css"; // Add styles in a separate CSS file
import NavHead from "../Home/NavHead/NavHead.js";
import { useNavigate } from "react-router-dom";  // Import useNavigate

const Form = () => {
  const [formData, setFormData] = useState({
    cloudProvider: "",
    serviceType: "",
    appPath: "",
    region: "",
    scmProvider: "",
  });

  const navigate = useNavigate();  // Initialize the navigate function

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();  // Prevent form from reloading the page
    console.log("Form Submitted:", formData);  // Log the form data
    // Navigate to /main after submission
    navigate("/main", { state: formData });  
  };

  return (
    <div>
      <NavHead />
      <div className="form-container">
        <h1>Customize Your Pipeline with just a few simple inputs!</h1>
        <form className="form-content" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="cloudProvider">Cloud Provider</label>
            <select
              id="cloudProvider"
              name="cloudProvider"
              value={formData.cloudProvider}
              onChange={handleChange}
              required
            >
              <option value="">Select Cloud Provider</option>
              <option value="AWS">AWS</option>
              <option value="Azure">Azure</option>
              <option value="GCP">Google Cloud Platform</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="serviceType">Service Type</label>
            <select
              id="serviceType"
              name="serviceType"
              value={formData.serviceType}
              onChange={handleChange}
              required
            >
              <option value="">Select Service Type</option>
              <option value="EC2">EC2 Only</option>
              <option value="EC2_EKS">EC2 and EKS</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="appPath">Path of Application</label>
            <input
              type="text"
              id="appPath"
              name="appPath"
              value={formData.appPath}
              onChange={handleChange}
              placeholder="e.g., /path/to/application"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="region">AWS Region</label>
            <select
              id="region"
              name="region"
              value={formData.region}
              onChange={handleChange}
              required
            >
              <option value="">Select AWS Region</option>
              <option value="us-east-1">US East (N. Virginia)</option>
              <option value="us-west-1">US West (N. California)</option>
              <option value="eu-central-1">EU (Frankfurt)</option>
              <option value="ap-south-1">Asia Pacific (Mumbai)</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="scmProvider">Source Control</label>
            <select
              id="scmProvider"
              name="scmProvider"
              value={formData.scmProvider}
              onChange={handleChange}
              required
            >
              <option value="">Select SCM Provider</option>
              <option value="Github">Github</option>
              <option value="Bitbucket">Bitbucket</option>
            </select>
          </div>

          <button type="submit" className="form-submit-button">
            Submit Configuration
          </button>
        </form>
      </div>
    </div>
  );
};

export default Form;
