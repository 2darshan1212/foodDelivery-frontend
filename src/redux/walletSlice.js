// redux/walletSlice.js
import { createSlice } from "@reduxjs/toolkit";

const walletSlice = createSlice({
  name: "wallet",
  initialState: {
    connected: false,
    publicKey: null,
    adapter: null,
    balance: null,
    paymentStatus: 'idle', // idle, pending, success, error
    paymentError: null,
    paymentTxId: null
  },
  reducers: {
    connectWallet: (state, action) => {
      state.connected = true;
      state.publicKey = action.payload.publicKey;
      state.adapter = action.payload.adapter;
    },
    disconnectWallet: (state) => {
      state.connected = false;
      state.publicKey = null;
      state.adapter = null;
      state.balance = null;
      state.paymentStatus = 'idle';
      state.paymentError = null;
      state.paymentTxId = null;
    },
    updateBalance: (state, action) => {
      state.balance = action.payload;
    },
    setPaymentPending: (state) => {
      state.paymentStatus = 'pending';
      state.paymentError = null;
      state.paymentTxId = null;
    },
    setPaymentSuccess: (state, action) => {
      state.paymentStatus = 'success';
      state.paymentTxId = action.payload;
    },
    setPaymentError: (state, action) => {
      state.paymentStatus = 'error';
      state.paymentError = action.payload;
    },
    resetPaymentStatus: (state) => {
      state.paymentStatus = 'idle';
      state.paymentError = null;
      state.paymentTxId = null;
    }
  },
});

export const {
  connectWallet,
  disconnectWallet,
  updateBalance,
  setPaymentPending,
  setPaymentSuccess,
  setPaymentError,
  resetPaymentStatus
} = walletSlice.actions;

export default walletSlice.reducer;
