import React from "react";
import { useNavigate, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { I18nKey } from "#/i18n/declaration";
import { ConversationCard } from "#/components/features/conversation-panel/conversation-card";
import { useUserConversations } from "#/hooks/query/use-user-conversations";
import { useDeleteConversation } from "#/hooks/mutation/use-delete-conversation";
import { useStopConversation } from "#/hooks/mutation/use-stop-conversation";
import { ConfirmDeleteModal } from "#/components/features/conversation-panel/confirm-delete-modal";
import { ConfirmStopModal } from "#/components/features/conversation-panel/confirm-stop-modal";
import { LoadingSpinner } from "#/components/shared/loading-spinner";
import { ExitConversationModal } from "#/components/features/conversation-panel/exit-conversation-modal";
import { useUpdateConversation } from "#/hooks/mutation/use-update-conversation";
import { displaySuccessToast } from "#/utils/custom-toast-handlers";
import { useAuth } from "#/context/auth-context";
import { Provider } from "#/types/settings";

export default function ConversationsPage() {
  const { t } = useTranslation();
  const { conversationId: currentConversationId } = useParams();
  const navigate = useNavigate();
  const { activeTeam } = useAuth();

  const [confirmDeleteModalVisible, setConfirmDeleteModalVisible] =
    React.useState(false);
  const [confirmStopModalVisible, setConfirmStopModalVisible] =
    React.useState(false);
  const [
    confirmExitConversationModalVisible,
    setConfirmExitConversationModalVisible,
  ] = React.useState(false);
  const [selectedConversationId, setSelectedConversationId] = React.useState<
    string | null
  >(null);
  const [openContextMenuId, setOpenContextMenuId] = React.useState<
    string | null
  >(null);

  const { data: conversations, isFetching, error } = useUserConversations();

  const { mutate: deleteConversation } = useDeleteConversation();
  const { mutate: stopConversation } = useStopConversation();
  const { mutate: updateConversation } = useUpdateConversation();

  const handleDeleteProject = (conversationId: string) => {
    setConfirmDeleteModalVisible(true);
    setSelectedConversationId(conversationId);
  };

  const handleStopProject = (conversationId: string) => {
    setConfirmStopModalVisible(true);
    setSelectedConversationId(conversationId);
  };

  const confirmDelete = () => {
    if (selectedConversationId) {
      deleteConversation({ conversationId: selectedConversationId });
    }
    setConfirmDeleteModalVisible(false);
  };

  const confirmStop = () => {
    if (selectedConversationId) {
      stopConversation(
        { conversationId: selectedConversationId },
        {
          onSuccess: () => {
            // Optionally show a success message
          },
        },
      );
    }
    setConfirmStopModalVisible(false);
  };

  const exitConversation = () => {
    setConfirmExitConversationModalVisible(false);
    navigate("/");
  };

  const handleDownloadWorkspace = (conversationId: string) => {
    displaySuccessToast(t(I18nKey.DOWNLOAD_STARTED));
    const link = document.createElement("a");
    link.href = `/api/conversations/${conversationId}/workspace`;
    link.download = "workspace.zip";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleEdit = (conversationId: string, title: string) => {
    updateConversation({ conversationId, newTitle: title });
  };

  const handleResume = (conversationId: string) => {
    // Just navigate directly - we're on the conversations list page, not in a conversation
    navigate(`/conversations/${conversationId}`);
  };

  // Filter conversations by active team
  const filteredConversations = React.useMemo(() => {
    if (!conversations || !activeTeam) return conversations || [];

    // For now, show all conversations until team filtering is implemented in the backend
    // TODO: Filter by team_id when backend returns it
    return conversations;
  }, [conversations, activeTeam]);

  if (error)
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-red-500">{t(I18nKey.ERROR$GENERIC)}</p>
      </div>
    );

  return (
    <div className="h-full bg-base overflow-y-auto">
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">
            {t(I18nKey.SIDEBAR$CONVERSATIONS)}
          </h1>
          {activeTeam && (
            <p className="text-neutral-400 mt-2">
              {activeTeam.is_personal
                ? t(I18nKey.PERSONAL_CONVERSATIONS)
                : `${activeTeam.name} ${t(I18nKey.TEAM_CONVERSATIONS)}`}
            </p>
          )}
        </div>

        {isFetching ? (
          <div className="flex items-center justify-center h-64">
            <LoadingSpinner size="large" />
          </div>
        ) : filteredConversations && filteredConversations.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredConversations.map((conversation) => (
              <ConversationCard
                key={conversation.conversation_id}
                title={conversation.title}
                selectedRepository={{
                  selected_repository: conversation.selected_repository,
                  selected_branch: conversation.selected_branch,
                  git_provider: conversation.git_provider as Provider,
                }}
                lastUpdatedAt={
                  conversation.updated_at || conversation.created_at
                }
                createdAt={conversation.created_at}
                conversationStatus={conversation.status}
                conversationId={conversation.conversation_id}
                onDelete={() =>
                  handleDeleteProject(conversation.conversation_id)
                }
                onStop={() => handleStopProject(conversation.conversation_id)}
                onChangeTitle={(title) =>
                  handleEdit(conversation.conversation_id, title)
                }
                onClick={() => handleResume(conversation.conversation_id)}
                showOptions
                isActive={
                  conversation.conversation_id === currentConversationId
                }
                contextMenuOpen={
                  openContextMenuId === conversation.conversation_id
                }
                onContextMenuToggle={(isOpen) =>
                  setOpenContextMenuId(
                    isOpen ? conversation.conversation_id : null,
                  )
                }
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <p className="text-neutral-400 mb-4">
              {t(I18nKey.NO_CONVERSATIONS)}
            </p>
            <button
              onClick={() => navigate("/")}
              className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark transition-colors"
            >
              {t(I18nKey.START_NEW_CONVERSATION)}
            </button>
          </div>
        )}
      </div>

      {confirmDeleteModalVisible && (
        <ConfirmDeleteModal
          onConfirm={confirmDelete}
          onCancel={() => setConfirmDeleteModalVisible(false)}
        />
      )}
      {confirmStopModalVisible && (
        <ConfirmStopModal
          onConfirm={confirmStop}
          onCancel={() => setConfirmStopModalVisible(false)}
        />
      )}
      {confirmExitConversationModalVisible && (
        <ExitConversationModal
          onConfirm={exitConversation}
          onClose={() => setConfirmExitConversationModalVisible(false)}
        />
      )}
    </div>
  );
}
