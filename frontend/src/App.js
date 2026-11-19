import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import ProtectedRoute from './components/ProtectedRoute';

// Pages (we'll build these next)
import LoginPage        from './pages/LoginPage';
import RegisterPage     from './pages/RegisterPage';
import MapPage          from './pages/MapPage';
import CreateMeetupPage from './pages/CreateMeetupPage';
import AuthCallback     from './pages/AuthCallback';
import LandingPage      from './pages/LandingPage';


// "/" shows the landing page to visitors and the map to signed-in users
const Home = () => {
  const { isAuth, loading } = useAuth();
  if (!loading && !isAuth) return <LandingPage />;
  return <ProtectedRoute><MapPage /></ProtectedRoute>;
};

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
            <Route path="/" element={<Home />} />
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