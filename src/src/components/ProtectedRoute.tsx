import {
  Navigate,
  Outlet,
  useLocation
} from "react-router-dom";

import { useAuth } from "../contexts/AuthContext";

interface ProtectedRouteProps {
  children?: React.ReactNode;
}

/**
 * Protect pages that require an authenticated user.
 */
export default function ProtectedRoute({
  children
}: ProtectedRouteProps) {
  const {
    user,
    isAuthenticated,
    isLoading
  } = useAuth();

  const location = useLocation();

  // Wait until the backend checks the session.
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#080808] text-[#D4AF37]">
        <div className="text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#D4AF37] border-t-transparent mx-auto mb-4" />

          <p className="text-sm text-gray-400">
            Securing your session...
          </p>
        </div>
      </div>
    );
  }

  // Redirect unauthenticated users to login.
  if (!isAuthenticated || !user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location }}
      />
    );
  }

  // Render protected content.
  return children ? <>{children}</> : <Outlet />;
}

