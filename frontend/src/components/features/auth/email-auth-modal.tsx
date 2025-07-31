import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { I18nKey } from "#/i18n/declaration";
import AllHandsLogo from "#/assets/branding/all-hands-logo.svg?react";
import { ModalBackdrop } from "#/components/shared/modals/modal-backdrop";
import { ModalBody } from "#/components/shared/modals/modal-body";
import { LoginForm } from "./login-form";
import { RegisterForm } from "./register-form";
import { useAuth } from "#/context/auth-context";
import { Button } from "#/components/shared/buttons/button";
import { ChevronLeft } from "#/components/shared/icons";

interface EmailAuthModalProps {
  onBack?: () => void;
  onSuccess?: () => void;
}

export function EmailAuthModal({ onBack, onSuccess }: EmailAuthModalProps) {
  const { t } = useTranslation();
  const { login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await login(email, password);
      onSuccess?.();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Invalid email or password");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (
    email: string,
    password: string,
    name: string,
  ) => {
    setIsLoading(true);
    setError(null);
    try {
      await register(email, password, name);
      onSuccess?.();
    } catch (err: any) {
      if (err.response?.data?.detail === "REGISTER_USER_ALREADY_EXISTS") {
        setError("An account with this email already exists");
      } else {
        setError(
          err.response?.data?.detail ||
            "Failed to create account. Please try again.",
        );
      }
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ModalBackdrop>
      <ModalBody className="border border-tertiary min-w-[400px]">
        <div className="flex items-start w-full mb-4">
          {onBack && (
            <Button
              variant="outline"
              size="icon"
              onClick={onBack}
              className="mr-4"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
          <div className="flex-1 flex justify-center">
            <AllHandsLogo width={68} height={46} />
          </div>
          {onBack && <div className="w-10" />} {/* Spacer for centering */}
        </div>

        <div className="flex flex-col gap-2 w-full items-center text-center mb-6">
          <h1 className="text-2xl font-bold">
            {mode === "login"
              ? t(I18nKey.AUTH$SIGN_IN_WITH_EMAIL)
              : t(I18nKey.AUTH$CREATE_ACCOUNT)}
          </h1>
        </div>

        {mode === "login" ? (
          <LoginForm
            onSubmit={handleLogin}
            onSwitchToRegister={() => {
              setMode("register");
              setError(null);
            }}
            isLoading={isLoading}
            error={error}
          />
        ) : (
          <RegisterForm
            onSubmit={handleRegister}
            onSwitchToLogin={() => {
              setMode("login");
              setError(null);
            }}
            isLoading={isLoading}
            error={error}
          />
        )}
      </ModalBody>
    </ModalBackdrop>
  );
}
