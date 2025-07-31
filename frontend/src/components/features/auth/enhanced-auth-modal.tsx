import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { I18nKey } from "#/i18n/declaration";
import AllHandsLogo from "#/assets/branding/all-hands-logo.svg?react";
import { ModalBackdrop } from "#/components/shared/modals/modal-backdrop";
import { ModalBody } from "#/components/shared/modals/modal-body";
import { BrandButton } from "../settings/brand-button";
import GitHubLogo from "#/assets/branding/github-logo.svg?react";
import GitLabLogo from "#/assets/branding/gitlab-logo.svg?react";
import BitbucketLogo from "#/assets/branding/bitbucket-logo.svg?react";
import { useAuthUrl } from "#/hooks/use-auth-url";
import { Provider } from "#/types/settings";
import { EmailAuthModal } from "./email-auth-modal";
import { Mail } from "#/components/shared/icons";

interface EnhancedAuthModalProps {
  githubAuthUrl: string | null;
  providersConfigured?: Provider[];
  onSuccess?: () => void;
}

export function EnhancedAuthModal({
  githubAuthUrl,
  providersConfigured,
  onSuccess,
}: EnhancedAuthModalProps) {
  const { t } = useTranslation();
  const [showEmailAuth, setShowEmailAuth] = useState(false);

  const gitlabAuthUrl = useAuthUrl({
    identityProvider: "gitlab",
  });

  const bitbucketAuthUrl = useAuthUrl({
    identityProvider: "bitbucket",
  });

  const handleGitHubAuth = () => {
    if (githubAuthUrl) {
      window.location.href = githubAuthUrl;
    }
  };

  const handleGitLabAuth = () => {
    if (gitlabAuthUrl) {
      window.location.href = gitlabAuthUrl;
    }
  };

  const handleBitbucketAuth = () => {
    if (bitbucketAuthUrl) {
      window.location.href = bitbucketAuthUrl;
    }
  };

  // Show email auth modal if selected
  if (showEmailAuth) {
    return (
      <EmailAuthModal
        onBack={() => setShowEmailAuth(false)}
        onSuccess={onSuccess}
      />
    );
  }

  // Only show buttons if providers are configured and include the specific provider
  const showGithub =
    providersConfigured &&
    providersConfigured.length > 0 &&
    providersConfigured.includes("github");
  const showGitlab =
    providersConfigured &&
    providersConfigured.length > 0 &&
    providersConfigured.includes("gitlab");
  const showBitbucket =
    providersConfigured &&
    providersConfigured.length > 0 &&
    providersConfigured.includes("bitbucket");

  // Check if no OAuth providers are configured
  const noOAuthProvidersConfigured =
    !providersConfigured || providersConfigured.length === 0;

  return (
    <ModalBackdrop>
      <ModalBody className="border border-tertiary">
        <AllHandsLogo width={68} height={46} />
        <div className="flex flex-col gap-2 w-full items-center text-center">
          <h1 className="text-2xl font-bold">
            {t(I18nKey.AUTH$SIGN_IN_WITH_IDENTITY_PROVIDER)}
          </h1>
        </div>

        <div className="flex flex-col gap-3 w-full">
          {/* Email/Password option - always available */}
          <BrandButton
            type="button"
            variant="primary"
            onClick={() => setShowEmailAuth(true)}
            className="w-full"
            startContent={<Mail className="w-5 h-5" />}
          >
            Continue with Email
          </BrandButton>

          {!noOAuthProvidersConfigured && (
            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or continue with
                </span>
              </div>
            </div>
          )}

          {noOAuthProvidersConfigured ? (
            <div className="text-center p-4 text-muted-foreground">
              {t(I18nKey.AUTH$NO_PROVIDERS_CONFIGURED)}
            </div>
          ) : (
            <>
              {showGithub && (
                <BrandButton
                  type="button"
                  variant="secondary"
                  onClick={handleGitHubAuth}
                  className="w-full"
                  startContent={<GitHubLogo width={20} height={20} />}
                >
                  {t(I18nKey.GITHUB$CONNECT_TO_GITHUB)}
                </BrandButton>
              )}

              {showGitlab && (
                <BrandButton
                  type="button"
                  variant="secondary"
                  onClick={handleGitLabAuth}
                  className="w-full"
                  startContent={<GitLabLogo width={20} height={20} />}
                >
                  {t(I18nKey.GITLAB$CONNECT_TO_GITLAB)}
                </BrandButton>
              )}

              {showBitbucket && (
                <BrandButton
                  type="button"
                  variant="secondary"
                  onClick={handleBitbucketAuth}
                  className="w-full"
                  startContent={<BitbucketLogo width={20} height={20} />}
                >
                  {t(I18nKey.BITBUCKET$CONNECT_TO_BITBUCKET)}
                </BrandButton>
              )}
            </>
          )}
        </div>

        <p
          className="mt-4 text-xs text-center text-muted-foreground"
          data-testid="auth-modal-terms-of-service"
        >
          {t(I18nKey.AUTH$BY_SIGNING_UP_YOU_AGREE_TO_OUR)}{" "}
          <a
            href="https://www.all-hands.dev/tos"
            target="_blank"
            className="underline hover:text-primary"
            rel="noopener noreferrer"
          >
            {t(I18nKey.COMMON$TERMS_OF_SERVICE)}
          </a>{" "}
          {t(I18nKey.COMMON$AND)}{" "}
          <a
            href="https://www.all-hands.dev/privacy"
            target="_blank"
            className="underline hover:text-primary"
            rel="noopener noreferrer"
          >
            {t(I18nKey.COMMON$PRIVACY_POLICY)}
          </a>
          .
        </p>
      </ModalBody>
    </ModalBackdrop>
  );
}
