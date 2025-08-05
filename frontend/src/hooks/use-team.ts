import { useQuery } from "@tanstack/react-query";
import { openHands } from "#/api/open-hands-axios";

interface Team {
  id: string;
  name: string;
  role: "owner" | "member" | "admin";
}

export function useTeam() {
  const { data: teams } = useQuery({
    queryKey: ["teams"],
    queryFn: async () => {
      const { data } = await openHands.get<{ teams: Team[] }>("/api/teams");
      return data.teams;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Get active team from localStorage or default to first team
  const activeTeamId = localStorage.getItem("openhands_active_team");
  const activeTeam = teams?.find((t) => t.id === activeTeamId) || teams?.[0];

  return {
    teams,
    activeTeam,
  };
}
