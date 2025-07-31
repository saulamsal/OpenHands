import React, { useState } from "react";
import { useNavigate, Link } from "react-router";
import { useTranslation } from "react-i18next";
import { useAuth } from "#/context/auth-context";
import { Button } from "#/components/shared/buttons/button";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { Alert } from "#/components/ui/alert";
import AllHandsLogo from "#/assets/branding/all-hands-logo.svg?react";
import {
  redirectIfAuthenticated,
  getRedirectAfterLogin,
} from "#/utils/auth.client";
import { Route } from "./+types/login";
import { Mail, Lock, AlertCircle } from "#/components/shared/icons";
import { GitHubLoginButton } from "#/components/features/auth/github-login-button";

export const clientLoader = async ({ request }: Route.ClientLoaderArgs) => {
  await redirectIfAuthenticated(request);
  return null;
};

export default function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await login(email, password);
      const redirectTo = getRedirectAfterLogin();
      navigate(redirectTo);
    } catch (err: any) {
      if (err.response?.status === 400) {
        if (err.response?.data?.detail === "LOGIN_BAD_CREDENTIALS") {
          setError("Invalid email or password");
        } else if (err.response?.data?.detail === "LOGIN_USER_NOT_VERIFIED") {
          setError("Please verify your email before logging in");
        } else {
          setError("Login failed. Please try again.");
        }
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-base p-4">
      <div className="w-full max-w-md">
        <div className="bg-base-secondary border border-tertiary rounded-xl p-8">
          <div className="flex flex-col items-center mb-8">
            <AllHandsLogo width={68} height={46} className="mb-4" />
            <h1 className="text-2xl font-bold">Welcome back</h1>
            <p className="text-muted-foreground mt-2">
              Sign in to your account
            </p>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  required
                  autoComplete="current-password"
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || !email || !password}
            >
              {isLoading ? "Signing in..." : "Sign in"}
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-tertiary" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-base-secondary px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>

          <GitHubLoginButton
            redirectUrl={sessionStorage.getItem("redirectAfterLogin") || "/"}
            className="mb-6"
          />

          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">
              Don't have an account?{" "}
            </span>
            <Link to="/register" className="text-primary hover:underline">
              Sign up
            </Link>
          </div>

          <div className="mt-4 text-center">
            <Link
              to="/forgot-password"
              className="text-sm text-muted-foreground hover:text-primary"
            >
              Forgot your password?
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
