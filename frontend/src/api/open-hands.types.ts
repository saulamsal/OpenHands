import { ConversationStatus } from "#/types/conversation-status";
import { RuntimeStatus } from "#/types/runtime-status";
import { Provider } from "#/types/settings";
import { ProjectType } from "#/types/project-type";

export interface ErrorResponse {
  error: string;
}

export interface SaveFileSuccessResponse {
  message: string;
}

export interface FileUploadSuccessResponse {
  uploaded_files: string[];
  skipped_files: { name: string; reason: string }[];
}

export interface FeedbackBodyResponse {
  message: string;
  feedback_id: string;
  password: string;
}

export interface FeedbackResponse {
  statusCode: number;
  body: FeedbackBodyResponse;
}

export interface GitHubAccessTokenResponse {
  access_token: string;
}

export interface AuthenticationResponse {
  message: string;
  login?: string; // Only present when allow list is enabled
}

export interface Feedback {
  version: string;
  email: string;
  token: string;
  polarity: "positive" | "negative";
  permissions: "public" | "private";
  trajectory: unknown[];
}

export interface GetConfigResponse {
  APP_SLUG?: string;
  APP_MODE?: "saas" | "oss"; // Deprecated - to be removed
  GITHUB_CLIENT_ID: string;
  POSTHOG_CLIENT_KEY: string;
  STRIPE_PUBLISHABLE_KEY?: string;
  PROVIDERS_CONFIGURED?: Provider[];
  FEATURE_FLAGS: {
    ENABLE_BILLING: boolean;
    HIDE_LLM_SETTINGS: boolean;
    HIDE_MICROAGENT_MANAGEMENT?: boolean;
  };
  MAINTENANCE?: {
    startTime: string;
  };
  // STORAGE_BACKEND removed - always database mode
}

export interface GetVSCodeUrlResponse {
  vscode_url: string | null;
  error?: string;
}

export interface GetTrajectoryResponse {
  trajectory: unknown[] | null;
  error?: string;
}

export interface AuthenticateResponse {
  message?: string;
  error?: string;
}

export interface User {
  id: string;
  email: string;
  name?: string;
  is_active: boolean;
  is_superuser: boolean;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface LoginRequest {
  username: string; // This is actually the email
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name?: string;
}

export interface Team {
  id: string;
  name: string;
  owner_id: string;
  is_personal: boolean;
  created_at: string;
}

export interface TeamMember {
  id: string;
  user_id: string;
  team_id: string;
  role: "owner" | "admin" | "developer" | "viewer";
  user_email: string;
  user_name?: string;
}

export interface TeamCreateRequest {
  name: string;
}

export interface TeamMemberInviteRequest {
  email: string;
  role: "admin" | "developer" | "viewer";
}

export interface RepositorySelection {
  selected_repository: string | null;
  selected_branch: string | null;
  git_provider: Provider | null;
}

export type ConversationTrigger =
  | "resolver"
  | "gui"
  | "suggested_task"
  | "microagent_management";

export interface Conversation {
  conversation_id: string;
  title: string;
  selected_repository: string | null;
  selected_branch: string | null;
  git_provider: Provider | null;
  last_updated_at: string;
  created_at: string;
  status: ConversationStatus;
  runtime_status: RuntimeStatus | null;
  trigger?: ConversationTrigger;
  url: string | null;
  session_api_key: string | null;
  pr_number?: number[] | null;
  team_id?: string;
  project_type?: ProjectType;
  project_detection_confidence?: number;
}

export interface ResultSet<T> {
  results: T[];
  next_page_id: string | null;
}

export type GitChangeStatus = "M" | "A" | "D" | "R" | "U";

export interface GitChange {
  status: GitChangeStatus;
  path: string;
}

export interface GitChangeDiff {
  modified: string;
  original: string;
}

export interface InputMetadata {
  name: string;
  description: string;
}

export interface Microagent {
  name: string;
  type: "repo" | "knowledge";
  content: string;
  triggers: string[];
}

export interface GetMicroagentsResponse {
  microagents: Microagent[];
}

export interface GetMicroagentPromptResponse {
  status: string;
  prompt: string;
}

export interface CreateMicroagent {
  repo: string;
  git_provider?: Provider;
  title?: string;
}
