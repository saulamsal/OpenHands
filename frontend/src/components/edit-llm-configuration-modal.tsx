import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { BaseModal } from "#/components/shared/modals/base-modal/base-modal";
import { SettingsInput } from "#/components/features/settings/settings-input";
import { SettingsDropdownInput } from "#/components/features/settings/settings-dropdown-input";
import {
  displayErrorToast,
  displaySuccessToast,
} from "#/utils/custom-toast-handlers";
import { I18nKey } from "#/i18n/declaration";
import { useUpdateLLMConfiguration } from "#/hooks/mutation/use-update-llm-configuration";
import { useTestLLMConfiguration } from "#/hooks/mutation/use-test-llm-configuration";
import {
  LLMConfiguration,
  LLMConfigurationUpdate,
} from "#/api/llm-configurations";

interface EditLLMConfigurationModalProps {
  config: LLMConfiguration;
  isOpen: boolean;
  onClose: () => void;
}

const MODELS_BY_PROVIDER: Record<string, { value: string; label: string }[]> = {
  openai: [
    { value: "gpt-4o", label: "GPT-4 Optimized" },
    { value: "gpt-4o-mini", label: "GPT-4 Optimized Mini" },
    { value: "gpt-4-turbo", label: "GPT-4 Turbo" },
    { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo" },
  ],
  anthropic: [
    { value: "claude-3.5-sonnet", label: "Claude 3.5 Sonnet" },
    { value: "claude-3-opus", label: "Claude 3 Opus" },
    { value: "claude-3-haiku", label: "Claude 3 Haiku" },
  ],
  gemini: [
    { value: "gemini-1.5-pro", label: "Gemini 1.5 Pro" },
    { value: "gemini-1.5-flash", label: "Gemini 1.5 Flash" },
    { value: "gemini-pro", label: "Gemini Pro" },
  ],
  openrouter: [
    { value: "openrouter/auto", label: "Auto (Best Available)" },
    { value: "openrouter/gpt-4o", label: "GPT-4 Optimized" },
    { value: "openrouter/claude-3.5-sonnet", label: "Claude 3.5 Sonnet" },
  ],
};

export function EditLLMConfigurationModal({
  config,
  isOpen,
  onClose,
}: EditLLMConfigurationModalProps) {
  const { t } = useTranslation();
  const updateConfig = useUpdateLLMConfiguration();
  const testConfig = useTestLLMConfiguration();

  const [formData, setFormData] = useState<
    LLMConfigurationUpdate & { provider: string }
  >({
    name: config.name,
    model: config.model,
    api_key: "",
    base_url: config.base_url || "",
    provider: config.provider,
  });

  const [showTestButton, setShowTestButton] = useState(false);

  useEffect(() => {
    setFormData({
      name: config.name,
      model: config.model,
      api_key: "",
      base_url: config.base_url || "",
      provider: config.provider,
    });
  }, [config]);

  const handleSubmit = async () => {
    const updateData: LLMConfigurationUpdate = {
      name: formData.name !== config.name ? formData.name : undefined,
      model: formData.model !== config.model ? formData.model : undefined,
      api_key: formData.api_key || undefined,
      base_url:
        formData.base_url !== config.base_url ? formData.base_url : undefined,
    };

    // Remove undefined values
    Object.keys(updateData).forEach((key) => {
      if (updateData[key as keyof LLMConfigurationUpdate] === undefined) {
        delete updateData[key as keyof LLMConfigurationUpdate];
      }
    });

    if (Object.keys(updateData).length === 0) {
      displayErrorToast(t(I18nKey.SETTINGS$NO_CHANGES));
      return;
    }

    try {
      await updateConfig.mutateAsync({ id: config.id, data: updateData });
      displaySuccessToast(t(I18nKey.SETTINGS$LLM_CONFIGURATION_UPDATED));
      onClose();
    } catch (error) {
      displayErrorToast(t(I18nKey.ERROR$GENERIC));
    }
  };

  const handleTest = async () => {
    try {
      const result = await testConfig.mutateAsync({
        provider: config.provider,
        model: formData.model || config.model,
        api_key: formData.api_key || "", // Will use existing if empty
        base_url: formData.base_url || config.base_url,
      });

      if (result.success) {
        displaySuccessToast(result.message);
      } else {
        displayErrorToast(result.message);
      }
    } catch (error) {
      displayErrorToast(t(I18nKey.ERROR$GENERIC));
    }
  };

  const isSubmitting = updateConfig.isPending;
  const isTesting = testConfig.isPending;

  const actions = [
    {
      key: "cancel",
      label: t(I18nKey.BUTTON$CANCEL),
      onClick: onClose,
      variant: "secondary" as const,
    },
    ...(showTestButton
      ? [
          {
            key: "test",
            label: t(I18nKey.SETTINGS$TEST_CONFIGURATION),
            onClick: handleTest,
            variant: "secondary" as const,
            disabled: isTesting || !formData.api_key,
            isLoading: isTesting,
          },
        ]
      : []),
    {
      key: "submit",
      label: t(I18nKey.BUTTON$SAVE),
      onClick: handleSubmit,
      variant: "primary" as const,
      disabled: isSubmitting,
      isLoading: isSubmitting,
    },
  ];

  return (
    <BaseModal
      isOpen={isOpen}
      onOpenChange={onClose}
      title={t(I18nKey.SETTINGS$EDIT_LLM_CONFIGURATION)}
      subtitle={config.provider.toUpperCase()}
      actions={actions}
    >
      <div className="space-y-4">
        <SettingsInput
          label={t(I18nKey.SETTINGS$CONFIGURATION_NAME)}
          name="name"
          type="text"
          value={formData.name || ""}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, name: e.target.value }))
          }
          placeholder={t(I18nKey.SETTINGS$CONFIGURATION_NAME_PLACEHOLDER)}
        />

        <SettingsDropdownInput
          label={t(I18nKey.SETTINGS$MODEL)}
          name="model"
          value={formData.model || ""}
          onChange={(model) => setFormData((prev) => ({ ...prev, model }))}
          options={MODELS_BY_PROVIDER[config.provider] || []}
        />

        <SettingsInput
          label={t(I18nKey.SETTINGS$API_KEY)}
          name="api_key"
          type="password"
          value={formData.api_key || ""}
          onChange={(e) => {
            setFormData((prev) => ({ ...prev, api_key: e.target.value }));
            setShowTestButton(true);
          }}
          placeholder={t(I18nKey.SETTINGS$API_KEY_UPDATE_PLACEHOLDER)}
          helpText={t(I18nKey.SETTINGS$API_KEY_UPDATE_HELP)}
        />

        <SettingsInput
          label={t(I18nKey.SETTINGS$BASE_URL)}
          name="base_url"
          type="text"
          value={formData.base_url || ""}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, base_url: e.target.value }))
          }
          placeholder={t(I18nKey.SETTINGS$BASE_URL_PLACEHOLDER)}
          optional
        />

        {config.test_status && (
          <div className="mt-4 p-3 rounded-md bg-gray-50 dark:bg-gray-800">
            <p className="text-sm font-medium mb-1">
              {t(I18nKey.SETTINGS$LAST_TEST_STATUS)}: {config.test_status}
            </p>
            {config.test_message && (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {config.test_message}
              </p>
            )}
          </div>
        )}
      </div>
    </BaseModal>
  );
}
