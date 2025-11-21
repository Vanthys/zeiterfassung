import OnlineView from './components/OnlineView';
import DataView from './components/DataView';
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import Register from './components/Register';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from './contexts/AuthContext';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected routes with layout */}
          <Route path="/" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={<Dashboard />} />
            <Route path="online" element={<OnlineView />} />
            <Route path="data" element={<DataView />} />
            <Route path="weekly" element={<div>Weekly Stats - Coming Soon</div>} />
            <Route path="calendar" element={<div>Calendar - Coming Soon</div>} />

            {/* Admin routes */}
            <Route path="admin/users" element={
              <AdminRoute>
                <div>User Management - Coming Soon</div>
              </AdminRoute>
            } />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;