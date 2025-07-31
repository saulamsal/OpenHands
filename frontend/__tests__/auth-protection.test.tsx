import { describe, it, expect, vi, beforeEach } from "vitest";
import { requireDatabaseAuth, isAuthenticated, redirectIfAuthenticated } from "#/utils/auth.client";
import OpenHands from "#/api/open-hands";
import { redirect } from "react-router";

// Mock modules
vi.mock("react-router", () => ({
  redirect: vi.fn(),
}));

vi.mock("#/api/open-hands", () => ({
  default: {
    getCurrentUser: vi.fn(),
    getConfig: vi.fn(),
  },
}));

vi.mock("#/query-client-config", () => ({
  queryClient: {
    getQueryData: vi.fn(),
    setQueryData: vi.fn(),
  },
}));

describe("Auth Protection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  describe("isAuthenticated", () => {
    it("should return false when no token exists", async () => {
      const result = await isAuthenticated();
      expect(result).toBe(false);
    });

    it("should return true when token exists and user fetch succeeds", async () => {
      localStorage.setItem("openhands_jwt_token", "valid-token");
      vi.mocked(OpenHands.getCurrentUser).mockResolvedValue({
        id: "1",
        email: "test@example.com",
        name: "Test User",
        is_active: true,
        is_superuser: false,
        is_verified: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const result = await isAuthenticated();
      expect(result).toBe(true);
    });

    it("should return false and remove token when user fetch fails", async () => {
      localStorage.setItem("openhands_jwt_token", "invalid-token");
      vi.mocked(OpenHands.getCurrentUser).mockRejectedValue(new Error("Unauthorized"));

      const result = await isAuthenticated();
      expect(result).toBe(false);
      expect(localStorage.getItem("openhands_jwt_token")).toBeNull();
    });
  });

  describe("requireDatabaseAuth", () => {
    it("should redirect to /login when no token exists", async () => {
      const request = new Request("http://localhost:3000/settings");
      
      await expect(requireDatabaseAuth(request)).rejects.toThrow();
      expect(redirect).toHaveBeenCalledWith("/login");
    });

    it("should store redirect URL in sessionStorage", async () => {
      const request = new Request("http://localhost:3000/settings/integrations?tab=github");
      
      try {
        await requireDatabaseAuth(request);
      } catch {}
      
      expect(sessionStorage.getItem("redirectAfterLogin")).toBe("/settings/integrations?tab=github");
    });

    it("should not redirect when token exists", async () => {
      localStorage.setItem("openhands_jwt_token", "valid-token");
      const request = new Request("http://localhost:3000/settings");
      
      await requireDatabaseAuth(request);
      expect(redirect).not.toHaveBeenCalled();
    });
  });

  describe("redirectIfAuthenticated", () => {
    it("should redirect to home when authenticated", async () => {
      localStorage.setItem("openhands_jwt_token", "valid-token");
      vi.mocked(OpenHands.getCurrentUser).mockResolvedValue({
        id: "1",
        email: "test@example.com",
        name: "Test User",
        is_active: true,
        is_superuser: false,
        is_verified: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const request = new Request("http://localhost:3000/login");
      
      await expect(redirectIfAuthenticated(request)).rejects.toThrow();
      expect(redirect).toHaveBeenCalledWith("/");
    });

    it("should redirect to stored URL when authenticated", async () => {
      localStorage.setItem("openhands_jwt_token", "valid-token");
      sessionStorage.setItem("redirectAfterLogin", "/teams");
      vi.mocked(OpenHands.getCurrentUser).mockResolvedValue({
        id: "1",
        email: "test@example.com",
        name: "Test User",
        is_active: true,
        is_superuser: false,
        is_verified: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const request = new Request("http://localhost:3000/login");
      
      await expect(redirectIfAuthenticated(request)).rejects.toThrow();
      expect(redirect).toHaveBeenCalledWith("/teams");
      expect(sessionStorage.getItem("redirectAfterLogin")).toBeNull();
    });

    it("should not redirect when not authenticated", async () => {
      const request = new Request("http://localhost:3000/login");
      
      await redirectIfAuthenticated(request);
      expect(redirect).not.toHaveBeenCalled();
    });
  });
});