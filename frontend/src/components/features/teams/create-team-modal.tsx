import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { ModalBackdrop } from "#/components/shared/modals/modal-backdrop";
import { ModalBody } from "#/components/shared/modals/modal-body";
import { ModalHeader } from "#/components/shared/modals/modal-header";
import { Button } from "#/components/shared/buttons/button";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import OpenHands from "#/api/open-hands";
import { Team } from "#/api/open-hands.types";

interface CreateTeamModalProps {
  onClose: () => void;
  onSuccess: (team: Team) => void;
}

export function CreateTeamModal({ onClose, onSuccess }: CreateTeamModalProps) {
  const { t } = useTranslation();
  const [teamName, setTeamName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!teamName.trim()) {
      setError("Team name is required");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const team = await OpenHands.createTeam(teamName.trim());
      onSuccess(team);
      onClose();
    } catch (err: any) {
      setError(
        err.response?.data?.detail ||
          "Failed to create team. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ModalBackdrop onClose={onClose}>
      <ModalBody className="w-full max-w-md">
        <ModalHeader onClose={onClose}>Create New Team</ModalHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="teamName">Team Name</Label>
            <Input
              id="teamName"
              type="text"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="e.g., Engineering Team"
              disabled={isLoading}
              autoFocus
              required
            />
            <p className="text-xs text-muted-foreground">
              Choose a name that describes your team or project
            </p>
          </div>

          {error && (
            <div className="text-sm text-destructive" role="alert">
              {error}
            </div>
          )}

          <div className="flex gap-3 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} loading={isLoading}>
              {isLoading ? "Creating..." : "Create Team"}
            </Button>
          </div>
        </form>
      </ModalBody>
    </ModalBackdrop>
  );
}
