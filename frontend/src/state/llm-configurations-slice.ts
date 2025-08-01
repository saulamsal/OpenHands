import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { LLMConfiguration } from "#/api/llm-configurations";

interface LLMConfigurationsState {
  configurations: LLMConfiguration[];
  activeConfigurationId: string | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: LLMConfigurationsState = {
  configurations: [],
  activeConfigurationId: null,
  isLoading: false,
  error: null,
};

export const llmConfigurationsSlice = createSlice({
  name: "llmConfigurations",
  initialState,
  reducers: {
    setConfigurations: (state, action: PayloadAction<LLMConfiguration[]>) => {
      state.configurations = action.payload;
      // Set active configuration to the default one
      const defaultConfig = action.payload.find((config) => config.is_default);
      if (defaultConfig) {
        state.activeConfigurationId = defaultConfig.id;
      }
    },
    setActiveConfiguration: (state, action: PayloadAction<string>) => {
      state.activeConfigurationId = action.payload;
    },
    addConfiguration: (state, action: PayloadAction<LLMConfiguration>) => {
      state.configurations.push(action.payload);
      if (action.payload.is_default) {
        // Unset other defaults
        state.configurations.forEach((config) => {
          if (config.id !== action.payload.id) {
            config.is_default = false;
          }
        });
        state.activeConfigurationId = action.payload.id;
      }
    },
    updateConfiguration: (state, action: PayloadAction<LLMConfiguration>) => {
      const index = state.configurations.findIndex(
        (config) => config.id === action.payload.id,
      );
      if (index !== -1) {
        state.configurations[index] = action.payload;
        if (action.payload.is_default) {
          // Unset other defaults
          state.configurations.forEach((config, i) => {
            if (i !== index) {
              config.is_default = false;
            }
          });
          state.activeConfigurationId = action.payload.id;
        }
      }
    },
    removeConfiguration: (state, action: PayloadAction<string>) => {
      state.configurations = state.configurations.filter(
        (config) => config.id !== action.payload,
      );
      if (state.activeConfigurationId === action.payload) {
        // Find new default
        const newDefault = state.configurations.find(
          (config) => config.is_default,
        );
        state.activeConfigurationId = newDefault?.id || null;
      }
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
});

export const {
  setConfigurations,
  setActiveConfiguration,
  addConfiguration,
  updateConfiguration,
  removeConfiguration,
  setLoading,
  setError,
} = llmConfigurationsSlice.actions;

export default llmConfigurationsSlice.reducer;
