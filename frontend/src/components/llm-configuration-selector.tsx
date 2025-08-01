import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Trash2, Check } from "lucide-react";
import { SettingsDropdownInput } from "#/components/features/settings/settings-dropdown-input";
import { BrandButton } from "#/components/features/settings/brand-button";
import { I18nKey } from "#/i18n/declaration";
import { LLMConfiguration } from "#/api/llm-configurations";
import { KeyStatusIcon } from "#/components/features/settings/key-status-icon";

interface LLMConfigurationSelectorProps {
  configurations: LLMConfiguration[];
  selectedConfigId: string | null;
  onConfigSelect: (configId: string | null, config?: LLMConfiguration) => void;
  onAddNew: () => void;
  onDelete: (config: LLMConfiguration) => void;
  onSetDefault: (config: LLMConfiguration) => void;
  provider?: string;
  model?: string;
  className?: string;
}

export function LLMConfigurationSelector({
  configurations,
  selectedConfigId,
  onConfigSelect,
  onAddNew,
  onDelete,
  onSetDefault,
  provider,
  model,
  className = "",
}: LLMConfigurationSelectorProps) {
  const { t } = useTranslation();

  // Show all configurations, not filtered by provider
  // This allows users to switch between different providers easily
  const filteredConfigs = configurations;

  // Auto-select default configuration on initial load
  useEffect(() => {
    // Only auto-select if no configuration is currently selected
    if (!selectedConfigId && configurations.length > 0) {
      const defaultConfig = configurations.find((c) => c.is_default);
      if (defaultConfig) {
        onConfigSelect(defaultConfig.id, defaultConfig);
      } else if (configurations.length === 1) {
        // Auto-select if only one config exists
        onConfigSelect(configurations[0].id, configurations[0]);
      }
    }
  }, [configurations, selectedConfigId, onConfigSelect]);

  const selectedConfig = configurations.find((c) => c.id === selectedConfigId);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Configuration Dropdown */}
      <SettingsDropdownInput
        testId="llm-configuration-select"
        name="llm-configuration-select"
        label={t(I18nKey.SETTINGS$API_KEY)}
        items={[
          ...filteredConfigs.map((config) => ({
            key: config.id,
            label: (
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{config.name}</span>
                  <span className="text-xs text-muted-foreground">
                    ({config.provider})
                  </span>
                  {config.is_default && (
                    <span className="ml-1 text-xs text-green-600">
                      • Default
                    </span>
                  )}
                </div>
                {config.test_status === "success" && (
                  <Check className="w-4 h-4 text-green-500" />
                )}
              </div>
            ),
          })),
          {
            key: "new",
            label: (
              <div className="flex items-center gap-2 text-primary">
                <Plus className="w-4 h-4" />
                <span>Add New API Key</span>
              </div>
            ),
          },
        ]}
        selectedKey={selectedConfigId || ""}
        onSelectionChange={(key) => {
          if (key === "new") {
            onAddNew();
          } else {
            const config = configurations.find((c) => c.id === key);
            onConfigSelect(key as string, config);
          }
        }}
        placeholder={
          filteredConfigs.length === 0
            ? "No API keys configured - Add one"
            : "Select an API key configuration"
        }
        wrapperClassName="w-full max-w-[680px]"
        startContent={selectedConfig && <KeyStatusIcon isSet />}
      />

      {/* Selected Configuration Details */}
      {selectedConfig && (
        <div className="bg-secondary/20 rounded-lg p-4 space-y-3 max-w-[680px]">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">
                  {selectedConfig.name}
                </span>
                {selectedConfig.is_default && (
                  <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded">
                    Default
                  </span>
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                Provider: {selectedConfig.provider} • Model:{" "}
                {selectedConfig.model}
              </div>
              <div className="text-xs text-muted-foreground">
                API Key: {selectedConfig.api_key_masked}
              </div>
              {selectedConfig.test_status && (
                <div className="text-xs text-muted-foreground">
                  Test Status: {selectedConfig.test_status}
                  {selectedConfig.test_message &&
                    ` - ${selectedConfig.test_message}`}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {!selectedConfig.is_default && (
                <BrandButton
                  size="small"
                  variant="secondary"
                  onClick={() => onSetDefault(selectedConfig)}
                >
                  Set as Default
                </BrandButton>
              )}
              <button
                type="button"
                onClick={() => onDelete(selectedConfig)}
                className="p-2 text-red-500 hover:text-red-600 hover:bg-red-50 rounded"
                title="Delete configuration"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* No Configuration Message */}
      {filteredConfigs.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 max-w-[680px]">
          <p className="text-sm text-yellow-800">
            No API keys configured. Click "Add New API Key" to get started.
          </p>
        </div>
      )}
    </div>
  );
}
