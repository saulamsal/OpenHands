import React, { useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "#/context/auth-context";
import { Button } from "#/components/shared/buttons/button";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import {
  ArrowLeft,
  Mail,
  Calendar,
  Shield,
  Check,
  X,
} from "#/components/shared/icons";
import { cn } from "#/utils/cn";
import { requireAuth } from "#/utils/auth.client";
import { Route } from "./+types/user-profile";

export const clientLoader = async ({ request }: Route.ClientLoaderArgs) => {
  await requireAuth(request);
  return null;
};

export default function UserProfile() {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name || "");
  const [isSaving, setIsSaving] = useState(false);

  if (!user) {
    navigate("/");
    return null;
  }

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // TODO: Implement user update API call
      // await OpenHands.updateUser({ name });
      await refreshUser();
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to update profile:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setName(user.name || "");
    setIsEditing(false);
  };

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-3xl font-bold">Profile</h1>
        <p className="text-muted-foreground">Manage your account settings</p>
      </div>

      {/* Profile Card */}
      <div className="bg-card border rounded-lg p-6 space-y-6">
        {/* Avatar Section */}
        <div className="flex items-center gap-4">
          <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center">
            <Mail className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">
              {user.name || "Unnamed User"}
            </h2>
            <p className="text-muted-foreground">{user.email}</p>
          </div>
        </div>

        <div className="border-t pt-6 space-y-4">
          {/* Name Field */}
          <div className="space-y-2">
            <Label htmlFor="name">Display Name</Label>
            {isEditing ? (
              <div className="flex gap-2">
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  disabled={isSaving}
                />
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={isSaving || !name.trim()}
                  loading={isSaving}
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isSaving}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <p className="text-sm">{user.name || "Not set"}</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsEditing(true)}
                >
                  Edit
                </Button>
              </div>
            )}
          </div>

          {/* Email Field */}
          <div className="space-y-2">
            <Label>Email Address</Label>
            <div className="flex items-center justify-between">
              <p className="text-sm">{user.email}</p>
              <div className="flex items-center gap-2">
                {user.is_verified ? (
                  <span className="text-xs text-green-600 flex items-center gap-1">
                    <Check className="h-3 w-3" />
                    Verified
                  </span>
                ) : (
                  <span className="text-xs text-yellow-600">Unverified</span>
                )}
              </div>
            </div>
          </div>

          {/* Account Type */}
          <div className="space-y-2">
            <Label>Account Type</Label>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm">
                {user.is_superuser ? "Administrator" : "Standard User"}
              </p>
            </div>
          </div>

          {/* Member Since */}
          <div className="space-y-2">
            <Label>Member Since</Label>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm">
                {new Date(user.created_at).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
          </div>
        </div>

        {/* Account Status */}
        <div className="border-t pt-6">
          <h3 className="font-medium mb-4">Account Status</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Status:</span>
              <span
                className={cn(
                  "ml-2 font-medium",
                  user.is_active ? "text-green-600" : "text-red-600",
                )}
              >
                {user.is_active ? "Active" : "Inactive"}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Email Verified:</span>
              <span
                className={cn(
                  "ml-2 font-medium",
                  user.is_verified ? "text-green-600" : "text-yellow-600",
                )}
              >
                {user.is_verified ? "Yes" : "No"}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="border-t pt-6 flex gap-3">
          <Button variant="outline" onClick={() => navigate("/settings")}>
            Account Settings
          </Button>
          <Button variant="outline" onClick={() => navigate("/teams")}>
            Manage Teams
          </Button>
        </div>
      </div>
    </div>
  );
}
