import { Navigate } from 'react-router-dom';

export function ProtectedRoute() {
  return <Navigate to="/login" replace />;
}
