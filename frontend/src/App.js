import { BrowserRouter as Router, Routes, Route } from "react-router-dom";  
import Login from "./components/authpage/Login";

function App() {
  return (
    <Router>
      <div className="text-[#1d4d85] app min-w-[280px] min-h-screen bg-background">
        <Routes>
          <Route path="/" element={<Login />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
