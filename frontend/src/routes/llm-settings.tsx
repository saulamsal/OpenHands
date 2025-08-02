import React from "react";
import { useTranslation } from "react-i18next";
import { AxiosError } from "axios";
import { Link } from "react-router";
import { ModelSelector } from "#/components/shared/modals/settings/model-selector";
import { organizeModelsAndProviders } from "#/utils/organize-models-and-providers";
import { useAIConfigOptions } from "#/hooks/query/use-ai-config-options";
import { useSettings } from "#/hooks/query/use-settings";
import { hasAdvancedSettingsSet } from "#/utils/has-advanced-settings-set";
import { useSaveSettings } from "#/hooks/mutation/use-save-settings";
import { SettingsSwitch } from "#/components/features/settings/settings-switch";
import { I18nKey } from "#/i18n/declaration";
import { SettingsInput } from "#/components/features/settings/settings-input";
import { HelpLink } from "#/components/features/settings/help-link";
import { BrandButton } from "#/components/features/settings/brand-button";
import { useLLMConfigurationsDropdown } from "#/hooks/query/use-llm-configurations-dropdown";
import { useDeleteLLMConfiguration } from "#/hooks/mutation/use-delete-llm-configuration";
import { AddLLMConfigurationModal } from "#/components/add-llm-configuration-modal";
import { ConfirmationModal } from "#/components/shared/modals/confirmation-modal";
import { LLMConfiguration } from "#/api/llm-configurations";
import { LLMConfigurationSelector } from "#/components/llm-configuration-selector";
import { useSetDefaultLLMConfiguration } from "#/hooks/mutation/use-set-default-llm-configuration";
import {
  displayErrorToast,
  displaySuccessToast,
} from "#/utils/custom-toast-handlers";
import { retrieveAxiosErrorMessage } from "#/utils/retrieve-axios-error-message";
import { SettingsDropdownInput } from "#/components/features/settings/settings-dropdown-input";
import { useConfig } from "#/hooks/query/use-config";
import { isCustomModel } from "#/utils/is-custom-model";
import { LlmSettingsInputsSkeleton } from "#/components/features/settings/llm-settings/llm-settings-inputs-skeleton";
import { KeyStatusIcon } from "#/components/features/settings/key-status-icon";
import { DEFAULT_SETTINGS } from "#/services/settings";
import { getProviderId } from "#/utils/map-provider";
import { DEFAULT_OPENHANDS_MODEL } from "#/utils/verified-models";
import { useTestLlm } from "#/hooks/mutation/use-test-llm";

