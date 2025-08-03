import { useQuery } from "@tanstack/react-query";
import OpenHands from "#/api/open-hands";
import { useIsAuthed } from "./use-is-authed";
import { useAuth } from "#/context/auth-context";

export const useUserConversations = () => {
  const { data: userIsAuthenticated } = useIsAuthed();
  const { activeTeam } = useAuth();

  return useQuery({
    queryKey: ["user", "conversations", activeTeam?.id],
    queryFn: () => OpenHands.getUserConversations(activeTeam?.id),
    enabled: !!userIsAuthenticated && !!activeTeam,
  });
};
