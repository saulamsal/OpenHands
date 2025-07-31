import { useAuth } from "#/context/auth-context";

/**
 * @deprecated Use useAuth() hook instead for authentication status
 */
export const useIsAuthed = () => {
  const { isAuthenticated } = useAuth();

  // For backward compatibility, return a query-like object
  // Always use authentication status (no app mode check)
  return {
    data: isAuthenticated,
    isLoading: false,
    error: null,
  };
};
