import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing.jsx';
import ShiftEazeEnterpriseApp from './apps/enterprise/ShiftEazeEnterpriseApp.jsx';
import TrainerMobileApp from './apps/trainer/TrainerMobileApp.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/dashboard/*" element={<ShiftEazeEnterpriseApp />} />
      <Route path="/trainer/*" element={<TrainerMobileApp />} />
      <Route path="/employee/*" element={<Navigate to="/trainer" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
