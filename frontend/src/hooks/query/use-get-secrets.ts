import { useQuery } from "@tanstack/react-query";
import { SecretsService } from "#/api/secrets-service";
import { useUserProviders } from "../use-user-providers";
import { useConfig } from "./use-config";

export const useGetSecrets = () => {
  const { data: config } = useConfig();
  const { providers } = useUserProviders();

  // Always operate in SAAS mode
  return useQuery({
    queryKey: ["secrets"],
    queryFn: SecretsService.getSecrets,
    enabled: providers.length > 0,
  });
};
