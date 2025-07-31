import React from "react";
import { Team } from "#/api/open-hands.types";
import { Button } from "#/components/shared/buttons/button";
import { Plus, Users, User, Settings, Crown } from "#/components/shared/icons";
import { cn } from "#/utils/cn";
import { useAuth } from "#/context/auth-context";

interface TeamListProps {
  teams: Team[];
  onCreateTeam: () => void;
  onSelectTeam: (team: Team) => void;
  className?: string;
}

export function TeamList({
  teams,
  onCreateTeam,
  onSelectTeam,
  className,
}: TeamListProps) {
  const { activeTeam, user } = useAuth();

  const personalTeams = teams.filter((team) => team.is_personal);
  const regularTeams = teams.filter((team) => !team.is_personal);

  return (
    <div className={cn("space-y-6", className)}>
      {/* Personal Team Section */}
      {personalTeams.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
            <User className="h-4 w-4" />
            Personal Team
          </h3>
          <div className="space-y-2">
            {personalTeams.map((team) => (
              <TeamCard
                key={team.id}
                team={team}
                isActive={activeTeam?.id === team.id}
                isOwner={team.owner_id === user?.id}
                onClick={() => onSelectTeam(team)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Regular Teams Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Users className="h-4 w-4" />
            Teams
          </h3>
          <Button
            variant="outline"
            size="sm"
            onClick={onCreateTeam}
            className="h-8"
          >
            <Plus className="h-4 w-4 mr-1" />
            New Team
          </Button>
        </div>
        {regularTeams.length > 0 ? (
          <div className="space-y-2">
            {regularTeams.map((team) => (
              <TeamCard
                key={team.id}
                team={team}
                isActive={activeTeam?.id === team.id}
                isOwner={team.owner_id === user?.id}
                onClick={() => onSelectTeam(team)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No teams yet</p>
            <p className="text-xs mt-1">
              Create a team to collaborate with others
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

interface TeamCardProps {
  team: Team;
  isActive: boolean;
  isOwner: boolean;
  onClick: () => void;
}

function TeamCard({ team, isActive, isOwner, onClick }: TeamCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full p-4 rounded-lg border text-left transition-all",
        "hover:border-primary/50 hover:bg-accent/50",
        "flex items-center justify-between group",
        isActive ? "border-primary bg-primary/5" : "border-border bg-card",
      )}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div
          className={cn(
            "h-10 w-10 rounded-lg flex items-center justify-center shrink-0",
            team.is_personal
              ? "bg-primary/10 text-primary"
              : "bg-muted text-muted-foreground",
          )}
        >
          {team.is_personal ? (
            <User className="h-5 w-5" />
          ) : (
            <Users className="h-5 w-5" />
          )}
        </div>
        <div className="min-w-0">
          <h4 className="font-medium truncate flex items-center gap-2">
            {team.name}
            {isOwner && <Crown className="h-3 w-3 text-primary" />}
          </h4>
          <p className="text-xs text-muted-foreground">
            {team.is_personal ? "Your personal workspace" : "Team workspace"}
          </p>
        </div>
      </div>
      {!team.is_personal && (
        <Settings className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      )}
    </button>
  );
}
