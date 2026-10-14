import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

// Wraps any route that requires login.
// If the session check is still loading, show nothing (avoids flash).
// If not logged in, redirect to /login.
export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="auth-loading">
        <div className="spinner" />
      </div>
    );
  }

  return user ? children : <Navigate to="/login" replace />;
}
