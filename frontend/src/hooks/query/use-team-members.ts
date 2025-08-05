import { useQuery } from "@tanstack/react-query";
import { openHands } from "#/api/open-hands-axios";

interface TeamMember {
  id: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  role: "owner" | "member" | "admin";
  allocation_type?: "unlimited" | "percentage" | "fixed" | "equal";
  allocation_value?: number;
}

export function useTeamMembers(teamId: string) {
  return useQuery({
    queryKey: ["team-members", teamId],
    queryFn: async () => {
      if (!teamId) return [];
      const { data } = await openHands.get<{ members: TeamMember[] }>(
        `/api/teams/${teamId}/members`,
      );
      return data.members;
    },
    enabled: !!teamId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
