import './App.css';
import { BrowserRouter, Route, Routes } from "react-router-dom";

import Main from './components/Main/Main.js';

const App = () => {

  return (

    <BrowserRouter>
      <Routes>
        <Route path="/main" element={<Main />} />
      </Routes>
    </BrowserRouter>

  );
};

export default App;