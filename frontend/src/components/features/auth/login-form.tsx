import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { Button } from "#/components/shared/buttons/button";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { cn } from "#/utils/cn";

interface LoginFormProps {
  onSubmit: (email: string, password: string) => Promise<void>;
  onSwitchToRegister?: () => void;
  isLoading?: boolean;
  error?: string | null;
  className?: string;
}

export function LoginForm({
  onSubmit,
  onSwitchToRegister,
  isLoading = false,
  error = null,
  className,
}: LoginFormProps) {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    // Basic validation
    if (!email || !password) {
      setValidationError("Please fill in all fields");
      return;
    }

    if (!email.includes("@")) {
      setValidationError("Please enter a valid email address");
      return;
    }

    try {
      await onSubmit(email, password);
    } catch (err) {
      // Error is handled by parent component
    }
  };

  const displayError = validationError || error;

  return (
    <form
      onSubmit={handleSubmit}
      className={cn("space-y-6 w-full max-w-sm", className)}
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            disabled={isLoading}
            required
            autoComplete="username"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            disabled={isLoading}
            required
            autoComplete="current-password"
          />
        </div>
      </div>

      {displayError && (
        <div className="text-sm text-destructive" role="alert">
          {displayError}
        </div>
      )}

      <div className="space-y-4">
        <Button
          type="submit"
          className="w-full"
          disabled={isLoading}
          loading={isLoading}
        >
          {isLoading ? "Signing in..." : "Sign In"}
        </Button>

        <div className="text-center text-sm">
          <span className="text-muted-foreground">Don't have an account? </span>
          {onSwitchToRegister ? (
            <button
              type="button"
              onClick={onSwitchToRegister}
              className="text-primary hover:underline font-medium"
            >
              Sign up
            </button>
          ) : (
            <Link
              to="/auth/register"
              className="text-primary hover:underline font-medium"
            >
              Sign up
            </Link>
          )}
        </div>

        <div className="text-center">
          <Link
            to="/auth/forgot-password"
            className="text-sm text-muted-foreground hover:text-primary hover:underline"
          >
            Forgot your password?
          </Link>
        </div>
      </div>
    </form>
  );
}
