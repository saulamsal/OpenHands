import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface QueuedMessage {
  id: string;
  content: string;
  imageUrls: string[];
  fileUrls: string[];
  timestamp: string;
}

interface MessageQueueState {
  queue: QueuedMessage[];
}

const initialState: MessageQueueState = {
  queue: [],
};

export const messageQueueSlice = createSlice({
  name: "messageQueue",
  initialState,
  reducers: {
    addToQueue: (state, action: PayloadAction<QueuedMessage>) => {
      state.queue.push(action.payload);
    },
    removeFromQueue: (state, action: PayloadAction<string>) => {
      state.queue = state.queue.filter((msg) => msg.id !== action.payload);
    },
    clearQueue: (state) => {
      state.queue = [];
    },
  },
});

export const { addToQueue, removeFromQueue, clearQueue } =
  messageQueueSlice.actions;

export default messageQueueSlice.reducer;
