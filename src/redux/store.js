import { combineReducers, configureStore } from "@reduxjs/toolkit";
import authSlice from "./authSlice";
import {
  persistReducer,
  persistStore,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from "redux-persist";
import storage from "redux-persist/lib/storage";
import postSlice from "./postSlice";
import categorySlice from "./categorySlice";
import userSlice from './userSlice';
import cartSlice from './cartSlice';
import socketSlice from './socketSlice';
import chatSlice from './chatSlice';
import rtnSlice from "./rtnSlice"
import adminSlice from "./adminSlice";
import deliverySlice from "./deliverySlice";
import walletSlice from './walletSlice';
import confirmedOrdersSlice from './confirmedOrdersSlice';
import { createLogger } from 'redux-logger';

// Create logger instance
const logger = createLogger({
  collapsed: true, // Collapse console groups by default
  diff: true,      // Show diff between states
  predicate: () => process.env.NODE_ENV === 'development', // Only log in development
});

// Main persist config
const persistConfig = {
  key: "root",
  storage,
  version: 1,
  blacklist: ['socket', 'cart', 'delivery', 'confirmedOrders'], // Don't persist socket, cart, delivery, or confirmedOrders in root
};

// Separate config for cart slice
const cartPersistConfig = {
  key: 'cart',
  storage,
  blacklist: ['orderStatus', 'orderError'], // Don't persist these transient states
};

// Config for chat slice
const chatPersistConfig = {
  key: 'chat',
  storage,
};

// Config for delivery slice
const deliveryPersistConfig = {
  key: 'delivery',
  storage,
  blacklist: ['isActionPending', 'actionError', 'isLocationUpdating', 'isNearbyOrdersLoading'], // Don't persist these transient states
};

// Config for wallet slice
const walletPersistConfig = {
  key: 'wallet',
  storage,
  blacklist: ['paymentStatus', 'paymentError'], // Don't persist these transient states
};

// Config for confirmed orders slice
const confirmedOrdersPersistConfig = {
  key: 'confirmedOrders',
  storage,
  blacklist: ['isLoading', 'error', 'acceptingOrderId'], // Don't persist these transient states
};

const rootReducer = combineReducers({
  auth: authSlice,
  post: postSlice,
  category: categorySlice,
  user: userSlice,
  cart: persistReducer(cartPersistConfig, cartSlice),
  socket: socketSlice,
  chat: persistReducer(chatPersistConfig, chatSlice),
  realTimeNotification: rtnSlice,
  admin: adminSlice,
  delivery: persistReducer(deliveryPersistConfig, deliverySlice),
  wallet: persistReducer(walletPersistConfig, walletSlice),
  confirmedOrders: persistReducer(confirmedOrdersPersistConfig, confirmedOrdersSlice),
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

// Create store with middleware
const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [
          FLUSH, 
          REHYDRATE, 
          PAUSE, 
          PERSIST, 
          PURGE, 
          REGISTER,
        ],
      },
    }).concat(logger),
  devTools: process.env.NODE_ENV !== 'production',
});

// Create persistor
export const persistor = persistStore(store);

export default store;
