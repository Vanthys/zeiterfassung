import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Components
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import DataView from './components/DataView';
import OnlineView from './components/OnlineView';
import Settings from './components/Settings';
import Calendar from './components/Calendar';
import InviteManager from './components/InviteManager';
import CompanyOverview from './components/CompanyOverview';
import AuditLog from './components/AuditLog';
import Layout from './components/Layout';

// Theme definition
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
    background: {
      default: '#f5f5f5',
    },
  },
});

// Protected Route Component
const RequireAuth = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

function App() {
  return (
    <AuthProvider>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Protected Routes */}
            <Route path="/" element={
              <RequireAuth>
                <Layout>
                  <Dashboard />
                </Layout>
              </RequireAuth>
            } />
            <Route path="/history" element={
              <RequireAuth>
                <Layout>
                  <DataView />
                </Layout>
              </RequireAuth>
            } />
            <Route path="/online" element={
              <RequireAuth>
                <Layout>
                  <OnlineView />
                </Layout>
              </RequireAuth>
            } />
            <Route path="/settings" element={
              <RequireAuth>
                <Layout>
                  <Settings />
                </Layout>
              </RequireAuth>
            } />
            <Route path="/calendar" element={
              <RequireAuth>
                <Layout>
                  <Calendar />
                </Layout>
              </RequireAuth>
            } />
            <Route path="/invites" element={
              <RequireAuth>
                <Layout>
                  <InviteManager />
                </Layout>
              </RequireAuth>
            } />
            <Route path="/company" element={
              <RequireAuth>
                <Layout>
                  <CompanyOverview />
                </Layout>
              </RequireAuth>
            } />
            <Route path="/audit-log" element={
              <RequireAuth>
                <Layout>
                  <AuditLog />
                </Layout>
              </RequireAuth>
            } />

            {/* Catch all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;