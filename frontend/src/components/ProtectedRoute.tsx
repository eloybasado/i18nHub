import { Navigate, Outlet } from 'react-router-dom';
import { session } from '../lib/session';

export function ProtectedRoute() {
  const token = session.getAccessToken();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
