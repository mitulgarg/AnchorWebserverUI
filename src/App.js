import './App.css';
import { BrowserRouter, Route, Routes } from "react-router-dom";

import Main from './components/Main/Main.js';
import Home from './components/Home/Home.js';
import Form from './components/Form/Form.js';
import Agent from './components/Agent/Agent.js';

const App = () => {

  return (

    <BrowserRouter>
      <Routes>
        <Route path="/home" element={<Home />} />
        <Route path="/main" element={<Main />} />
        <Route path="/forms" element={<Form />} />
        <Route path="/acube" element={<Agent />} />
      </Routes>
    </BrowserRouter>

  );
};

export default App;