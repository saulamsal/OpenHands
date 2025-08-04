import { AxiosHeaders } from "axios";
import {
  Feedback,
  FeedbackResponse,
  GitHubAccessTokenResponse,
  GetConfigResponse,
  GetVSCodeUrlResponse,
  Conversation,
  ResultSet,
  GetTrajectoryResponse,
  GitChangeDiff,
  GitChange,
  GetMicroagentsResponse,
  GetMicroagentPromptResponse,
  CreateMicroagent,
  User,
  LoginResponse,
  Team,
  TeamMember,
} from "./open-hands.types";
import { openHands } from "./open-hands-axios";
import { ApiSettings, PostApiSettings, Provider } from "#/types/settings";
import { GitUser, GitRepository, Branch } from "#/types/git";
import { SuggestedTask } from "#/components/features/home/tasks/task.types";
import { RepositoryMicroagent } from "#/types/microagent-management";

class OpenHands {
  private static currentConversation: Conversation | null = null;

  /**
   * Get a current conversation
   * @return the current conversation
   */
  static getCurrentConversation(): Conversation | null {
    return this.currentConversation;
  }

  /**
   * Set a current conversation
   * @param url Custom URL to use for conversation endpoints
   */
  static setCurrentConversation(
    currentConversation: Conversation | null,
  ): void {
    this.currentConversation = currentConversation;
  }

  /**
   * Get the url for the conversation. If
   */
  static getConversationUrl(conversationId: string): string {
    if (this.currentConversation?.conversation_id === conversationId) {
      if (this.currentConversation.url) {
        return this.currentConversation.url;
      }
    }
    return `/api/conversations/${conversationId}`;
  }

  /**
   * Retrieve the list of models available
   * @returns List of models available
   */
  static async getModels(): Promise<string[]> {
    const { data } = await openHands.get<string[]>("/api/options/models");
    return data;
  }

  /**
   * Retrieve the list of agents available
   * @returns List of agents available
   */
  static async getAgents(): Promise<string[]> {
    const { data } = await openHands.get<string[]>("/api/options/agents");
    return data;
  }

  /**
   * Retrieve the list of security analyzers available
   * @returns List of security analyzers available
   */
  static async getSecurityAnalyzers(): Promise<string[]> {
    const { data } = await openHands.get<string[]>(
      "/api/options/security-analyzers",
    );
    return data;
  }

  static async getConfig(): Promise<GetConfigResponse> {
    const { data } = await openHands.get<GetConfigResponse>(
      "/api/options/config",
    );
    return data;
  }

  static getConversationHeaders(): AxiosHeaders {
    const headers = new AxiosHeaders();
    const sessionApiKey = this.currentConversation?.session_api_key;
    if (sessionApiKey) {
      headers.set("X-Session-API-Key", sessionApiKey);
    }
    return headers;
  }

  /**
   * Send feedback to the server
   * @param data Feedback data
   * @returns The stored feedback data
   */
  static async submitFeedback(
    conversationId: string,
    feedback: Feedback,
  ): Promise<FeedbackResponse> {
    const url = `/api/conversations/${conversationId}/submit-feedback`;
    const { data } = await openHands.post<FeedbackResponse>(url, feedback);
    return data;
  }

  /**
   * Submit conversation feedback with rating
   * @param conversationId The conversation ID
   * @param rating The rating (1-5)
   * @param eventId Optional event ID this feedback corresponds to
   * @param reason Optional reason for the rating
   * @returns Response from the feedback endpoint
   */
  static async submitConversationFeedback(
    conversationId: string,
    rating: number,
    eventId?: number,
    reason?: string,
  ): Promise<{ status: string; message: string }> {
    const url = `/api/conversations/${conversationId}/feedback`;
    const payload = {
      event_id: eventId,
      rating,
      reason,
      metadata: { source: "likert-scale" },
    };
    const { data } = await openHands.post<{ status: string; message: string }>(
      url,
      payload,
    );
    return data;
  }

