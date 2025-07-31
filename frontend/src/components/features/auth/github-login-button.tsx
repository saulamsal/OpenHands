import React from "react";
import { useTranslation } from "react-i18next";
import { Button } from "#/components/shared/buttons/button";
import { GitHubIcon } from "#/components/shared/icons/github-icon";
import OpenHands from "#/api/open-hands";

interface GitHubLoginButtonProps {
  redirectUrl?: string;
  className?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
}

export function GitHubLoginButton({
  redirectUrl,
  className = "",
  variant = "outline",
  size = "default",
}: GitHubLoginButtonProps) {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = React.useState(false);

  const handleGitHubLogin = async () => {
    try {
      setIsLoading(true);

      // Get the GitHub authorization URL from the backend
      const response = await OpenHands.getGitHubLoginUrl(redirectUrl);

      if (response.authorization_url) {
        // Redirect to GitHub for authentication
        window.location.href = response.authorization_url;
      }
    } catch (error) {
      console.error("GitHub login error:", error);
      // TODO: Show error toast
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleGitHubLogin}
      disabled={isLoading}
      variant={variant}
      size={size}
      className={`w-full flex items-center justify-center gap-2 ${className}`}
    >
      <GitHubIcon className="h-5 w-5" />
      <span>{t("AUTH$SIGN_IN_WITH_GITHUB")}</span>
    </Button>
  );
}
