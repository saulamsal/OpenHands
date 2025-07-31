import React, { useState } from "react";
import { useNavigate } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "#/context/auth-context";
import { TeamList } from "#/components/features/teams/team-list";
import { CreateTeamModal } from "#/components/features/teams/create-team-modal";
import { Team } from "#/api/open-hands.types";
import OpenHands from "#/api/open-hands";
import { Skeleton } from "#/components/ui/skeleton";
import { AlertCircle } from "#/components/shared/icons";
import { requireAuth } from "#/utils/auth.client";
import { Route } from "./+types/teams";

export const clientLoader = async ({ request }: Route.ClientLoaderArgs) => {
  await requireAuth(request);
  return null;
};

export default function TeamsPage() {
  const { user, setActiveTeam } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Fetch teams
  const {
    data: teams,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["teams"],
    queryFn: OpenHands.getTeams,
    enabled: !!user,
  });

  const handleCreateTeam = (team: Team) => {
    // Invalidate teams query to refetch
    queryClient.invalidateQueries({ queryKey: ["teams"] });
    // Set as active team
    setActiveTeam(team);
    // Navigate to team details
    navigate(`/teams/${team.id}`);
  };

  const handleSelectTeam = (team: Team) => {
    // Set as active team and navigate to team details
    setActiveTeam(team);
    navigate(`/teams/${team.id}`);
  };

  if (!user) {
    navigate("/");
    return null;
  }

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Teams</h1>
        <p className="text-muted-foreground">
          Manage your teams and collaborate with others
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
          <p className="text-muted-foreground">Failed to load teams</p>
          <p className="text-sm text-muted-foreground mt-2">
            Please try refreshing the page
          </p>
        </div>
      ) : teams ? (
        <TeamList
          teams={teams}
          onCreateTeam={() => setShowCreateModal(true)}
          onSelectTeam={handleSelectTeam}
        />
      ) : null}

      {showCreateModal && (
        <CreateTeamModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleCreateTeam}
        />
      )}
    </div>
  );
}
