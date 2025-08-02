import React, { createContext, useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { User, Team } from "#/api/open-hands.types";
import OpenHands from "#/api/open-hands";

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  teams: Team[];
  activeTeam: Team | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setActiveTeam: (team: Team) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const ACTIVE_TEAM_KEY = "openhands_active_team";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [activeTeam, setActiveTeamState] = useState<Team | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const isAuthenticated = !!user;

  // Initialize auth context and check for existing session
  useEffect(() => {
    console.log(
      "[AuthContext] useEffect triggered, isInitialized:",
      isInitialized,
    );
    if (isInitialized) {
      console.log("[AuthContext] Already initialized, skipping");
      return;
    }

    console.log("[AuthContext] Initializing auth context");
    console.log(
      "[AuthContext] Current window location:",
      window.location.pathname,
    );

    setIsInitialized(true);

    // Always try to load user data - cookies will be sent automatically
    console.log("[AuthContext] Checking for existing session");
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      console.log("[AuthContext] Fetching current user data");

      // Cookies will be sent automatically with the request
      const userData = await OpenHands.getCurrentUser();
      console.log("[AuthContext] User data loaded:", userData);
      setUser(userData);

      // Load teams
      console.log("[AuthContext] Fetching teams");
      let userTeams: Team[] = [];
      try {
        userTeams = await OpenHands.getTeams();
        console.log("[AuthContext] Teams loaded:", userTeams.length);
        setTeams(userTeams);
      } catch (teamError: any) {
        console.error("[AuthContext] Failed to load teams:", teamError);
        console.error("[AuthContext] Teams error details:", {
          status: teamError?.response?.status,
          message: teamError?.message,
        });
        // Continue even if teams fail to load
        setTeams([]);
        userTeams = []; // Ensure userTeams is empty for subsequent logic
      }

      // Set active team (prefer saved, otherwise personal team, otherwise first)
      if (userTeams.length > 0) {
        const savedTeamId = localStorage.getItem(ACTIVE_TEAM_KEY);
        let activeTeam = userTeams.find((t) => t.id === savedTeamId);
        if (!activeTeam) {
          activeTeam = userTeams.find((t) => t.is_personal) || userTeams[0];
        }
        if (activeTeam) {
          console.log("[AuthContext] Setting active team:", activeTeam.id);
          setActiveTeamState(activeTeam);
          localStorage.setItem(ACTIVE_TEAM_KEY, activeTeam.id);
        }
      }
    } catch (error: any) {
      console.error("[AuthContext] Failed to load user data:", error);
      console.error("[AuthContext] Error details:", {
        status: error?.response?.status,
        message: error?.message,
        url: error?.config?.url,
      });

      // On 401, user is not authenticated
      if (error?.response?.status === 401) {
        console.log("[AuthContext] User not authenticated");
        setUser(null);
      }
    } finally {
      console.log("[AuthContext] Setting isLoading to false");
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    console.log("[AuthContext] Login called");

    // Login - cookies will be set automatically by the server
    await OpenHands.login(email, password);

    console.log("[AuthContext] Login successful, loading user data");
    // Load user data
    await loadUserData();

    console.log("[AuthContext] Invalidating queries");
    // Clear all queries to refresh data
    queryClient.invalidateQueries();

    console.log("[AuthContext] Login complete");
  };

  const register = async (email: string, password: string, name: string) => {
    // Register user (this creates account and personal team)
    await OpenHands.register(email, password, name);

    // Now login with the new credentials
    await login(email, password);
  };

  const logout = async () => {
    try {
      await OpenHands.logoutJWT();
    } catch (error) {
      // Ignore logout errors
    }

    // Clear local state
    localStorage.removeItem(ACTIVE_TEAM_KEY);
    setUser(null);
    setTeams([]);
    setActiveTeamState(null);

    // Clear all queries
    queryClient.clear();

    // Navigate to home
    navigate("/");
  };

  const refreshUser = async () => {
    console.log("[AuthContext] refreshUser called");

    try {
      const userData = await OpenHands.getCurrentUser();
      console.log("[AuthContext] User data loaded:", userData);
      setUser(userData);

      // Load teams after user is loaded
      const teamsData = await OpenHands.getTeams();
      console.log("[AuthContext] Teams loaded:", teamsData);
      setTeams(teamsData);

      // Set active team if not set
      if (teamsData.length > 0) {
        const activeTeamId = localStorage.getItem(ACTIVE_TEAM_KEY);
        const activeTeam =
          teamsData.find((t) => t.id === activeTeamId) || teamsData[0];
        setActiveTeamState(activeTeam);
      }
    } catch (error) {
      console.error("[AuthContext] Failed to refresh user data:", error);
      throw error; // Re-throw so auth-callback can handle it
    }
  };

  const setActiveTeam = (team: Team) => {
    setActiveTeamState(team);
    localStorage.setItem(ACTIVE_TEAM_KEY, team.id);

    // Invalidate queries that might depend on team context
    queryClient.invalidateQueries({ queryKey: ["conversations"] });
  };

  const value: AuthContextValue = {
    user,
    isLoading,
    isAuthenticated,
    teams,
    activeTeam,
    login,
    register,
    logout,
    refreshUser,
    setActiveTeam,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
