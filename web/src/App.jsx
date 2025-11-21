import { Container } from '@mui/material';
import UserView from './components/UserView';
import OnlineView from './components/OnlineView';
import DataView from './components/DataView';
import Login from './components/Login';
import Register from './components/Register';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from './contexts/AuthContext';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected routes */}
          <Route path="/*" element={
            <ProtectedRoute>
              <>
                <Navbar />
                <Container maxWidth="md" style={{ marginTop: '40px' }}>
                  <Routes>
                    <Route path="/" element={<UserView />} />
                    <Route path="/online" element={<OnlineView />} />
                    <Route path="/data" element={<DataView />} />
                    <Route path="/weekly" element={<div>Weekly Stats - Coming Soon</div>} />
                    <Route path="/calendar" element={<div>Calendar - Coming Soon</div>} />
                    <Route path="/admin/users" element={<div>User Management - Coming Soon</div>} />
                  </Routes>
                </Container>
              </>
            </ProtectedRoute>
          } />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;