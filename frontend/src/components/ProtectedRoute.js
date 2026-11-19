import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { isAuth, loading } = useAuth();
  const location = useLocation();

  // Don't redirect until we know auth state (avoids flash)
  if (loading) {
    return <div className="sq-loading sq-grid-bg">Loading</div>;
  }

  if (!isAuth) {
    // Save attempted location — redirect back after login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

export default ProtectedRoute;