import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { BaseModal } from "#/components/shared/modals/base-modal/base-modal";
import { SettingsInput } from "#/components/features/settings/settings-input";
import { SettingsDropdownInput } from "#/components/features/settings/settings-dropdown-input";
import {
  displayErrorToast,
  displaySuccessToast,
} from "#/utils/custom-toast-handlers";
import { I18nKey } from "#/i18n/declaration";
import { useCreateLLMConfiguration } from "#/hooks/mutation/use-create-llm-configuration";
import { LLMConfigurationCreate } from "#/api/llm-configurations";
import { useAIConfigOptions } from "#/hooks/query/use-ai-config-options";
import { organizeModelsAndProviders } from "#/utils/organize-models-and-providers";
import { mapProvider } from "#/utils/map-provider";

interface AddLLMConfigurationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddLLMConfigurationModal({
  isOpen,
  onClose,
}: AddLLMConfigurationModalProps) {
  const { t } = useTranslation();
  const createConfig = useCreateLLMConfiguration();
  const { data: resources } = useAIConfigOptions();

  const [formData, setFormData] = useState<LLMConfigurationCreate>({
    name: "", // Will be auto-generated
    provider: "",
    model: "", // Will use first model from provider
    api_key: "",
    base_url: "",
    is_default: false,
  });

  // Get all unique providers from available models
  const modelsAndProviders = organizeModelsAndProviders(
    resources?.models || [],
  );
  const providers = Object.keys(modelsAndProviders).map((provider) => ({
    key: provider,
    label: mapProvider(provider),
  }));

  const handleProviderChange = (key: React.Key | null) => {
    const provider = key as string;
    if (provider) {
      // Get the first model for this provider to store with the config
      const firstModel = modelsAndProviders[provider]?.models[0] || "";
      setFormData((prev) => ({
        ...prev,
        provider,
        model: firstModel,
      }));
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      provider: "",
      model: "",
      api_key: "",
      base_url: "",
      is_default: false,
    });
  };

  const handleSubmit = async () => {
    if (!formData.api_key.trim()) {
      displayErrorToast(t(I18nKey.ERROR$REQUIRED_FIELD));
      return;
    }

    if (!formData.provider) {
      displayErrorToast(t(I18nKey.ERROR$REQUIRED_FIELD));
      return;
    }

    // Auto-generate name based on provider
    const autoName = mapProvider(formData.provider);

    // Create configuration
    try {
      await createConfig.mutateAsync({
        ...formData,
        name: autoName,
      });
      displaySuccessToast(t(I18nKey.SETTINGS$LLM_CONFIGURATION_CREATED));
      onClose();
      resetForm();
    } catch (error) {
      displayErrorToast(t(I18nKey.ERROR$GENERIC));
    }
  };

  const handleCancel = () => {
    resetForm();
    onClose();
  };

  const isSubmitting = createConfig.isPending;

  const actions = [
    {
      action: handleCancel,
      label: t(I18nKey.BUTTON$CANCEL),
      className: "bg-secondary",
    },
    {
      action: handleSubmit,
      label: t(I18nKey.BUTTON$SAVE),
      isDisabled: isSubmitting || !formData.api_key.trim(),
      className: "bg-primary text-white",
    },
  ];

  return (
    <BaseModal
      isOpen={isOpen}
      onOpenChange={onClose}
      title={t(I18nKey.SETTINGS$ADD_API_KEY)}
      actions={actions}
    >
      <div className="space-y-4">
        <SettingsDropdownInput
          testId="provider-dropdown"
          label={t(I18nKey.SETTINGS$PROVIDER)}
          name="provider"
          selectedKey={formData.provider}
          onSelectionChange={handleProviderChange}
          items={providers}
          placeholder={t(I18nKey.SETTINGS$SELECT_PROVIDER)}
        />

        <SettingsInput
          label={t(I18nKey.SETTINGS$API_KEY)}
          name="api_key"
          type="password"
          value={formData.api_key}
          onChange={(value) =>
            setFormData((prev) => ({ ...prev, api_key: value }))
          }
          placeholder={t(I18nKey.SETTINGS$API_KEY_PLACEHOLDER)}
          required
        />
      </div>
    </BaseModal>
  );
}
