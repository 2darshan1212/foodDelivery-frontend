import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  connected: false,
  socketId: null,
  orderStatusUpdates: []
};

const socketSlice = createSlice({
  name: "socket",
  initialState,
  reducers: {
    setSocketConnected: (state, action) => {
      state.connected = action.payload.connected;
      state.socketId = action.payload.socketId;
    },
    resetSocketState: (state) => {
      state.connected = false;
      state.socketId = null;
      // Keep order status updates in case we reconnect
    },
    addOrderStatusUpdate: (state, action) => {
      state.orderStatusUpdates.push(action.payload);
      // Keep only the latest 10 updates
      if (state.orderStatusUpdates.length > 10) {
        state.orderStatusUpdates.shift();
      }
    },
    clearOrderStatusUpdates: (state) => {
      state.orderStatusUpdates = [];
    }
  },
});

export const { 
  setSocketConnected, 
  resetSocketState, 
  addOrderStatusUpdate, 
  clearOrderStatusUpdates 
} = socketSlice.actions;

export default socketSlice.reducer;
