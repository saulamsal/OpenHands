import { createSlice } from "@reduxjs/toolkit";
import { AgentState } from "#/types/agent-state";
import { RuntimeStatus } from "#/types/runtime-status";

export const agentSlice = createSlice({
  name: "agent",
  initialState: {
    curAgentState: AgentState.LOADING,
    runtimeStatus: null as RuntimeStatus | null,
  },
  reducers: {
    setCurrentAgentState: (state, action) => {
      state.curAgentState = action.payload;
    },
    setRuntimeStatus: (state, action) => {
      state.runtimeStatus = action.payload;
    },
  },
});

export const { setCurrentAgentState, setRuntimeStatus } = agentSlice.actions;

export default agentSlice.reducer;
