import { Navigate, Outlet } from 'react-router-dom';
import { PageHeader } from './PageHeader';
import { session } from '../lib/session';

export function ProtectedRoute() {
  const token = session.getAccessToken();
  const refreshToken = session.getRefreshToken();

  if (!token && !refreshToken) {
    return <Navigate to="/login" replace />;
  }

  return (
    <>
      <PageHeader />
      <Outlet />
    </>
  );
}