function LlmSettingsScreen() {
  const { t } = useTranslation();

  const { mutate: saveSettings, isPending } = useSaveSettings();
  const { mutate: testLlm, isPending: isTestingLlm } = useTestLlm();

  const { data: resources } = useAIConfigOptions();
  const { data: settings, isLoading, isFetching } = useSettings();
  const { data: config } = useConfig();

  const [view, setView] = React.useState<"basic" | "advanced">("basic");
  const [securityAnalyzerInputIsVisible, setSecurityAnalyzerInputIsVisible] =
    React.useState(false);

  // LLM Configuration state
  const [selectedConfigId, setSelectedConfigId] = React.useState<string | null>(
    settings?.LLM_CONFIGURATION_ID || null,
  );
  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);
  const [deletingConfig, setDeletingConfig] =
    React.useState<LLMConfiguration | null>(null);
  const [selectedProvider, setSelectedProvider] = React.useState<string | null>(
    null,
  );

  // Fetch configurations
  const { data: configurations } = useLLMConfigurationsDropdown();
  const deleteConfig = useDeleteLLMConfiguration();
  const setDefaultConfig = useSetDefaultLLMConfiguration();

  const [dirtyInputs, setDirtyInputs] = React.useState({
    model: false,
    apiKey: false,
    searchApiKey: false,
    baseUrl: false,
    agent: false,
    confirmationMode: false,
    enableDefaultCondenser: false,
    securityAnalyzer: false,
  });

  // Track the currently selected model to show help text
  const [currentSelectedModel, setCurrentSelectedModel] = React.useState<
    string | null
  >(null);

  // Extract provider from current model and initialize configuration
  React.useEffect(() => {
    if (settings?.LLM_MODEL) {
      const [provider] = settings.LLM_MODEL.split("/");
      setSelectedProvider(provider);
    }
    // Initialize selected configuration ID from settings
    if (settings?.LLM_CONFIGURATION_ID && !selectedConfigId) {
      setSelectedConfigId(settings.LLM_CONFIGURATION_ID);
    }
  }, [settings?.LLM_MODEL, settings?.LLM_CONFIGURATION_ID]);

  // Validate selected configuration ID exists
  React.useEffect(() => {
    if (selectedConfigId && configurations) {
      const configExists = configurations.some(
        (c) => c.id === selectedConfigId,
      );
      if (!configExists) {
        console.warn(
          `Configuration ID ${selectedConfigId} not found, resetting`,
        );
        setSelectedConfigId(null);
      }
    }
  }, [selectedConfigId, configurations]);

  const modelsAndProviders = organizeModelsAndProviders(
    resources?.models || [],
  );

  React.useEffect(() => {
    const determineWhetherToToggleAdvancedSettings = () => {
      if (resources && settings) {
        return (
          isCustomModel(resources.models, settings.LLM_MODEL) ||
          hasAdvancedSettingsSet({
            ...settings,
          })
        );
      }

      return false;
    };

    const userSettingsIsAdvanced = determineWhetherToToggleAdvancedSettings();
    if (settings) setSecurityAnalyzerInputIsVisible(settings.CONFIRMATION_MODE);

    if (userSettingsIsAdvanced) setView("advanced");
    else setView("basic");
  }, [settings, resources]);

  // Initialize currentSelectedModel with the current settings
  React.useEffect(() => {
    if (settings?.LLM_MODEL) {
      setCurrentSelectedModel(settings.LLM_MODEL);
    }
  }, [settings?.LLM_MODEL]);

  const handleSuccessfulMutation = () => {
    displaySuccessToast(t(I18nKey.SETTINGS$SAVED_WARNING));
    setDirtyInputs({
      model: false,
      apiKey: false,
      searchApiKey: false,
      baseUrl: false,
      agent: false,
      confirmationMode: false,
      enableDefaultCondenser: false,
      securityAnalyzer: false,
    });
  };

  const handleErrorMutation = (error: AxiosError) => {
    const errorMessage = retrieveAxiosErrorMessage(error);
    displayErrorToast(errorMessage || t(I18nKey.ERROR$GENERIC));
  };

  const basicFormAction = (formData: FormData) => {
    const providerDisplay = formData.get("llm-provider-input")?.toString();
    const provider = providerDisplay
      ? getProviderId(providerDisplay)
      : undefined;
    const model = formData.get("llm-model-input")?.toString();
    const searchApiKey = formData.get("search-api-key-input")?.toString();

    const fullLlmModel = provider && model && `${provider}/${model}`;

    // Validate configuration ID exists before saving
    const validConfigId =
      selectedConfigId && configurations?.some((c) => c.id === selectedConfigId)
        ? selectedConfigId
        : null;

    saveSettings(
      {
        LLM_MODEL: fullLlmModel,
        // Use the selected configuration ID instead of raw API key
        llm_configuration_id: validConfigId,
        llm_api_key: null, // Don't send API key when using configuration
        SEARCH_API_KEY: searchApiKey || "",

        // reset advanced settings
        LLM_BASE_URL: DEFAULT_SETTINGS.LLM_BASE_URL,
        AGENT: DEFAULT_SETTINGS.AGENT,
        CONFIRMATION_MODE: DEFAULT_SETTINGS.CONFIRMATION_MODE,
        SECURITY_ANALYZER: DEFAULT_SETTINGS.SECURITY_ANALYZER,
        ENABLE_DEFAULT_CONDENSER: DEFAULT_SETTINGS.ENABLE_DEFAULT_CONDENSER,
      },
      {
        onSuccess: handleSuccessfulMutation,
        onError: handleErrorMutation,
      },
    );
  };

  const advancedFormAction = (formData: FormData) => {
    const model = formData.get("llm-custom-model-input")?.toString();
    const baseUrl = formData.get("base-url-input")?.toString();
    const apiKey = formData.get("llm-api-key-input")?.toString();
    const searchApiKey = formData.get("search-api-key-input")?.toString();
    const agent = formData.get("agent-input")?.toString();
    const confirmationMode =
      formData.get("enable-confirmation-mode-switch")?.toString() === "on";
    const enableDefaultCondenser =
      formData.get("enable-memory-condenser-switch")?.toString() === "on";
    const securityAnalyzer = formData
      .get("security-analyzer-input")
      ?.toString();

    saveSettings(
      {
        LLM_MODEL: model,
        LLM_BASE_URL: baseUrl,
        llm_api_key: apiKey || null,
        llm_configuration_id: null, // Clear configuration ID in advanced mode
        SEARCH_API_KEY: searchApiKey || "",
        AGENT: agent,
        CONFIRMATION_MODE: confirmationMode,
        ENABLE_DEFAULT_CONDENSER: enableDefaultCondenser,
        SECURITY_ANALYZER: confirmationMode ? securityAnalyzer : undefined,
      },
      {
        onSuccess: handleSuccessfulMutation,
        onError: handleErrorMutation,
      },
    );
  };

  const formAction = (formData: FormData) => {
    if (view === "basic") basicFormAction(formData);
    else advancedFormAction(formData);
  };

  const handleToggleAdvancedSettings = (isToggled: boolean) => {
    setSecurityAnalyzerInputIsVisible(!!settings?.CONFIRMATION_MODE);
    setView(isToggled ? "advanced" : "basic");
    setDirtyInputs({
      model: false,
      apiKey: false,
      searchApiKey: false,
      baseUrl: false,
      agent: false,
      confirmationMode: false,
      enableDefaultCondenser: false,
      securityAnalyzer: false,
    });
  };

  const handleModelIsDirty = (model: string | null) => {
    // openai providers are special case; see ModelSelector
    // component for details
    const currentModel = settings?.LLM_MODEL || "";
    const modelIsDirty = model !== currentModel.replace("openai/", "");
    setDirtyInputs((prev) => ({
      ...prev,
      model: modelIsDirty,
    }));

    // Track the currently selected model for help text display
    setCurrentSelectedModel(model);

    // Extract provider when model changes
    if (model) {
      const [provider] = model.split("/");
      setSelectedProvider(provider);
    }
  };

  const handleApiKeyIsDirty = (apiKey: string) => {
    const apiKeyIsDirty = apiKey !== "";
    setDirtyInputs((prev) => ({
      ...prev,
      apiKey: apiKeyIsDirty,
    }));
  };

  const handleSearchApiKeyIsDirty = (searchApiKey: string) => {
    const searchApiKeyIsDirty = searchApiKey !== settings?.SEARCH_API_KEY;
    setDirtyInputs((prev) => ({
      ...prev,
      searchApiKey: searchApiKeyIsDirty,
    }));
  };

  const handleCustomModelIsDirty = (model: string) => {
    const modelIsDirty = model !== settings?.LLM_MODEL && model !== "";
    setDirtyInputs((prev) => ({
      ...prev,
      model: modelIsDirty,
    }));

    // Track the currently selected model for help text display
    setCurrentSelectedModel(model);
  };

  const handleBaseUrlIsDirty = (baseUrl: string) => {
    const baseUrlIsDirty = baseUrl !== settings?.LLM_BASE_URL;
    setDirtyInputs((prev) => ({
      ...prev,
      baseUrl: baseUrlIsDirty,
    }));
  };

  const handleAgentIsDirty = (agent: string) => {
    const agentIsDirty = agent !== settings?.AGENT && agent !== "";
    setDirtyInputs((prev) => ({
      ...prev,
      agent: agentIsDirty,
    }));
  };

  const handleConfirmationModeIsDirty = (isToggled: boolean) => {
    setSecurityAnalyzerInputIsVisible(isToggled);
    const confirmationModeIsDirty = isToggled !== settings?.CONFIRMATION_MODE;
    setDirtyInputs((prev) => ({
      ...prev,
      confirmationMode: confirmationModeIsDirty,
    }));
  };

  const handleEnableDefaultCondenserIsDirty = (isToggled: boolean) => {
    const enableDefaultCondenserIsDirty =
      isToggled !== settings?.ENABLE_DEFAULT_CONDENSER;
    setDirtyInputs((prev) => ({
      ...prev,
      enableDefaultCondenser: enableDefaultCondenserIsDirty,
    }));
  };

  const handleSecurityAnalyzerIsDirty = (securityAnalyzer: string) => {
    const securityAnalyzerIsDirty =
      securityAnalyzer !== settings?.SECURITY_ANALYZER;
    setDirtyInputs((prev) => ({
      ...prev,
      securityAnalyzer: securityAnalyzerIsDirty,
    }));
  };

  const formIsDirty = Object.values(dirtyInputs).some((isDirty) => isDirty);

  const handleTestLlm = () => {
    console.log("=== TEST LLM CLICKED ===");
    console.log("View:", view);
    console.log("Selected Config ID:", selectedConfigId);

    // Get current form values
    const model =
      view === "basic"
        ? currentSelectedModel || settings?.LLM_MODEL || DEFAULT_OPENHANDS_MODEL
        : currentSelectedModel ||
          settings?.LLM_MODEL ||
          DEFAULT_OPENHANDS_MODEL;

    // Get API key from form input if available
    const apiKeyInput = document.querySelector(
      'input[name="llm-api-key-input"]',
    ) as HTMLInputElement;
    // Only send API key if user has typed something new, otherwise let backend use saved key
    const apiKey =
      apiKeyInput?.value && apiKeyInput.value.length > 0
        ? apiKeyInput.value
        : null;

    // Get base URL from form input if in advanced mode
    const baseUrlInput = document.querySelector(
      'input[name="base-url-input"]',
    ) as HTMLInputElement;
    const baseUrl =
      view === "advanced"
        ? baseUrlInput?.value || settings?.LLM_BASE_URL
        : DEFAULT_SETTINGS.LLM_BASE_URL;

    // Prepare test settings with correct field names
    const testSettings: any = {
      llm_model: model,
      llm_base_url: baseUrl,
    };

    // If in basic mode and using configuration, send configuration ID
    if (view === "basic" && selectedConfigId) {
      // Validate the configuration exists before sending
      const configExists = configurations?.some(
        (c) => c.id === selectedConfigId,
      );
      if (configExists) {
        testSettings.llm_configuration_id = selectedConfigId;
        console.log("Sending configuration ID:", selectedConfigId);
        // Don't send API key when using configuration
      } else {
        displayErrorToast("Please select a valid API key configuration");
        return;
      }
    } else if (apiKey) {
      // Only include API key if user entered a new one in advanced mode
      testSettings.llm_api_key = apiKey;
      console.log("Sending API key (advanced mode)");
    } else if (view === "basic" && !selectedConfigId) {
      displayErrorToast("Please select an API key configuration");
      return;
    }

    console.log("Test settings being sent:", testSettings);

    testLlm(testSettings, {
      onSuccess: (data) => {
        displaySuccessToast(
          data.message || t(I18nKey.SETTINGS$LLM_TEST_SUCCESS),
        );
      },
      onError: (error) => {
        const errorMessage =
          error.response?.data?.message || t(I18nKey.ERROR$GENERIC);
        displayErrorToast(errorMessage);
      },
    });
  };

  if (!settings || isLoading) return <LlmSettingsInputsSkeleton />;

  return (
    <div data-testid="llm-settings-screen" className="h-full">
      <form
        action={formAction}
        className="flex flex-col h-full justify-between"
      >
        <div className="p-9 flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <SettingsSwitch
              testId="advanced-settings-switch"
              defaultIsToggled={view === "advanced"}
              onToggle={handleToggleAdvancedSettings}
              isToggled={view === "advanced"}
            >
              {t(I18nKey.SETTINGS$ADVANCED)}
            </SettingsSwitch>

            <div className="flex items-center gap-2">
              <Link to="/settings/llm/configurations">
                <BrandButton
                  testId="manage-configurations-button"
                  type="button"
                  variant="secondary"
                  size="small"
                >
                  {t(I18nKey.SETTINGS$MANAGE_CONFIGURATIONS)}
                </BrandButton>
              </Link>

              <BrandButton
                testId="test-llm-button"
                type="button"
                variant="secondary"
                size="small"
                onClick={handleTestLlm}
                isDisabled={isTestingLlm}
              >
                {isTestingLlm ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin">⚡</span>
                    {t(I18nKey.SETTINGS$TESTING)}
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    ⚡ {t(I18nKey.SETTINGS$TEST_LLM)}
                  </span>
                )}
              </BrandButton>
            </div>
          </div>

          {view === "basic" && (
            <div
              data-testid="llm-settings-form-basic"
              className="flex flex-col gap-6"
            >
              {!isLoading && !isFetching && (
                <>
                  <ModelSelector
                    models={modelsAndProviders}
                    currentModel={
                      currentSelectedModel ||
                      settings.LLM_MODEL ||
                      DEFAULT_OPENHANDS_MODEL
                    }
                    onChange={handleModelIsDirty}
                  />
                  {(settings.LLM_MODEL?.startsWith("openhands/") ||
                    currentSelectedModel?.startsWith("openhands/")) && (
                    <HelpLink
                      testId="openhands-api-key-help"
                      text={t(I18nKey.SETTINGS$OPENHANDS_API_KEY_HELP_TEXT)}
                      linkText={t(I18nKey.SETTINGS$NAV_API_KEYS)}
                      href="https://app.all-hands.dev/settings/api-keys"
                      suffix={t(I18nKey.SETTINGS$OPENHANDS_API_KEY_HELP_SUFFIX)}
                    />
                  )}
                </>
              )}

              {/* LLM Configuration Selector */}
              <LLMConfigurationSelector
                configurations={configurations || []}
                selectedConfigId={selectedConfigId}
                onConfigSelect={(configId, config) => {
                  setSelectedConfigId(configId);
                  if (config) {
                    // Update the form to reflect the selected configuration
                    handleApiKeyIsDirty("configured");
                    // Update the selected model to match the configuration
                    const fullModel = `${config.provider}/${config.model}`;
                    setCurrentSelectedModel(fullModel);
                    handleModelIsDirty(fullModel);
                    // Update the provider
                    setSelectedProvider(config.provider);
                  }
                }}
                onAddNew={() => setIsAddModalOpen(true)}
                onDelete={(config) => setDeletingConfig(config)}
                onSetDefault={async (config) => {
                  try {
                    await setDefaultConfig.mutateAsync(config.id);
                    displaySuccessToast(t(I18nKey.SETTINGS$SAVED));
                  } catch (error) {
                    displayErrorToast(t(I18nKey.ERROR$GENERIC));
                  }
                }}
                provider={selectedProvider}
                model={currentSelectedModel}
              />

              <HelpLink
                testId="llm-api-key-help-anchor"
                text={t(I18nKey.SETTINGS$DONT_KNOW_API_KEY)}
                linkText={t(I18nKey.SETTINGS$CLICK_FOR_INSTRUCTIONS)}
                href="https://docs.all-hands.dev/usage/local-setup#getting-an-api-key"
              />

              <SettingsInput
                testId="search-api-key-input"
                name="search-api-key-input"
                label={t(I18nKey.SETTINGS$SEARCH_API_KEY)}
                type="password"
                className="w-full max-w-[680px]"
                defaultValue={settings.SEARCH_API_KEY || ""}
                onChange={handleSearchApiKeyIsDirty}
                placeholder={t(I18nKey.API$TAVILY_KEY_EXAMPLE)}
                startContent={
                  settings.SEARCH_API_KEY_SET && (
                    <KeyStatusIcon isSet={settings.SEARCH_API_KEY_SET} />
                  )
                }
              />

              <HelpLink
                testId="search-api-key-help-anchor"
                text={t(I18nKey.SETTINGS$SEARCH_API_KEY_OPTIONAL)}
                linkText={t(I18nKey.SETTINGS$SEARCH_API_KEY_INSTRUCTIONS)}
                href="https://tavily.com/"
              />
            </div>
          )}

          {view === "advanced" && (
            <div
              data-testid="llm-settings-form-advanced"
              className="flex flex-col gap-6"
            >
              <SettingsInput
                testId="llm-custom-model-input"
                name="llm-custom-model-input"
                label={t(I18nKey.SETTINGS$CUSTOM_MODEL)}
                defaultValue={settings.LLM_MODEL || DEFAULT_OPENHANDS_MODEL}
                placeholder={DEFAULT_OPENHANDS_MODEL}
                type="text"
                className="w-full max-w-[680px]"
                onChange={handleCustomModelIsDirty}
              />
              {(settings.LLM_MODEL?.startsWith("openhands/") ||
                currentSelectedModel?.startsWith("openhands/")) && (
                <HelpLink
                  testId="openhands-api-key-help-2"
                  text={t(I18nKey.SETTINGS$OPENHANDS_API_KEY_HELP_TEXT)}
                  linkText={t(I18nKey.SETTINGS$NAV_API_KEYS)}
                  href="https://app.all-hands.dev/settings/api-keys"
                  suffix={t(I18nKey.SETTINGS$OPENHANDS_API_KEY_HELP_SUFFIX)}
                />
              )}

              <SettingsInput
                testId="base-url-input"
                name="base-url-input"
                label={t(I18nKey.SETTINGS$BASE_URL)}
                defaultValue={settings.LLM_BASE_URL}
                placeholder="https://api.openai.com"
                type="text"
                className="w-full max-w-[680px]"
                onChange={handleBaseUrlIsDirty}
              />

              <SettingsInput
                testId="llm-api-key-input"
                name="llm-api-key-input"
                label={t(I18nKey.SETTINGS_FORM$API_KEY)}
                type="password"
                className="w-full max-w-[680px]"
                placeholder={settings.LLM_API_KEY_SET ? "<hidden>" : ""}
                onChange={handleApiKeyIsDirty}
                startContent={
                  settings.LLM_API_KEY_SET && (
                    <KeyStatusIcon isSet={settings.LLM_API_KEY_SET} />
                  )
                }
              />
              <HelpLink
                testId="llm-api-key-help-anchor-advanced"
                text={t(I18nKey.SETTINGS$DONT_KNOW_API_KEY)}
                linkText={t(I18nKey.SETTINGS$CLICK_FOR_INSTRUCTIONS)}
                href="https://docs.all-hands.dev/usage/local-setup#getting-an-api-key"
              />

              <SettingsInput
                testId="search-api-key-input"
                name="search-api-key-input"
                label={t(I18nKey.SETTINGS$SEARCH_API_KEY)}
                type="password"
                className="w-full max-w-[680px]"
                defaultValue={settings.SEARCH_API_KEY || ""}
                onChange={handleSearchApiKeyIsDirty}
                placeholder={t(I18nKey.API$TVLY_KEY_EXAMPLE)}
                startContent={
                  settings.SEARCH_API_KEY_SET && (
                    <KeyStatusIcon isSet={settings.SEARCH_API_KEY_SET} />
                  )
                }
              />

              <HelpLink
                testId="search-api-key-help-anchor"
                text={t(I18nKey.SETTINGS$SEARCH_API_KEY_OPTIONAL)}
                linkText={t(I18nKey.SETTINGS$SEARCH_API_KEY_INSTRUCTIONS)}
                href="https://tavily.com/"
              />

              <SettingsDropdownInput
                testId="agent-input"
                name="agent-input"
                label={t(I18nKey.SETTINGS$AGENT)}
                items={
                  resources?.agents.map((agent) => ({
                    key: agent,
                    label: agent,
                  })) || []
                }
                defaultSelectedKey={settings.AGENT}
                isClearable={false}
                onInputChange={handleAgentIsDirty}
                wrapperClassName="w-full max-w-[680px]"
              />

              <SettingsDropdownInput
                testId="runtime-settings-input"
                name="runtime-settings-input"
                label={
                  <>
                    {t(I18nKey.SETTINGS$RUNTIME_SETTINGS)}
                    <a href="mailto:contact@all-hands.dev">
                      {t(I18nKey.SETTINGS$GET_IN_TOUCH)}
                    </a>
                  </>
                }
                items={[]}
                isDisabled
                wrapperClassName="w-full max-w-[680px]"
              />

              <SettingsSwitch
                testId="enable-memory-condenser-switch"
                name="enable-memory-condenser-switch"
                defaultIsToggled={settings.ENABLE_DEFAULT_CONDENSER}
                onToggle={handleEnableDefaultCondenserIsDirty}
              >
                {t(I18nKey.SETTINGS$ENABLE_MEMORY_CONDENSATION)}
              </SettingsSwitch>

              <SettingsSwitch
                testId="enable-confirmation-mode-switch"
                name="enable-confirmation-mode-switch"
                onToggle={handleConfirmationModeIsDirty}
                defaultIsToggled={settings.CONFIRMATION_MODE}
                isBeta
              >
                {t(I18nKey.SETTINGS$CONFIRMATION_MODE)}
              </SettingsSwitch>

              {securityAnalyzerInputIsVisible && (
                <SettingsDropdownInput
                  testId="security-analyzer-input"
                  name="security-analyzer-input"
                  label={t(I18nKey.SETTINGS$SECURITY_ANALYZER)}
                  items={
                    resources?.securityAnalyzers.map((analyzer) => ({
                      key: analyzer,
                      label: analyzer,
                    })) || []
                  }
                  placeholder={t(
                    I18nKey.SETTINGS$SECURITY_ANALYZER_PLACEHOLDER,
                  )}
                  defaultSelectedKey={settings.SECURITY_ANALYZER}
                  isClearable
                  showOptionalTag
                  onInputChange={handleSecurityAnalyzerIsDirty}
                  wrapperClassName="w-full max-w-[680px]"
                />
              )}
            </div>
          )}
        </div>

        <div className="flex gap-6 p-6 justify-end border-t border-t-tertiary">
          <BrandButton
            testId="submit-button"
            type="submit"
            variant="primary"
            isDisabled={!formIsDirty || isPending}
          >
            {!isPending && t("SETTINGS$SAVE_CHANGES")}
            {isPending && t("SETTINGS$SAVING")}
          </BrandButton>
        </div>
      </form>

      {/* Add Configuration Modal */}
      <AddLLMConfigurationModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />

      {/* Delete Confirmation Modal */}
      {deletingConfig && (
        <ConfirmationModal
          text={t(I18nKey.SETTINGS$DELETE_API_KEY_CONFIRMATION)}
          onConfirm={async () => {
            try {
              await deleteConfig.mutateAsync(deletingConfig.id);
              displaySuccessToast(t(I18nKey.SETTINGS$API_KEY_DELETED));
              if (selectedConfigId === deletingConfig.id) {
                setSelectedConfigId(null);
              }
            } catch (error) {
              displayErrorToast(t(I18nKey.ERROR$GENERIC));
            } finally {
              setDeletingConfig(null);
            }
          }}
          onCancel={() => setDeletingConfig(null)}
        />
      )}
    </div>
  );
}

export default LlmSettingsScreen;
