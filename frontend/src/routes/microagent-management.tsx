import { Route } from "./+types/settings";
import { MicroagentManagementContent } from "#/components/features/microagent-management/microagent-management-content";
import { ConversationSubscriptionsProvider } from "#/context/conversation-subscriptions-provider";
import { EventHandler } from "#/wrapper/event-handler";
import { requireAuth } from "#/utils/auth.client";

export const clientLoader = async ({ request }: Route.ClientLoaderArgs) => {
  // Require authentication
  await requireAuth(request);

  // Don't fetch config here - let the component handle it
  // This avoids the auth loop issue

  return null;
};

function MicroagentManagement() {
  return (
    <ConversationSubscriptionsProvider>
      <EventHandler>
        <MicroagentManagementContent />
      </EventHandler>
    </ConversationSubscriptionsProvider>
  );
}

export default MicroagentManagement;
