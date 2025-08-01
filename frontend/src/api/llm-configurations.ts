import { openHands } from "./open-hands-axios";
import { OpenHandsAxiosResponse } from "./open-hands.types";

export interface LLMConfiguration {
  id: string;
  name: string;
  provider: string;
  model: string;
  base_url?: string;
  is_default: boolean;
  is_active: boolean;
  test_status?: string;
  test_message?: string;
  last_used_at?: string;
  created_at: string;
  updated_at: string;
  api_key_masked: string;
}

export interface LLMConfigurationCreate {
  name: string;
  provider: string;
  model: string;
  api_key: string;
  base_url?: string;
  is_default?: boolean;
}

export interface LLMConfigurationUpdate {
  name?: string;
  model?: string;
  api_key?: string;
  base_url?: string;
}

export interface LLMConfigurationTest {
  provider: string;
  model: string;
  api_key: string;
  base_url?: string;
}

export interface LLMConfigurationTestResult {
  success: boolean;
  message: string;
  latency?: number;
}

export const llmConfigurationsAPI = {
  async list(includeInactive = false): Promise<LLMConfiguration[]> {
    const response = await openHands.get<
      OpenHandsAxiosResponse<LLMConfiguration[]>
    >("/api/llm-configurations", {
      params: { include_inactive: includeInactive },
    });
    return response.data;
  },

  async get(id: string): Promise<LLMConfiguration> {
    const response = await openHands.get<
      OpenHandsAxiosResponse<LLMConfiguration>
    >(`/api/llm-configurations/${id}`);
    return response.data;
  },

  async create(data: LLMConfigurationCreate): Promise<LLMConfiguration> {
    const response = await openHands.post<
      OpenHandsAxiosResponse<LLMConfiguration>
    >("/api/llm-configurations", data);
    return response.data;
  },

  async update(
    id: string,
    data: LLMConfigurationUpdate,
  ): Promise<LLMConfiguration> {
    const response = await openHands.put<
      OpenHandsAxiosResponse<LLMConfiguration>
    >(`/api/llm-configurations/${id}`, data);
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await openHands.delete(`/api/llm-configurations/${id}`);
  },

  async setDefault(id: string): Promise<{ message: string }> {
    const response = await openHands.put<
      OpenHandsAxiosResponse<{ message: string }>
    >(`/api/llm-configurations/${id}/set-default`);
    return response.data;
  },

  async test(data: LLMConfigurationTest): Promise<LLMConfigurationTestResult> {
    const response = await openHands.post<
      OpenHandsAxiosResponse<LLMConfigurationTestResult>
    >("/api/llm-configurations/test", data);
    return response.data;
  },
};
