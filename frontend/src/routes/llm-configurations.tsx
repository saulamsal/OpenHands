import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { BrandButton } from "#/components/features/settings/brand-button";
import { LoadingSpinner } from "#/components/shared/loading-spinner";
import {
  displayErrorToast,
  displaySuccessToast,
} from "#/utils/custom-toast-handlers";
import { I18nKey } from "#/i18n/declaration";
import { useLLMConfigurations } from "#/hooks/query/use-llm-configurations";
import { useDeleteLLMConfiguration } from "#/hooks/mutation/use-delete-llm-configuration";
import { useSetDefaultLLMConfiguration } from "#/hooks/mutation/use-set-default-llm-configuration";
import { LLMConfiguration } from "#/api/llm-configurations";
import { AddLLMConfigurationModal } from "#/components/add-llm-configuration-modal";
import { EditLLMConfigurationModal } from "#/components/edit-llm-configuration-modal";
import { BaseModal } from "#/components/shared/modals/base-modal/base-modal";

function LLMConfigurationsPage() {
  const { t } = useTranslation();
  const { data: configurations, isLoading } = useLLMConfigurations();
  const deleteConfig = useDeleteLLMConfiguration();
  const setDefaultConfig = useSetDefaultLLMConfiguration();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<LLMConfiguration | null>(
    null,
  );
  const [deletingConfig, setDeletingConfig] = useState<LLMConfiguration | null>(
    null,
  );

  const handleDelete = async () => {
    if (!deletingConfig) return;

    try {
      await deleteConfig.mutateAsync(deletingConfig.id);
      displaySuccessToast(t(I18nKey.SETTINGS$API_KEY_DELETED));
      setDeletingConfig(null);
    } catch (error) {
      displayErrorToast(t(I18nKey.ERROR$GENERIC));
    }
  };

  const handleSetDefault = async (config: LLMConfiguration) => {
    try {
      await setDefaultConfig.mutateAsync(config.id);
      displaySuccessToast(t(I18nKey.SETTINGS$SAVED));
    } catch (error) {
      displayErrorToast(t(I18nKey.ERROR$GENERIC));
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case "success":
        return "✅";
      case "failed":
        return "❌";
      default:
        return "⏰";
    }
  };

  const getProviderLabel = (provider: string) => {
    switch (provider) {
      case "openai":
        return "OpenAI";
      case "anthropic":
        return "Anthropic";
      case "gemini":
        return "Google Gemini";
      case "openrouter":
        return "OpenRouter";
      default:
        return provider;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner />
      </div>
    );
  }

  const deleteActions = [
    {
      key: "cancel",
      label: t(I18nKey.BUTTON$CANCEL),
      onClick: () => setDeletingConfig(null),
      variant: "secondary" as const,
    },
    {
      key: "delete",
      label: t(I18nKey.BUTTON$DELETE),
      onClick: handleDelete,
      variant: "danger" as const,
      disabled: deleteConfig.isPending,
    },
  ];

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              {t(I18nKey.SETTINGS$LLM_SETTINGS)}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {t(I18nKey.SETTINGS$LLM_API_KEY_DESCRIPTION)}
            </p>
          </div>
          <div className="flex gap-2">
            <Link to="/settings/llm">
              <BrandButton variant="secondary">
                {t(I18nKey.BUTTON$BACK)}
              </BrandButton>
            </Link>
            <BrandButton onClick={() => setIsAddModalOpen(true)}>
              <span className="mr-2">+</span>
              {t(I18nKey.SETTINGS$CREATE_API_KEY)}
            </BrandButton>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        {configurations?.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              {t(I18nKey.SETTINGS$NO_API_KEYS)}
            </p>
            <BrandButton onClick={() => setIsAddModalOpen(true)}>
              {t(I18nKey.SETTINGS$CREATE_API_KEY)}
            </BrandButton>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {configurations?.map((config) => (
              <div
                key={config.id}
                className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">
                        {config.name}
                        {config.is_default && (
                          <span className="ml-2 text-yellow-500">⭐</span>
                        )}
                      </h3>
                      <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-gray-700">
                        {getProviderLabel(config.provider)}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                      <span className="font-mono">{config.model}</span>
                      <span className="font-mono text-xs">
                        {config.api_key_masked}
                      </span>
                      <span className="flex items-center gap-1">
                        {getStatusIcon(config.test_status)}
                        {config.test_status || t(I18nKey.SETTINGS$NOT_TESTED)}
                      </span>
                    </div>
                    {config.last_used_at && (
                      <p className="text-xs text-gray-500 mt-1">
                        {t(I18nKey.SETTINGS$LAST_USED)}:{" "}
                        {new Date(config.last_used_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {!config.is_default && (
                      <BrandButton
                        variant="tertiary"
                        size="sm"
                        onClick={() => handleSetDefault(config)}
                      >
                        {t(I18nKey.SETTINGS$SET_AS_DEFAULT)}
                      </BrandButton>
                    )}
                    <BrandButton
                      variant="secondary"
                      size="sm"
                      onClick={() => setEditingConfig(config)}
                    >
                      {t(I18nKey.BUTTON$EDIT)}
                    </BrandButton>
                    <BrandButton
                      variant="danger"
                      size="sm"
                      onClick={() => setDeletingConfig(config)}
                    >
                      {t(I18nKey.BUTTON$DELETE)}
                    </BrandButton>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AddLLMConfigurationModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />

      {editingConfig && (
        <EditLLMConfigurationModal
          config={editingConfig}
          isOpen={!!editingConfig}
          onClose={() => setEditingConfig(null)}
        />
      )}

      <BaseModal
        isOpen={!!deletingConfig}
        onOpenChange={() => setDeletingConfig(null)}
        title={t(I18nKey.SETTINGS$DELETE_API_KEY)}
        subtitle={deletingConfig?.name}
        actions={deleteActions}
      >
        <p>{t(I18nKey.SETTINGS$DELETE_API_KEY_CONFIRMATION)}</p>
      </BaseModal>
    </div>
  );
}

export default LLMConfigurationsPage;