  /**
   * Check if feedback exists for a specific conversation and event
   * @param conversationId The conversation ID
   * @param eventId The event ID to check
   * @returns Feedback data including existence, rating, and reason
   */
  static async checkFeedbackExists(
    conversationId: string,
    eventId: number,
  ): Promise<{ exists: boolean; rating?: number; reason?: string }> {
    try {
      const url = `/api/conversations/${conversationId}/feedback/${eventId}`;
      const { data } = await openHands.get<{
        exists: boolean;
        rating?: number;
        reason?: string;
      }>(url);
      return data;
    } catch (error) {
      // Error checking if feedback exists
      return { exists: false };
    }
  }

  /**
   * Authenticate with GitHub token
   * @returns Response with authentication status and user info if successful
   * @deprecated This endpoint doesn't exist in database mode - use auth context instead
   */
  static async authenticate(
    appMode: GetConfigResponse["APP_MODE"],
  ): Promise<boolean> {
    if (appMode === "oss") return true;

    // In database mode, authentication is handled by the auth context
    // This method is deprecated and should not be called
    console.warn(
      "[OpenHands] authenticate() is deprecated - use auth context instead",
    );
    return true;
  }

  /**
   * Get the blob of the workspace zip
   * @returns Blob of the workspace zip
   */
  static async getWorkspaceZip(conversationId: string): Promise<Blob> {
    const url = `${this.getConversationUrl(conversationId)}/zip-directory`;
    const response = await openHands.get(url, {
      responseType: "blob",
      headers: this.getConversationHeaders(),
    });
    return response.data;
  }

  /**
   * Get the web hosts
   * @returns Array of web hosts
   */
  static async getWebHosts(conversationId: string): Promise<string[]> {
    const url = `${this.getConversationUrl(conversationId)}/web-hosts`;
    const response = await openHands.get(url, {
      headers: this.getConversationHeaders(),
    });
    return Object.keys(response.data.hosts);
  }

  /**
   * @param code Code provided by GitHub
   * @returns GitHub access token
   */
  static async getGitHubAccessToken(
    code: string,
  ): Promise<GitHubAccessTokenResponse> {
    const { data } = await openHands.post<GitHubAccessTokenResponse>(
      "/api/keycloak/callback",
      {
        code,
      },
    );
    return data;
  }

  /**
   * Get the VSCode URL
   * @returns VSCode URL
   */
  static async getVSCodeUrl(
    conversationId: string,
  ): Promise<GetVSCodeUrlResponse> {
    const url = `${this.getConversationUrl(conversationId)}/vscode-url`;
    const { data } = await openHands.get<GetVSCodeUrlResponse>(url, {
      headers: this.getConversationHeaders(),
    });
    return data;
  }

  static async getRuntimeId(
    conversationId: string,
  ): Promise<{ runtime_id: string }> {
    const url = `${this.getConversationUrl(conversationId)}/config`;
    const { data } = await openHands.get<{ runtime_id: string }>(url, {
      headers: this.getConversationHeaders(),
    });
    return data;
  }

  static async getUserConversations(teamId?: string): Promise<Conversation[]> {
    const params = new URLSearchParams();
    params.append("limit", "20");

    // Team ID is handled by axios interceptor now
    console.log("[getUserConversations] Called with teamId:", teamId);

    const { data } = await openHands.get<ResultSet<Conversation>>(
      `/api/conversations?${params.toString()}`,
    );
    return data.results;
  }

  static async searchConversations(
    selectedRepository?: string,
    conversationTrigger?: string,
    limit: number = 20,
  ): Promise<Conversation[]> {
    const params = new URLSearchParams();
    params.append("limit", limit.toString());

    if (selectedRepository) {
      params.append("selected_repository", selectedRepository);
    }

    if (conversationTrigger) {
      params.append("conversation_trigger", conversationTrigger);
    }

    const { data } = await openHands.get<ResultSet<Conversation>>(
      `/api/conversations?${params.toString()}`,
    );
    return data.results;
  }

  static async deleteUserConversation(conversationId: string): Promise<void> {
    await openHands.delete(`/api/conversations/${conversationId}`);
  }

  static async updateConversation(
    conversationId: string,
    updates: Partial<Conversation>,
  ): Promise<Conversation> {
    const { data } = await openHands.patch<Conversation>(
      `/api/conversations/${conversationId}`,
      updates,
    );
    return data;
  }

