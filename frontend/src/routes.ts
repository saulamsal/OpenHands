import {
  type RouteConfig,
  layout,
  index,
  route,
} from "@react-router/dev/routes";

export default [
  layout("routes/root-layout.tsx", [
    index("routes/home.tsx"),
    route("login", "routes/login.tsx"),
    route("register", "routes/register.tsx"),
    route("auth/callback", "routes/auth-callback.tsx"),
    route("accept-tos", "routes/accept-tos.tsx"),
    route("settings", "routes/settings.tsx", [
      index("routes/llm-settings.tsx"),
      route("llm/configurations", "routes/llm-configurations.tsx"),
      route("mcp", "routes/mcp-settings.tsx"),
      route("user", "routes/user-settings.tsx"),
      route("account", "routes/account-settings.tsx"),
      route("integrations", "routes/git-settings.tsx"),
      route("app", "routes/app-settings.tsx"),
      route("billing", "routes/billing.tsx"),
      route("secrets", "routes/secrets-settings.tsx"),
      route("api-keys", "routes/api-keys.tsx"),
    ]),
    route("conversations", "routes/conversations.tsx"),
    route("conversations/:conversationId", "routes/conversation.tsx", [
      index("routes/changes-tab.tsx"),
      route("browser", "routes/browser-tab.tsx"),
      route("jupyter", "routes/jupyter-tab.tsx"),
      route("served", "routes/served-tab.tsx"),
      route("terminal", "routes/terminal-tab.tsx"),
      route("vscode", "routes/vscode-tab.tsx"),
    ]),
    route("microagent-management", "routes/microagent-management.tsx"),
    route("teams", "routes/teams.tsx"),
    route("teams/:teamId", "routes/team-details.tsx"),
    route("profile", "routes/user-profile.tsx"),
    route("debug-tailwind", "routes/debug-tailwind.tsx"),
    route("*", "routes/not-found.tsx"),
  ]),
] satisfies RouteConfig;
