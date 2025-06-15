import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Layout } from './components/Layout';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import ResetPassword from './pages/ResetPassword';
import ResetConfirmation from './pages/ResetConfirmation';
import Home from './pages/Home';
import Bets from './pages/Bets';
import Admin from './pages/Admin';
import UserAdmin from './pages/UserAdmin';
import AdminDashboard from './pages/AdminDashboard';
import { Leaderboard, SideBets, Rules, Profile, FAQ } from './pages/StaticPages';

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  useEffect(() => {
    console.log('PrivateRoute state:', { user, loading });
  }, [user, loading]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (!user) {
    console.log('No user found, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  useEffect(() => {
    console.log('AdminRoute state:', { user, loading, isAdmin: user?.role === 'admin' });
  }, [user, loading]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    console.log('User not authorized for admin route, redirecting to home');
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/reset-confirmation" element={<ResetConfirmation />} />
            <Route
              path="/bets"
              element={
                <PrivateRoute>
                  <Bets />
                </PrivateRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <AdminDashboard />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/champions"
              element={
                <AdminRoute>
                  <Admin />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <AdminRoute>
                  <UserAdmin />
                </AdminRoute>
              }
            />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/side-bets" element={<SideBets />} />
            <Route path="/rules" element={<Rules />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/faq" element={<FAQ />} />
          </Routes>
        </Layout>
      </AuthProvider>
    </Router>
  );
}

export default App;