  static async detectProjectType(conversationId: string): Promise<{
    project_type: string;
    confidence: number;
    detected_features: string[];
  }> {
    const { data } = await openHands.post(
      `/api/project-detection/detect/${conversationId}`,
    );
    return data;
  }

  static async detectBatchProjectTypes(
    limit: number = 10,
    onlyMissing: boolean = true,
  ): Promise<{
    processed: number;
    detected: number;
    failed: number;
    results: Record<string, string>;
  }> {
    const { data } = await openHands.post(
      "/api/project-detection/detect-batch",
      {
        limit,
        only_missing: onlyMissing,
      },
    );
    return data;
  }

  static async createConversation(
    selectedRepository?: string,
    git_provider?: Provider,
    initialUserMsg?: string,
    suggested_task?: SuggestedTask,
    selected_branch?: string,
    conversationInstructions?: string,
    createMicroagent?: CreateMicroagent,
    mode?: "AGENTIC" | "CHAT",
    agenticQaTest?: boolean,
    framework?: string,
    attachments?: File[],
    teamId?: string,
  ): Promise<Conversation> {
    const formData = new FormData();

    // Add regular fields
    if (selectedRepository) formData.append("repository", selectedRepository);
    if (git_provider) formData.append("git_provider", git_provider);
    if (selected_branch) formData.append("selected_branch", selected_branch);
    if (initialUserMsg) formData.append("initial_user_msg", initialUserMsg);
    if (suggested_task)
      formData.append("suggested_task", JSON.stringify(suggested_task));
    if (conversationInstructions)
      formData.append("conversation_instructions", conversationInstructions);
    if (createMicroagent)
      formData.append("create_microagent", JSON.stringify(createMicroagent));
    if (mode) formData.append("mode", mode);
    if (agenticQaTest !== undefined)
      formData.append("agentic_qa_test", agenticQaTest.toString());
    if (framework) formData.append("framework", framework);

    // Add attachments
    if (attachments && attachments.length > 0) {
      attachments.forEach((file) => {
        formData.append(`attachments`, file);
      });
    }

    const headers: Record<string, string> = {};
    if (teamId) {
      headers["X-Team-Id"] = teamId;
    }

    if (attachments && attachments.length > 0) {
      headers["Content-Type"] = "multipart/form-data";
    }

    const { data } = await openHands.post<Conversation>(
      "/api/conversations",
      attachments && attachments.length > 0
        ? formData
        : {
            repository: selectedRepository,
            git_provider,
            selected_branch,
            initial_user_msg: initialUserMsg,
            suggested_task,
            conversation_instructions: conversationInstructions,
            create_microagent: createMicroagent,
            mode,
            agentic_qa_test: agenticQaTest,
            framework,
          },
      Object.keys(headers).length > 0 ? { headers } : undefined,
    );

    return data;
  }

  static async getConversation(
    conversationId: string,
  ): Promise<Conversation | null> {
    const { data } = await openHands.get<Conversation | null>(
      `/api/conversations/${conversationId}`,
    );

    return data;
  }

  static async startConversation(
    conversationId: string,
    providers?: Provider[],
  ): Promise<Conversation | null> {
    const { data } = await openHands.post<Conversation | null>(
      `/api/conversations/${conversationId}/start`,
      providers ? { providers_set: providers } : {},
    );

    return data;
  }

  static async stopConversation(
    conversationId: string,
  ): Promise<Conversation | null> {
    const { data } = await openHands.post<Conversation | null>(
      `/api/conversations/${conversationId}/stop`,
    );

    return data;
  }

  /**
   * Get the settings from the server or use the default settings if not found
   */
  static async getSettings(): Promise<ApiSettings> {
    const { data } = await openHands.get<ApiSettings>("/api/settings");
    return data;
  }

  /**
   * Save the settings to the server. Only valid settings are saved.
   * @param settings - the settings to save
   */
  static async saveSettings(
    settings: Partial<PostApiSettings>,
  ): Promise<boolean> {
    const data = await openHands.post("/api/settings", settings);
    return data.status === 200;
  }

