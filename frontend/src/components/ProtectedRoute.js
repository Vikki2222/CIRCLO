import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { isAuth, loading } = useAuth();
  const location = useLocation();

  // Don't redirect until we know auth state (avoids flash)
  if (loading) {
    return (
      <div style={{
        height: '100vh', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        background: '#0f172a', color: '#4f8ef7',
        fontSize: '1.2rem', fontFamily: 'Arial'
      }}>
        Loading...
      </div>
    );
  }

  if (!isAuth) {
    // Save attempted location — redirect back after login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

export default ProtectedRoute;