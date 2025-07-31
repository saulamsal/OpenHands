import React, { useState } from "react";
import { useParams, useNavigate } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import OpenHands from "#/api/open-hands";
import { useAuth } from "#/context/auth-context";
import { TeamMember } from "#/api/open-hands.types";
import { Button } from "#/components/shared/buttons/button";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { Skeleton } from "#/components/ui/skeleton";
import {
  AlertCircle,
  ArrowLeft,
  Crown,
  Mail,
  Shield,
  UserPlus,
  Users,
  Trash2,
} from "#/components/shared/icons";
import { requireAuth } from "#/utils/auth.client";
import { Route } from "./+types/team-details";
import { cn } from "#/utils/cn";

export const clientLoader = async ({ request }: Route.ClientLoaderArgs) => {
  await requireAuth(request);
  return null;
};

export default function TeamDetailsPage() {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"developer">("developer");
  const [inviteError, setInviteError] = useState<string | null>(null);

  // Fetch team details
  const { data: team, isLoading: teamLoading } = useQuery({
    queryKey: ["team", teamId],
    queryFn: () => OpenHands.getTeam(teamId!),
    enabled: !!teamId,
  });

  // Fetch team members
  const { data: members, isLoading: membersLoading } = useQuery({
    queryKey: ["team-members", teamId],
    queryFn: () => OpenHands.getTeamMembers(teamId!),
    enabled: !!teamId,
  });

  // Invite member mutation
  const inviteMutation = useMutation({
    mutationFn: (data: {
      email: string;
      role: "admin" | "developer" | "viewer";
    }) => OpenHands.inviteTeamMember(teamId!, data.email, data.role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members", teamId] });
      setInviteEmail("");
      setInviteError(null);
    },
    onError: (error: any) => {
      setInviteError(error.response?.data?.detail || "Failed to invite member");
    },
  });

  // Remove member mutation
  const removeMemberMutation = useMutation({
    mutationFn: (userId: string) => OpenHands.removeTeamMember(teamId!, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members", teamId] });
    },
  });

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    inviteMutation.mutate({
      email: inviteEmail.trim(),
      role: inviteRole,
    });
  };

  const isOwner = team?.owner_id === user?.id;
  const canManageMembers = isOwner; // TODO: Add admin check

  if (teamLoading || membersLoading) {
    return (
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <Skeleton className="h-8 w-48 mb-8" />
        <div className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
          <p className="text-muted-foreground">Team not found</p>
          <Button
            variant="outline"
            onClick={() => navigate("/teams")}
            className="mt-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Teams
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/teams")}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Teams
        </Button>
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "h-12 w-12 rounded-lg flex items-center justify-center",
              team.is_personal
                ? "bg-primary/10 text-primary"
                : "bg-muted text-muted-foreground",
            )}
          >
            <Users className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">{team.name}</h1>
            <p className="text-muted-foreground">
              {team.is_personal ? "Personal workspace" : "Team workspace"}
            </p>
          </div>
        </div>
      </div>

      {/* Members Section */}
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold mb-4">Team Members</h2>
          {members && members.length > 0 ? (
            <div className="space-y-2">
              {members.map((member) => (
                <MemberCard
                  key={member.id}
                  member={member}
                  canRemove={
                    canManageMembers &&
                    member.user_id !== user?.id &&
                    member.role !== "owner"
                  }
                  onRemove={() => removeMemberMutation.mutate(member.user_id)}
                />
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No members yet</p>
          )}
        </div>

        {/* Invite Section */}
        {canManageMembers && !team.is_personal && (
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-4">Invite Team Member</h3>
            <form onSubmit={handleInvite} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="colleague@example.com"
                    disabled={inviteMutation.isPending}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <select
                    id="role"
                    value={inviteRole}
                    onChange={(e) =>
                      setInviteRole(e.target.value as typeof inviteRole)
                    }
                    className="w-full h-10 px-3 rounded-md border border-input bg-background"
                    disabled={inviteMutation.isPending}
                  >
                    <option value="developer">Developer</option>
                    <option value="admin">Admin</option>
                    <option value="viewer">Viewer</option>
                  </select>
                </div>
              </div>
              {inviteError && (
                <div className="text-sm text-destructive">{inviteError}</div>
              )}
              <Button
                type="submit"
                disabled={!inviteEmail.trim() || inviteMutation.isPending}
                loading={inviteMutation.isPending}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Send Invitation
              </Button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

interface MemberCardProps {
  member: TeamMember;
  canRemove: boolean;
  onRemove: () => void;
}

function MemberCard({ member, canRemove, onRemove }: MemberCardProps) {
  const roleIcons = {
    owner: <Crown className="h-4 w-4" />,
    admin: <Shield className="h-4 w-4" />,
    developer: <Users className="h-4 w-4" />,
    viewer: <Users className="h-4 w-4" />,
  };

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
          <Mail className="h-5 w-5 text-muted-foreground" />
        </div>
        <div>
          <p className="font-medium">{member.user_name || "Unknown User"}</p>
          <p className="text-sm text-muted-foreground">{member.user_email}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 text-sm capitalize">
          {roleIcons[member.role]}
          <span>{member.role}</span>
        </div>
        {canRemove && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRemove}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
