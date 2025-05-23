import { createSlice } from "@reduxjs/toolkit";

const chatSlice = createSlice({
  name: "chat",
  initialState: {
    onlineUsers: [],
    messages: [],
    unreadCounts: {},  // { userId: count }
  },
  reducers: {
    setOnlineUsers: (state, action) => {
      state.onlineUsers = action.payload;
    },
    setMessages: (state, action) => {
      // If the payload is a function, call it with the current messages
      if (typeof action.payload === 'function') {
        state.messages = action.payload(state.messages);
      } else {
        state.messages = action.payload;
      }
    },
    addMessage: (state, action) => {
      state.messages.push(action.payload);
    },
    updateMessageReadStatus: (state, action) => {
      const { senderId } = action.payload;
      state.messages = state.messages.map(msg => 
        msg.senderId === senderId ? { ...msg, isRead: true } : msg
      );
    },
    incrementUnreadCount: (state, action) => {
      const { senderId } = action.payload;
      if (!state.unreadCounts) {
        state.unreadCounts = {};
      }
      state.unreadCounts[senderId] = (state.unreadCounts[senderId] || 0) + 1;
    },
    clearUnreadCount: (state, action) => {
      const { senderId } = action.payload;
      if (!state.unreadCounts) {
        state.unreadCounts = {};
      }
      state.unreadCounts[senderId] = 0;
    }
  },
});

export default chatSlice.reducer;
export const { 
  setOnlineUsers, 
  setMessages, 
  addMessage,
  updateMessageReadStatus, 
  incrementUnreadCount,
  clearUnreadCount
} = chatSlice.actions;
