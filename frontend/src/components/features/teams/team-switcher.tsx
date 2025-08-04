import React, { useState } from "react";
import { useNavigate } from "react-router";
import { Team } from "#/api/open-hands.types";
import { Button } from "#/components/shared/buttons/button";
import { useAuth } from "#/context/auth-context";
import { cn } from "#/utils/cn";
import {
  ChevronDown,
  Plus,
  Check,
  Users,
  User,
  Crown,
  Settings,
} from "#/components/shared/icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";

interface TeamSwitcherProps {
  onCreateTeam?: () => void;
  className?: string;
  variant?: "default" | "compact" | "collapsed";
  collapsed?: boolean;
}

export function TeamSwitcher({
  onCreateTeam,
  className,
  variant = "default",
  collapsed = false,
}: TeamSwitcherProps) {
  const { teams, activeTeam, setActiveTeam, user } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  if (!activeTeam) return null;

  const personalTeams = teams.filter((team) => team.is_personal);
  const regularTeams = teams.filter((team) => !team.is_personal);

  const handleSelectTeam = (team: Team) => {
    setActiveTeam(team);
    setOpen(false);
  };

  const handleManageTeam = (team: Team) => {
    navigate(`/teams/${team.id}`);
    setOpen(false);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            collapsed ? "justify-center p-2 h-10 w-10" : "justify-between gap-2",
            !collapsed && (variant === "compact" ? "h-8 px-2" : "h-10 px-3"),
            className,
          )}
        >
          {collapsed ? (
            // Collapsed state - only show icon
            <div
              className={cn(
                "shrink-0 rounded flex items-center justify-center h-6 w-6",
                activeTeam.is_personal
                  ? "bg-primary/10 text-primary"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {activeTeam.is_personal ? (
                <User className="h-4 w-4" />
              ) : (
                <Users className="h-4 w-4" />
              )}
            </div>
          ) : (
            // Expanded state - show full content
            <>
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className={cn(
                    "shrink-0 rounded flex items-center justify-center",
                    variant === "compact" ? "h-5 w-5" : "h-6 w-6",
                    activeTeam.is_personal
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {activeTeam.is_personal ? (
                    <User
                      className={variant === "compact" ? "h-3 w-3" : "h-4 w-4"}
                    />
                  ) : (
                    <Users
                      className={variant === "compact" ? "h-3 w-3" : "h-4 w-4"}
                    />
                  )}
                </div>
                <span
                  className={cn("truncate", variant === "compact" && "text-sm")}
                >
                  {activeTeam.name}
                </span>
              </div>
              <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        {/* Personal Teams */}
        {personalTeams.length > 0 && (
          <>
            <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
              Personal
            </div>
            {personalTeams.map((team) => (
              <TeamDropdownItem
                key={team.id}
                team={team}
                isActive={activeTeam.id === team.id}
                isOwner={team.owner_id === user?.id}
                onSelect={() => handleSelectTeam(team)}
                onManage={() => handleManageTeam(team)}
              />
            ))}
          </>
        )}

        {/* Regular Teams */}
        {regularTeams.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
              Teams
            </div>
            {regularTeams.map((team) => (
              <TeamDropdownItem
                key={team.id}
                team={team}
                isActive={activeTeam.id === team.id}
                isOwner={team.owner_id === user?.id}
                onSelect={() => handleSelectTeam(team)}
                onManage={() => handleManageTeam(team)}
              />
            ))}
          </>
        )}

        {/* Create Team */}
        {onCreateTeam && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onCreateTeam}>
              <Plus className="h-4 w-4 mr-2" />
              Create New Team
            </DropdownMenuItem>
          </>
        )}

        {/* Manage Teams */}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate("/teams")}>
          <Settings className="h-4 w-4 mr-2" />
          Manage Teams
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface TeamDropdownItemProps {
  team: Team;
  isActive: boolean;
  isOwner: boolean;
  onSelect: () => void;
  onManage: () => void;
}

function TeamDropdownItem({
  team,
  isActive,
  isOwner,
  onSelect,
  onManage,
}: TeamDropdownItemProps) {
  return (
    <DropdownMenuItem onClick={onSelect} className="group cursor-pointer">
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "h-5 w-5 rounded flex items-center justify-center",
              team.is_personal
                ? "bg-primary/10 text-primary"
                : "bg-muted text-muted-foreground",
            )}
          >
            {team.is_personal ? (
              <User className="h-3 w-3" />
            ) : (
              <Users className="h-3 w-3" />
            )}
          </div>
          <span className="flex items-center gap-1">
            {team.name}
            {isOwner && <Crown className="h-3 w-3 text-primary" />}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {isActive && <Check className="h-4 w-4 text-primary" />}
          {!team.is_personal && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onManage();
              }}
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Settings className="h-3 w-3 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>
      </div>
    </DropdownMenuItem>
  );
}
