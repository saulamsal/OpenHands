import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { useSettings } from "#/hooks/query/use-settings";
import { openHands } from "#/api/open-hands-axios";
import { displaySuccessToast } from "#/utils/custom-toast-handlers";
import { useAuth } from "#/context/auth-context";

// Email validation regex pattern
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

function UsernameSection({
  username,
  onUsernameChange,
  onSaveUsername,
  isSaving,
  isUsernameChanged,
}: {
  username: string;
  onUsernameChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSaveUsername: () => void;
  isSaving: boolean;
  isUsernameChanged: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label className="text-sm">{t("SETTINGS$USERNAME")}</label>
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={username}
            onChange={onUsernameChange}
            className="text-base text-white p-2 bg-base-tertiary rounded-sm border border-tertiary flex-grow"
            placeholder={t("SETTINGS$USERNAME_LOADING")}
            data-testid="username-input"
          />
        </div>

        <div className="flex items-center gap-3 mt-2">
          <button
            type="button"
            onClick={onSaveUsername}
            disabled={!isUsernameChanged || isSaving}
            className="px-4 py-2 rounded-sm bg-primary text-white hover:opacity-80 disabled:opacity-30 disabled:cursor-not-allowed disabled:text-primary-foreground"
            data-testid="save-username-button"
          >
            {isSaving ? t("SETTINGS$SAVING") : t("SETTINGS$SAVE")}
          </button>
        </div>
      </div>
    </div>
  );
}

function EmailSection({
  email,
  onEmailChange,
  onSaveEmail,
  onResendVerification,
  isSaving,
  isResendingVerification,
  isEmailChanged,
  emailVerified,
  isEmailValid,
  children,
}: {
  email: string;
  onEmailChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSaveEmail: () => void;
  onResendVerification: () => void;
  isSaving: boolean;
  isResendingVerification: boolean;
  isEmailChanged: boolean;
  emailVerified?: boolean;
  isEmailValid: boolean;
  children: React.ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label className="text-sm">{t("SETTINGS$USER_EMAIL")}</label>
        <div className="flex items-center gap-3">
          <input
            type="email"
            value={email}
            onChange={onEmailChange}
            className={`text-base text-white p-2 bg-base-tertiary rounded-sm border ${
              isEmailChanged && !isEmailValid
                ? "border-red-500"
                : "border-tertiary"
            } flex-grow`}
            placeholder={t("SETTINGS$USER_EMAIL_LOADING")}
            data-testid="email-input"
          />
        </div>

        {isEmailChanged && !isEmailValid && (
          <div
            className="text-red-500 text-sm mt-1"
            data-testid="email-validation-error"
          >
            {t("SETTINGS$INVALID_EMAIL_FORMAT")}
          </div>
        )}

        <div className="flex items-center gap-3 mt-2">
          <button
            type="button"
            onClick={onSaveEmail}
            disabled={!isEmailChanged || isSaving || !isEmailValid}
            className="px-4 py-2 rounded-sm bg-primary text-white hover:opacity-80 disabled:opacity-30 disabled:cursor-not-allowed disabled:text-primary-foreground"
            data-testid="save-email-button"
          >
            {isSaving ? t("SETTINGS$SAVING") : t("SETTINGS$SAVE")}
          </button>

          {emailVerified === false && (
            <button
              type="button"
              onClick={onResendVerification}
              disabled={isResendingVerification}
              className="px-4 py-2 rounded-sm bg-primary text-white hover:opacity-80 disabled:opacity-30 disabled:cursor-not-allowed disabled:text-primary-foreground"
              data-testid="resend-verification-button"
            >
              {isResendingVerification
                ? t("SETTINGS$SENDING")
                : t("SETTINGS$RESEND_VERIFICATION")}
            </button>
          )}
        </div>

        {children}
      </div>
    </div>
  );
}

function VerificationAlert() {
  const { t } = useTranslation();
  return (
    <div
      className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-sm mt-4"
      role="alert"
    >
      <p className="font-bold">{t("SETTINGS$EMAIL_VERIFICATION_REQUIRED")}</p>
      <p className="text-sm">
        {t("SETTINGS$EMAIL_VERIFICATION_RESTRICTION_MESSAGE")}
      </p>
    </div>
  );
}

