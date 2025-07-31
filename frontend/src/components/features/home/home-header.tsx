import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { useCreateConversation } from "#/hooks/mutation/use-create-conversation";
import { useIsCreatingConversation } from "#/hooks/use-is-creating-conversation";
import { BrandButton } from "../settings/brand-button";
import AllHandsLogo from "#/assets/branding/all-hands-logo-spark.svg?react";
import { useAuth } from "#/context/auth-context";
import { useConfig } from "#/hooks/query/use-config";

export function HomeHeader() {
  const navigate = useNavigate();
  const {
    mutate: createConversation,
    isPending,
    isSuccess,
  } = useCreateConversation();
  const isCreatingConversationElsewhere = useIsCreatingConversation();
  const { t } = useTranslation();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { data: config } = useConfig();

  // We check for isSuccess because the app might require time to render
  // into the new conversation screen after the conversation is created.
  const isCreatingConversation =
    isPending || isSuccess || isCreatingConversationElsewhere;

  return (
    <header className="flex flex-col gap-5">
      <AllHandsLogo />

      <div className="flex items-center justify-between">
        <h1 className="heading">{t("HOME$LETS_START_BUILDING")}</h1>
        <BrandButton
          testId="header-launch-button"
          variant="primary"
          type="button"
          onClick={() => {
            console.log("[HomeHeader] Launch clicked - Auth state:", {
              isAuthenticated,
              authLoading,
            });

            // Check if user is not authenticated
            if (!isAuthenticated && !authLoading) {
              console.log(
                "[HomeHeader] Not authenticated, redirecting to login",
              );
              navigate("/login");
              return;
            }

            createConversation(
              {},
              {
                onSuccess: (data) => {
                  console.log(
                    "[HomeHeader] Conversation created successfully:",
                    data.conversation_id,
                  );
                  navigate(`/conversations/${data.conversation_id}`);
                },
                onError: (error: any) => {
                  console.error(
                    "[HomeHeader] Failed to create conversation:",
                    error,
                  );
                  // If we get a 401 error, redirect to login
                  if (error?.response?.status === 401) {
                    console.log(
                      "[HomeHeader] Got 401 error, redirecting to login",
                    );
                    navigate("/login");
                  }
                },
              },
            );
          }}
          isDisabled={isCreatingConversation}
        >
          {!isCreatingConversation && t("HOME$LAUNCH_FROM_SCRATCH")}
          {isCreatingConversation && t("HOME$LOADING")}
        </BrandButton>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm max-w-[424px]">
          {t("HOME$OPENHANDS_DESCRIPTION")}
        </p>
        <p className="text-sm">
          {t("HOME$NOT_SURE_HOW_TO_START")}{" "}
          <a
            href="https://docs.all-hands.dev/usage/getting-started"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2"
          >
            {t("HOME$READ_THIS")}
          </a>
        </p>
      </div>
    </header>
  );
}
