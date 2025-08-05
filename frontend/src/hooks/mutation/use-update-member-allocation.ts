import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateTeamMemberAllocation } from "#/api/billing";
import { useToast } from "#/hooks/use-toast";

interface UpdateMemberAllocationParams {
  teamId: string;
  userId: string;
  allocationType: "unlimited" | "percentage" | "fixed" | "equal";
  allocationValue?: number;
}

export function useUpdateMemberAllocation() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: UpdateMemberAllocationParams) =>
      updateTeamMemberAllocation(
        params.teamId,
        params.userId,
        params.allocationType,
        params.allocationValue,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
      queryClient.invalidateQueries({ queryKey: ["team-usage"] });
      toast({
        title: "Allocation updated",
        description:
          "Team member token allocation has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error updating allocation",
        description: error.message || "Failed to update team member allocation",
        variant: "destructive",
      });
    },
  });
}
