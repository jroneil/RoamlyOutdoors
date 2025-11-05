import { Navigate } from 'react-router-dom';
import type { PropsWithChildren } from 'react';
import useAuth from '../../hooks/useAuth';
import type { UserRole } from '../../types/user';
import LoadingState from '../common/LoadingState';

interface RoleProtectedRouteProps extends PropsWithChildren {
  allowRoles?: UserRole[];
  redirectTo?: string;
}

const RoleProtectedRoute = ({
  allowRoles,
  redirectTo = '/login',
  children
}: RoleProtectedRouteProps) => {
  const { isLoading, profile } = useAuth();

  if (isLoading) {
    return <LoadingState />;
  }

  if (!profile) {
    return <Navigate to={redirectTo} replace />;
  }

  if (allowRoles && !allowRoles.includes(profile.role)) {
    return <Navigate to="/profile" replace />;
  }

  return <>{children}</>;
};

export default RoleProtectedRoute;