  static async createCheckoutSession(amount: number): Promise<string> {
    const { data } = await openHands.post(
      "/api/billing/create-checkout-session",
      {
        amount,
      },
    );
    return data.redirect_url;
  }

  static async createBillingSessionResponse(): Promise<string> {
    const { data } = await openHands.post(
      "/api/billing/create-customer-setup-session",
    );
    return data.redirect_url;
  }

  static async getBalance(): Promise<string> {
    // TODO: Implement billing/credits endpoint in backend
    console.warn("[OpenHands] getBalance() - billing endpoint not implemented");
    return "0";
  }

  static async getGitUser(): Promise<GitUser> {
    const response = await openHands.get<GitUser>("/api/user/info");

    const { data } = response;

    const user: GitUser = {
      id: data.id,
      login: data.login,
      avatar_url: data.avatar_url,
      company: data.company,
      name: data.name,
      email: data.email,
    };

    return user;
  }

  static async searchGitRepositories(
    query: string,
    per_page = 5,
  ): Promise<GitRepository[]> {
    const response = await openHands.get<GitRepository[]>(
      "/api/user/search/repositories",
      {
        params: {
          query,
          per_page,
        },
      },
    );

    return response.data;
  }

  static async getTrajectory(
    conversationId: string,
  ): Promise<GetTrajectoryResponse> {
    const url = `${this.getConversationUrl(conversationId)}/trajectory`;
    const { data } = await openHands.get<GetTrajectoryResponse>(url, {
      headers: this.getConversationHeaders(),
    });
    return data;
  }

  static async logout(): Promise<void> {
    // Always use JWT logout for SAAS/auth-based mode
    await this.logoutJWT();
  }

  static async getGitChanges(conversationId: string): Promise<GitChange[]> {
    const url = `${this.getConversationUrl(conversationId)}/git/changes`;
    const { data } = await openHands.get<GitChange[]>(url, {
      headers: this.getConversationHeaders(),
    });
    return data;
  }

  static async getGitChangeDiff(
    conversationId: string,
    path: string,
  ): Promise<GitChangeDiff> {
    const url = `${this.getConversationUrl(conversationId)}/git/diff`;
    const { data } = await openHands.get<GitChangeDiff>(url, {
      params: { path },
      headers: this.getConversationHeaders(),
    });
    return data;
  }

  /**
   * Given a PAT, retrieves the repositories of the user
   * @returns A list of repositories
   */
  static async retrieveUserGitRepositories() {
    const { data } = await openHands.get<GitRepository[]>(
      "/api/user/repositories",
      {
        params: {
          sort: "pushed",
        },
      },
    );

    return data;
  }

  static async getRepositoryBranches(repository: string): Promise<Branch[]> {
    const { data } = await openHands.get<Branch[]>(
      `/api/user/repository/branches?repository=${encodeURIComponent(repository)}`,
    );

    return data;
  }

  /**
   * Get the available microagents associated with a conversation
   * @param conversationId The ID of the conversation
   * @returns The available microagents associated with the conversation
   */
  static async getMicroagents(
    conversationId: string,
  ): Promise<GetMicroagentsResponse> {
    const url = `${this.getConversationUrl(conversationId)}/microagents`;
    const { data } = await openHands.get<GetMicroagentsResponse>(url, {
      headers: this.getConversationHeaders(),
    });
    return data;
  }

  /**
   * Get the available microagents for a specific repository
   * @param owner The repository owner
   * @param repo The repository name
   * @returns The available microagents for the repository
   */
  static async getRepositoryMicroagents(
    owner: string,
    repo: string,
  ): Promise<RepositoryMicroagent[]> {
    const { data } = await openHands.get<RepositoryMicroagent[]>(
      `/api/user/repository/${owner}/${repo}/microagents`,
    );
    return data;
  }

  static async getMicroagentPrompt(
    conversationId: string,
    eventId: number,
  ): Promise<string> {
    const { data } = await openHands.get<GetMicroagentPromptResponse>(
      `/api/conversations/${conversationId}/remember_prompt`,
      {
        params: { event_id: eventId },
      },
    );

    return data.prompt;
  }

