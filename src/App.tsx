import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import Home from "./pages/Home";
import Schedule from "./pages/Schedule";
import Journal from "./pages/Journal";
import Help from "./pages/Help";
import Login from "./pages/Login";
import Profile from "./pages/Profile";
import PhysicianDashboard from "./pages/physician/PhysicianDashboard";
import BottomNav from "./components/layout/BottomNav";
import { AuthProvider, useAuth } from "./context/AuthContext";



const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
};

const AppRoutes = () => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  return (
    <div className={`min-h-screen bg-gray-50 ${location.pathname.startsWith('/physician') ? 'w-full' : 'max-w-md mx-auto'} relative`}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
        <Route path="/schedule" element={<ProtectedRoute><Schedule /></ProtectedRoute>} />
        <Route path="/journal" element={<ProtectedRoute><Journal /></ProtectedRoute>} />
        <Route path="/help" element={<ProtectedRoute><Help /></ProtectedRoute>} />
        <Route path="/physician" element={<PhysicianDashboard />} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
      {isAuthenticated && !location.pathname.startsWith('/physician') && <BottomNav />}
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;
