import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./contexts/ThemeContext";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import ScheduleOptimization from "./pages/ScheduleOptimization";
import ConflictPrediction from "./pages/ConflictPrediction";
import RoomAvailability from "./pages/RoomAvailability";
import LecturerOptimization from "./pages/LecturerOptimization";
import Fixed from "./pages/Fixed";

function App() {
  return (
    <ThemeProvider>
      <Router>
        <Layout>
          <Routes> {/* Wrap Routes with <Routes> */}
            <Route path="/" element={<Home />} />
            <Route path="/schedule" element={<ScheduleOptimization />} />
            <Route path="/conflict" element={<ConflictPrediction />} />
            <Route path="/rooms" element={<RoomAvailability />} />
            <Route path="/lecturer" element={<LecturerOptimization />} />
            <Route path="/fixed" element={<Fixed />} />
          </Routes> {/* Routes component should be inside Layout */}
        </Layout>
      </Router>
    </ThemeProvider>
  );
}

export default App;