  // New auth methods
  static async login(email: string, password: string): Promise<LoginResponse> {
    const formData = new URLSearchParams();
    formData.append("username", email); // FastAPI-Users expects "username" field
    formData.append("password", password);

    const { data } = await openHands.post<LoginResponse>(
      "/api/auth/jwt/login",
      formData,
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      },
    );
    return data;
  }

  static async register(
    email: string,
    password: string,
    name?: string,
  ): Promise<User> {
    const { data } = await openHands.post<User>(
      "/api/auth/register-with-team",
      {
        email,
        password,
        name,
      },
    );
    return data;
  }

  static async getCurrentUser(): Promise<User> {
    console.log("[OpenHands] Getting current user");
    try {
      const { data } = await openHands.get<User>("/api/auth/users/me");
      console.log("[OpenHands] Current user loaded:", data);
      return data;
    } catch (error) {
      console.error("[OpenHands] Failed to get current user:", error);
      throw error;
    }
  }

  static async getUserTeams(): Promise<any[]> {
    console.log("[OpenHands] Getting user teams");
    try {
      const { data } = await openHands.get<any[]>("/api/teams/");
      console.log("[OpenHands] Teams loaded:", data);
      return data;
    } catch (error: any) {
      console.error("[OpenHands] Failed to get teams:", error);
      // Return empty array if teams endpoint doesn't exist yet or returns 401
      if (error.response?.status === 401 || error.response?.status === 404) {
        console.log(
          "[OpenHands] Teams endpoint not available, returning empty array",
        );
        return [];
      }
      // Re-throw other errors
      throw error;
    }
  }

  static async logoutJWT(): Promise<void> {
    // Use custom logout endpoint that doesn't require authentication
    // This prevents 401 errors when token is invalid/expired
    await openHands.post(
      "/api/auth/logout",
      {},
      {
        withCredentials: true,
      },
    );
  }

  static async getGitHubLoginUrl(
    redirectUrl?: string,
  ): Promise<{ authorization_url: string }> {
    const params = redirectUrl
      ? `?redirect_url=${encodeURIComponent(redirectUrl)}`
      : "";
    const { data } = await openHands.get<{ authorization_url: string }>(
      `/api/auth/github/login${params}`,
    );
    return data;
  }

  // Team methods
  static async getTeams(): Promise<Team[]> {
    console.log("[OpenHands] Getting teams");
    try {
      const { data } = await openHands.get<Team[]>("/api/teams/");
      console.log("[OpenHands] Teams loaded:", data?.length || 0);
      return data;
    } catch (error: any) {
      console.error("[OpenHands] Failed to get teams:", error);
      // Return empty array if teams endpoint doesn't exist yet or returns 401
      if (error.response?.status === 401 || error.response?.status === 404) {
        console.log(
          "[OpenHands] Teams endpoint not available, returning empty array",
        );
        return [];
      }
      // Re-throw other errors
      throw error;
    }
  }

  static async createTeam(name: string): Promise<Team> {
    const { data } = await openHands.post<Team>("/api/teams/", { name });
    return data;
  }

  static async getTeam(teamId: string): Promise<Team> {
    const { data } = await openHands.get<Team>(`/api/teams/${teamId}`);
    return data;
  }

  static async updateTeam(teamId: string, name: string): Promise<Team> {
    const { data } = await openHands.patch<Team>(`/api/teams/${teamId}`, {
      name,
    });
    return data;
  }

  static async deleteTeam(teamId: string): Promise<void> {
    await openHands.delete(`/api/teams/${teamId}`);
  }

  static async getTeamMembers(teamId: string): Promise<TeamMember[]> {
    const { data } = await openHands.get<TeamMember[]>(
      `/api/teams/${teamId}/members`,
    );
    return data;
  }

  static async inviteTeamMember(
    teamId: string,
    email: string,
    role: "admin" | "developer" | "viewer",
  ): Promise<void> {
    await openHands.post(`/api/teams/${teamId}/members`, { email, role });
  }

  static async removeTeamMember(teamId: string, userId: string): Promise<void> {
    await openHands.delete(`/api/teams/${teamId}/members/${userId}`);
  }
}

export default OpenHands;
