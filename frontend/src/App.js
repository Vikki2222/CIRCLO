import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import ProtectedRoute from './components/ProtectedRoute';

// Pages (we'll build these next)
import LoginPage        from './pages/LoginPage';
import RegisterPage     from './pages/RegisterPage';
import MapPage          from './pages/MapPage';
import CreateMeetupPage from './pages/CreateMeetupPage';
import AuthCallback     from './pages/AuthCallback';



function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <Routes>
            {/* Public */}
            <Route path="/login"           element={<LoginPage />} />
            <Route path="/register"        element={<RegisterPage />} />
            <Route path="/auth/callback"   element={<AuthCallback />} />

            {/* Protected */}
            <Route path="/" element={
              <ProtectedRoute><MapPage /></ProtectedRoute>
            } />
            <Route path="/create" element={
              <ProtectedRoute><CreateMeetupPage /></ProtectedRoute>
            } />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;