function AccountSettingsScreen() {
  const { t } = useTranslation();
  const { data: settings, isLoading, refetch } = useSettings();
  const [email, setEmail] = useState("");
  const [originalEmail, setOriginalEmail] = useState("");
  const [username, setUsername] = useState("");
  const [originalUsername, setOriginalUsername] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingUsername, setIsSavingUsername] = useState(false);
  const [isResendingVerification, setIsResendingVerification] = useState(false);
  const [isEmailValid, setIsEmailValid] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const queryClient = useQueryClient();
  const pollingIntervalRef = useRef<number | null>(null);
  const prevVerificationStatusRef = useRef<boolean | undefined>(undefined);
  const { logout } = useAuth();

  useEffect(() => {
    if (settings?.EMAIL) {
      setEmail(settings.EMAIL);
      setOriginalEmail(settings.EMAIL);
      setIsEmailValid(EMAIL_REGEX.test(settings.EMAIL));
    }
    if (settings?.USERNAME) {
      setUsername(settings.USERNAME);
      setOriginalUsername(settings.USERNAME);
    }
  }, [settings?.EMAIL, settings?.USERNAME]);

  useEffect(() => {
    if (pollingIntervalRef.current) {
      window.clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    if (
      prevVerificationStatusRef.current === false &&
      settings?.EMAIL_VERIFIED === true
    ) {
      displaySuccessToast(t("SETTINGS$EMAIL_VERIFIED_SUCCESSFULLY"));
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["settings"] });
      }, 2000);
    }

    prevVerificationStatusRef.current = settings?.EMAIL_VERIFIED;

    if (settings?.EMAIL_VERIFIED === false) {
      pollingIntervalRef.current = window.setInterval(() => {
        refetch();
      }, 5000);
    }

    return () => {
      if (pollingIntervalRef.current) {
        window.clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [settings?.EMAIL_VERIFIED, refetch, queryClient, t]);

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEmail = e.target.value;
    setEmail(newEmail);
    setIsEmailValid(EMAIL_REGEX.test(newEmail));
  };

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUsername(e.target.value);
  };

  const handleSaveEmail = async () => {
    if (email === originalEmail || !isEmailValid) return;
    try {
      setIsSaving(true);
      await openHands.post("/api/email", { email }, { withCredentials: true });
      setOriginalEmail(email);
      displaySuccessToast(t("SETTINGS$EMAIL_SAVED_SUCCESSFULLY"));
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    } catch (error) {
      console.error(t("SETTINGS$FAILED_TO_SAVE_EMAIL"), error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveUsername = async () => {
    if (username === originalUsername) return;
    try {
      setIsSavingUsername(true);
      await openHands.post(
        "/api/username",
        { username },
        { withCredentials: true },
      );
      setOriginalUsername(username);
      displaySuccessToast(t("SETTINGS$USERNAME_SAVED_SUCCESSFULLY"));
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    } catch (error) {
      console.error(t("SETTINGS$FAILED_TO_SAVE_USERNAME"), error);
    } finally {
      setIsSavingUsername(false);
    }
  };

  const handleResendVerification = async () => {
    try {
      setIsResendingVerification(true);
      await openHands.put("/api/email/verify", {}, { withCredentials: true });
      displaySuccessToast(t("SETTINGS$VERIFICATION_EMAIL_SENT"));
    } catch (error) {
      console.error(t("SETTINGS$FAILED_TO_RESEND_VERIFICATION"), error);
    } finally {
      setIsResendingVerification(false);
    }
  };

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await logout();
      displaySuccessToast(t("SETTINGS$LOGOUT_SUCCESS"));
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const isEmailChanged = email !== originalEmail;
  const isUsernameChanged = username !== originalUsername;

  return (
    <div data-testid="account-settings-screen" className="flex flex-col h-full">
      <div className="p-9 flex flex-col gap-6">
        {isLoading ? (
          <div className="animate-pulse h-8 w-64 bg-tertiary rounded-sm" />
        ) : (
          <>
            {/* Username Section */}
            <UsernameSection
              username={username}
              onUsernameChange={handleUsernameChange}
              onSaveUsername={handleSaveUsername}
              isSaving={isSavingUsername}
              isUsernameChanged={isUsernameChanged}
            />

            {/* Email Section */}
            <EmailSection
              email={email}
              onEmailChange={handleEmailChange}
              onSaveEmail={handleSaveEmail}
              onResendVerification={handleResendVerification}
              isSaving={isSaving}
              isResendingVerification={isResendingVerification}
              isEmailChanged={isEmailChanged}
              emailVerified={settings?.EMAIL_VERIFIED}
              isEmailValid={isEmailValid}
            >
              {settings?.EMAIL_VERIFIED === false && <VerificationAlert />}
            </EmailSection>
          </>
        )}

        {/* Logout Section */}
        <div className="border-t border-tertiary pt-6 mt-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <h3 className="text-lg font-medium text-white">
                {t("SETTINGS$ACCOUNT_ACTIONS")}
              </h3>
              <p className="text-sm text-muted-foreground">
                {t("SETTINGS$LOGOUT_DESCRIPTION")}
              </p>
            </div>
            <div className="flex justify-start">
              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="px-4 py-2 rounded-sm bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                data-testid="logout-button"
              >
                {isLoggingOut
                  ? t("SETTINGS$SIGNING_OUT")
                  : t("SETTINGS$SIGN_OUT")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AccountSettingsScreen;
