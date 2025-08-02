import { NavLink, Outlet, redirect } from "react-router";
import { useTranslation } from "react-i18next";
import SettingsIcon from "#/icons/settings.svg?react";
import { cn } from "#/utils/utils";
import { I18nKey } from "#/i18n/declaration";
import { Route } from "./+types/settings";
import { requireAuth } from "#/utils/auth.client";

// Unified navigation items - all features always available
const NAV_ITEMS = [
  { to: "/settings/account", text: "SETTINGS$NAV_ACCOUNT" },
  { to: "/settings", text: "SETTINGS$NAV_LLM" },
  { to: "/settings/mcp", text: "SETTINGS$NAV_MCP" },
  { to: "/settings/integrations", text: "SETTINGS$NAV_INTEGRATIONS" },
  { to: "/settings/app", text: "SETTINGS$NAV_APPLICATION" },
  { to: "/settings/billing", text: "SETTINGS$NAV_CREDITS" },
  { to: "/settings/secrets", text: "SETTINGS$NAV_SECRETS" },
  { to: "/settings/api-keys", text: "SETTINGS$NAV_API_KEYS" },
];

export const clientLoader = async ({ request }: Route.ClientLoaderArgs) => {
  const url = new URL(request.url);
  const { pathname } = url;

  // Always require authentication (database is the only mode)
  await requireAuth(request);

  // Default to account settings if accessing root settings
  if (pathname === "/settings") {
    return redirect("/settings/account");
  }

  return null;
};

function SettingsScreen() {
  const { t } = useTranslation();

  return (
    <main
      data-testid="settings-screen"
      className="bg-base-secondary border border-tertiary h-full rounded-xl flex flex-col"
    >
      <header className="px-3 py-1.5 border-b border-b-tertiary flex items-center gap-2">
        <SettingsIcon width={16} height={16} />
        <h1 className="text-sm leading-6">{t(I18nKey.SETTINGS$TITLE)}</h1>
      </header>

      <nav
        data-testid="settings-navbar"
        className="flex items-end gap-6 px-9 border-b border-tertiary"
      >
        {NAV_ITEMS.map(({ to, text }) => (
          <NavLink
            end
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                "border-b-2 border-transparent py-2.5 px-4 min-w-[40px] flex items-center justify-center",
                isActive && "border-primary",
              )
            }
          >
            <span className="text-sm">{t(text)}</span>
          </NavLink>
        ))}
      </nav>

      <div className="flex flex-col grow overflow-auto">
        <Outlet />
      </div>
    </main>
  );
}

export default SettingsScreen;
