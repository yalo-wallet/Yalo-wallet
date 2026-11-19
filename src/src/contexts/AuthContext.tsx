
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode
} from "react";

import { api } from "../lib/api";

export interface AuthUser {
  id: string;
  email: string;
  emailVerified: boolean;
  createdAt?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({
  children
}: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Retrieve the currently authenticated user.
   * Authentication is verified by the backend session.
   */
  const refreshUser = useCallback(async () => {
    try {
      setError(null);

      const response = await api.get<{
        user: AuthUser | null;
      }>("/api/auth/me");

      setUser(response.user ?? null);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Sign out through the backend.
   */
  const logout = useCallback(async () => {
    try {
      setError(null);

      await api.post("/api/auth/logout", {});
    } catch {
      setError("Unable to complete logout. Please try again.");
      throw new Error("Logout failed.");
    } finally {
      setUser(null);
    }
  }, []);

  /**
   * Clear displayed authentication errors.
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Check the existing session when the app loads.
   */
  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  const value: AuthContextType = {
    user,
    isAuthenticated: Boolean(user),
    isLoading,
    error,
    refreshUser,
    logout,
    clearError
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Access authentication state and actions.
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside AuthProvider."
    );
  }

  return context;
}
