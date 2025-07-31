import { generateAuthUrl } from "#/utils/generate-auth-url";

interface UseAuthUrlConfig {
  identityProvider: string;
}

export const useAuthUrl = (config: UseAuthUrlConfig) =>
  // Always generate auth URL since we're always in SaaS mode now
  generateAuthUrl(config.identityProvider, new URL(window.location.href));
