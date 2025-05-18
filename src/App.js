import './App.css';
import { BrowserRouter, Route, Routes } from "react-router-dom";

import Main from './components/Main/Main.js';
import Home from './components/Home/Home.js';
import Form from './components/Form/Form.js';
import Agent from './components/Agent/Agent.js';
import SettingsPage from './components/Settings/SettingsPage.js';
import Dashboard from './components/Dashboard/Dashboard.js';


const App = () => {

  return (

    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/main" element={<Main />} />
        <Route path="/forms" element={<Form />} />
        <Route path="/acube" element={<Agent />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/review-dashboard" element={<Dashboard />} />

      </Routes>
    </BrowserRouter>

  );
};

export default App;