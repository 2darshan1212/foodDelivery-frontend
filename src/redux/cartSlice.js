// redux/cartSlice.js

import { createSlice, createAsyncThunk, createAction } from "@reduxjs/toolkit";
import axios from "axios";
import { createNewOrder, getUserOrders } from "../services/orderService";

// API base URL from environment or default to localhost
const API_BASE_URL = "http://localhost:8000";

// Custom action to reset order status
const resetOrderStatusAction = createAction('cart/resetOrderStatus');

// Async thunk for placing an order
export const placeOrder = createAsyncThunk(
  "cart/placeOrder",
  async (orderData, { rejectWithValue, dispatch }) => {
    try {
      console.log("PlaceOrder thunk received data:", orderData);
      const response = await createNewOrder(orderData);
      console.log("PlaceOrder thunk received response:", response);
      return response;
    } catch (error) {
      console.error("PlaceOrder thunk error:", error);
      // Ensure we reset the loading state after a slight delay
      setTimeout(() => {
        dispatch(resetOrderStatusAction());
      }, 500);
      return rejectWithValue(error.message ? error : { message: "Failed to place order" });
    }
  }
);

// Async thunk for fetching user orders
export const fetchOrders = createAsyncThunk(
  "cart/fetchOrders",
  async (_, { rejectWithValue, getState }) => {
    try {
      // Get current user info for logging
      const state = getState();
      const currentUser = state.auth?.user;
      const userId = currentUser?._id;
      
      if (!currentUser || !userId) {
        console.error("Cannot fetch orders: No authenticated user found");
        return rejectWithValue({ message: "You must be logged in to view your orders" });
      }
      
      console.log(`Fetching orders for user: ${currentUser.username || userId}`);
      
      const response = await getUserOrders();
      console.log(`Fetched ${response?.orders?.length || 0} orders for user ${userId}`);
      
      // Validate that orders belong to current user
      if (response?.orders && Array.isArray(response.orders)) {
        // Log any orders that don't belong to current user (this shouldn't happen)
        const nonUserOrders = response.orders.filter(
          order => order.user && order.user.toString() !== userId
        );
        
        if (nonUserOrders.length > 0) {
          console.warn(`Found ${nonUserOrders.length} orders that don't belong to the current user`);
        }
      }
      
      return response;
    } catch (error) {
      console.error("Error fetching orders:", error);
      return rejectWithValue(error.message || "Failed to fetch orders");
    }
  }
);

const cartSlice = createSlice({
  name: "cart",
  initialState: {
    // User-specific cart storage
    userCarts: {},
    // Current user id
    currentUserId: null,
    // Original cart items (kept for backward compatibility)
    cartItems: [],
    savedItems: [],
    checkout: {
      deliveryAddress: "",
      deliveryMethod: "standard", // standard, express, pickup
      paymentMethod: "cash", // cash, card, wallet
      deliveryInstructions: "",
      contactNumber: "",
      appliedPromoCode: null,
      discount: 0,
      deliveryFee: 0,
    },
    // Location tracking for orders
    pickupPoint: null, // This will store the seller's coordinates [longitude, latitude]
    deliveryPoint: null, // This will store the buyer's coordinates [longitude, latitude]
    orders: [],
    orderStatus: "idle", // idle, loading, succeeded, failed
    orderError: null,
    currentOrderId: null,
    stockErrors: {},
  },
  reducers: {
    // Location management for orders
    setPickupPoint: (state, action) => {
      // Store seller's coordinates when posting food
      state.pickupPoint = action.payload;
      console.log("Pickup point updated in Redux:", action.payload);
    },
    
    setDeliveryPoint: (state, action) => {
      // Store buyer's coordinates when ordering food
      state.deliveryPoint = action.payload;
      console.log("Delivery point updated in Redux:", action.payload);
    },
    
    // Reset location points
    resetLocationPoints: (state) => {
      state.pickupPoint = null;
      state.deliveryPoint = null;
    },
    
    // Set current user ID when user logs in/out
    setCurrentUser: (state, action) => {
      state.currentUserId = action.payload;
      
      // Initialize cart for this user if it doesn't exist
      if (action.payload && !state.userCarts[action.payload]) {
        state.userCarts[action.payload] = {
          cartItems: [],
          savedItems: [],
          stockErrors: {}
        };
      }
      
      // Sync the legacy cartItems with the current user's cart
      if (action.payload) {
        state.cartItems = state.userCarts[action.payload]?.cartItems || [];
      } else {
        state.cartItems = [];
      }
    },
    
    addToCart: (state, action) => {
      // Validate the payload
      if (!action.payload || !action.payload._id) {
        console.error("Invalid cart item: missing ID");
        return;
      }
      
      // Get current user's cart
      const userId = state.currentUserId;
      if (!userId) {
        console.error("Cannot add to cart: no user logged in");
        return;
      }
      
      // Ensure user cart exists
      if (!state.userCarts[userId]) {
        state.userCarts[userId] = {
          cartItems: [],
          savedItems: [],
          stockErrors: {}
        };
      }
      
      const userCart = state.userCarts[userId];
      
      console.log("Adding to cart for user:", userId, action.payload);
      
      const existingItem = userCart.cartItems.find(
        (item) => item._id === action.payload._id
      );
      
      if (existingItem) {
        // If item exists, increase quantity instead of duplicating
        console.log("Item already exists in cart, increasing quantity");
        existingItem.quantity += 1;
        
        // Set a high maxStock value to ensure multiple quantities can be ordered
        existingItem.maxStock = 100;
        console.log("Updated maxStock to:", existingItem.maxStock);
        
        // Clear any stock errors
        delete userCart.stockErrors[existingItem._id];
      } else {
        // Remove from saved items if it exists there
        if (userCart.savedItems) {
          userCart.savedItems = userCart.savedItems.filter(
            (item) => item._id !== action.payload._id
          );
        } else {
          // Initialize savedItems if it doesn't exist
          userCart.savedItems = [];
        }
        
        // Add to cart items with proper maxStock handling
        console.log("Adding new item to cart with maxStock:100");
        userCart.cartItems.push({ 
          ...action.payload, 
          quantity: 1,
          // Always use a high maxStock to allow multiple quantities
          maxStock: 100
        });
      }
      
      // Sync with legacy cartItems for compatibility
      state.cartItems = userCart.cartItems;
      state.stockErrors = userCart.stockErrors;
    },
    
    increaseQuantity: (state, action) => {
      // Validate the payload
      if (!action.payload || !action.payload._id) {
        console.error("Invalid payload for increaseQuantity");
        return;
      }
      
      // Get current user's cart
      const userId = state.currentUserId;
      if (!userId || !state.userCarts[userId]) {
        console.error("Cannot increase quantity: no user logged in or cart doesn't exist");
        return;
      }
      
      const userCart = state.userCarts[userId];
      
      console.log("Increasing quantity for user", userId, "item:", action.payload._id);
      
      // Find the item in cart
      const item = userCart.cartItems.find((i) => i._id === action.payload._id);
      
      if (item) {
        // Always allow increasing quantity with no stock limitations
        item.quantity = (item.quantity || 0) + 1; // Ensure we have a valid quantity
        
        // Always ensure maxStock is set to 100 to allow multiple quantities
        item.maxStock = 100;
        
        console.log("New quantity:", item.quantity, "Max stock:", item.maxStock);
        
        // Only show warning for extremely high quantities (over 50)
        if (item.quantity > 50) {
          userCart.stockErrors[item._id] = `Very high quantity (${item.quantity}) selected`;
        } else {
          // Otherwise, allow any quantity and clear errors
          delete userCart.stockErrors[item._id];
        }
      } else {
        // If item not found, log error
        console.error("Item not found in cart:", action.payload._id);
        
        // Attempt to recover by adding it to cart if we have enough data
        if (action.payload.name && action.payload.price) {
          console.log("Adding missing item to cart");
          userCart.cartItems.push({
            ...action.payload,
            quantity: 1,
            maxStock: 100
          });
        }
      }
      
      // Sync with legacy cartItems for compatibility
      state.cartItems = userCart.cartItems;
      state.stockErrors = userCart.stockErrors;
    },
    
    decreaseQuantity: (state, action) => {
      // Validate the payload
      if (!action.payload || !action.payload._id) {
        console.error("Invalid payload for decreaseQuantity");
        return;
      }
      
      // Get current user's cart
      const userId = state.currentUserId;
      if (!userId || !state.userCarts[userId]) {
        console.error("Cannot decrease quantity: no user logged in or cart doesn't exist");
        return;
      }
      
      const userCart = state.userCarts[userId];
      
      console.log("Decreasing quantity for user", userId, "item:", action.payload._id);
      
      // Find the item in cart
      const item = userCart.cartItems.find((i) => i._id === action.payload._id);
      
      if (item) {
        // Only decrease if quantity is more than zero
        if (item.quantity > 1) {
          item.quantity--;
          console.log("Quantity decreased to:", item.quantity);
          // Clear any stock error when decreasing
          delete userCart.stockErrors[item._id];
        } else {
          // If quantity is 1 or less, remove from cart
          console.log("Removing item from cart (quantity at minimum)");
          userCart.cartItems = userCart.cartItems.filter((i) => i._id !== action.payload._id);
          // Clear any stock error
          delete userCart.stockErrors[item._id];
        }
      } else {
        // If item not found, log error
        console.error("Item not found in cart for decreasing quantity:", action.payload._id);
      }
      
      // Sync with legacy cartItems for compatibility
      state.cartItems = userCart.cartItems;
      state.stockErrors = userCart.stockErrors;
    },
    
    removeFromCart: (state, action) => {
      // Validate the payload
      if (!action.payload) {
        console.error("Invalid payload for removeFromCart");
        return;
      }
      
      // Get current user's cart
      const userId = state.currentUserId;
      if (!userId || !state.userCarts[userId]) {
        console.error("Cannot remove from cart: no user logged in or cart doesn't exist");
        return;
      }
      
      const userCart = state.userCarts[userId];
      
      const idToRemove = action.payload._id || action.payload;
      userCart.cartItems = userCart.cartItems.filter((i) => i._id !== idToRemove);
      // Clear any stock error
      delete userCart.stockErrors[idToRemove];
      
      // Sync with legacy cartItems for compatibility
      state.cartItems = userCart.cartItems;
      state.stockErrors = userCart.stockErrors;
    },
    
    // New reducers
    saveForLater: (state, action) => {
      // Validate the payload
      if (!action.payload) {
        console.error("Invalid payload for saveForLater");
        return;
      }
      
      // Get current user's cart
      const userId = state.currentUserId;
      if (!userId || !state.userCarts[userId]) {
        console.error("Cannot save for later: no user logged in or cart doesn't exist");
        return;
      }
      
      const userCart = state.userCarts[userId];
      
      const idToSave = action.payload._id || action.payload;
      // Find item in cart
      const item = userCart.cartItems.find((i) => i._id === idToSave);
      if (item) {
        // Initialize savedItems if it doesn't exist
        if (!userCart.savedItems) {
          userCart.savedItems = [];
        }
        // Add to saved items
        userCart.savedItems.push({ ...item });
        // Remove from cart
        userCart.cartItems = userCart.cartItems.filter((i) => i._id !== idToSave);
        // Clear any stock error
        delete userCart.stockErrors[idToSave];
      }
      
      // Sync with legacy savedItems/cartItems for compatibility
      state.cartItems = userCart.cartItems;
      state.savedItems = userCart.savedItems;
      state.stockErrors = userCart.stockErrors;
    },
    
    moveToCart: (state, action) => {
      // Validate the payload
      if (!action.payload) {
        console.error("Invalid payload for moveToCart");
        return;
      }
      
      // Get current user's cart
      const userId = state.currentUserId;
      if (!userId || !state.userCarts[userId]) {
        console.error("Cannot move to cart: no user logged in or cart doesn't exist");
        return;
      }
      
      const userCart = state.userCarts[userId];
      
      const idToMove = action.payload._id || action.payload;
      // Initialize savedItems if it doesn't exist
      if (!userCart.savedItems) {
        userCart.savedItems = [];
        return;
      }
      // Find item in saved items
      const item = userCart.savedItems.find((i) => i._id === idToMove);
      if (item) {
        // Add to cart
        userCart.cartItems.push({ ...item });
        // Remove from saved items
        userCart.savedItems = userCart.savedItems.filter((i) => i._id !== idToMove);
      }
      
      // Sync with legacy savedItems/cartItems for compatibility
      state.cartItems = userCart.cartItems;
      state.savedItems = userCart.savedItems;
    },
    
    removeSavedItem: (state, action) => {
      // Validate the payload
      if (!action.payload) {
        console.error("Invalid payload for removeSavedItem");
        return;
      }
      
      // Get current user's cart
      const userId = state.currentUserId;
      if (!userId || !state.userCarts[userId]) {
        console.error("Cannot remove saved item: no user logged in or cart doesn't exist");
        return;
      }
      
      const userCart = state.userCarts[userId];
      
      const idToRemove = action.payload._id || action.payload;
      // Initialize savedItems if it doesn't exist
      if (!userCart.savedItems) {
        userCart.savedItems = [];
        return;
      }
      // Remove from saved items
      userCart.savedItems = userCart.savedItems.filter((i) => i._id !== idToRemove);
      
      // Sync with legacy savedItems for compatibility
      state.savedItems = userCart.savedItems;
    },
    
    // Continue with the rest of your reducers, adapting them to use userCart instead of state directly
    // ...

    // Continue with all other reducers here, adapting them to the user-specific cart pattern...
    
    // Needed for order status reset
    resetOrderStatus: (state) => {
      state.orderStatus = "idle";
      state.orderError = null;
    },
    
    // Clear cart after order completion
    clearCart: (state) => {
      // Get current user's cart
      const userId = state.currentUserId;
      if (userId && state.userCarts[userId]) {
        state.userCarts[userId].cartItems = [];
        state.userCarts[userId].stockErrors = {};
      }
      
      // Also clear legacy cart for compatibility
      state.cartItems = [];
      state.stockErrors = {};
    },
    
    // Checkout related reducers
    updateDeliveryAddress: (state, action) => {
      state.checkout.deliveryAddress = action.payload;
    },
    
    updateDeliveryMethod: (state, action) => {
      state.checkout.deliveryMethod = action.payload;
      // Update delivery fee based on method
      switch (action.payload) {
        case "express":
          state.checkout.deliveryFee = 50; // Express delivery fee
          break;
        case "standard":
          state.checkout.deliveryFee = 20; // Standard delivery fee
          break;
        case "pickup":
          state.checkout.deliveryFee = 0; // No fee for pickup
          break;
        default:
          state.checkout.deliveryFee = 20; // Default to standard
      }
    },
    
    updatePaymentMethod: (state, action) => {
      state.checkout.paymentMethod = action.payload;
    },
    
    updateDeliveryInstructions: (state, action) => {
      state.checkout.deliveryInstructions = action.payload;
    },
    
    updateContactNumber: (state, action) => {
      state.checkout.contactNumber = action.payload;
    },
    
    applyPromoCode: (state, action) => {
      if (action.payload && action.payload.code) {
        state.checkout.appliedPromoCode = action.payload.code;
        state.checkout.discount = action.payload.discount || 0;
      } else {
        state.checkout.appliedPromoCode = null;
        state.checkout.discount = 0;
      }
    },
    
    removePromoCode: (state) => {
      state.checkout.appliedPromoCode = null;
      state.checkout.discount = 0;
    },

    // Add a migration function to handle existing carts
    migrateCart: (state, action) => {
      const userId = action.payload;
      if (!userId) return;
      
      // If there's no user cart yet but there are items in the legacy cart
      if (!state.userCarts[userId] && state.cartItems.length > 0) {
        // Create user cart and copy items
        state.userCarts[userId] = {
          cartItems: [...state.cartItems],
          savedItems: [...(state.savedItems || [])],
          stockErrors: {...state.stockErrors}
        };
      }
      
      // Set current user ID
      state.currentUserId = userId;
      
      // Sync the legacy cartItems with the current user's cart
      if (state.userCarts[userId]) {
        state.cartItems = state.userCarts[userId].cartItems;
        state.savedItems = state.userCarts[userId].savedItems;
        state.stockErrors = state.userCarts[userId].stockErrors;
      }
    },

    // Add a new reducer to handle admin order status updates
    syncOrderStatus: (state, action) => {
      // Validate payload
      const { orderId, status, paymentStatus } = action.payload;
      if (!orderId) {
        console.error("Cannot sync order status: Missing order ID");
        return;
      }
      
      console.log(`Attempting to sync order status. Order ID: ${orderId}, Status: ${status}`);
      
      // Find the order in the user's order history by exact ID match
      const orderIndex = state.orders.findIndex(order => order._id === orderId);
      
      // If order found, update its status
      if (orderIndex !== -1) {
        console.log(`Found order at index ${orderIndex}. Current status: ${state.orders[orderIndex].status}, New status: ${status}`);
        
        if (status) {
          state.orders[orderIndex].status = status;
        }
        
        if (paymentStatus) {
          state.orders[orderIndex].paymentStatus = paymentStatus;
        }
        
        // Update timestamp
        state.orders[orderIndex].updatedAt = new Date().toISOString();
        
        // Log success
        console.log(`Successfully updated order ${orderId} status to: ${status}`);
      } else {
        console.warn(`Order ${orderId} not found in user's order history. Cannot sync status.`);
      }
    },
  },
  extraReducers: (builder) => {
    // Handle async thunks
    builder
      .addCase(placeOrder.pending, (state) => {
        state.orderStatus = "loading";
        state.orderError = null;
      })
      .addCase(placeOrder.fulfilled, (state, action) => {
        state.orderStatus = "succeeded";
        // Add the new order to the orders list
        if (action.payload && action.payload.order) {
          state.orders.unshift(action.payload.order);
          state.currentOrderId = action.payload.order._id;
          // Clear the cart after successful order
          
          // Get current user's cart
          const userId = state.currentUserId;
          if (userId && state.userCarts[userId]) {
            state.userCarts[userId].cartItems = [];
            state.userCarts[userId].stockErrors = {};
          }
          
          // Also clear legacy cart for compatibility
          state.cartItems = [];
          state.stockErrors = {};
        }
      })
      .addCase(placeOrder.rejected, (state, action) => {
        state.orderStatus = "failed";
        state.orderError = action.payload?.message || "Failed to place order";
      })
      .addCase(fetchOrders.pending, (state) => {
        // Add a loading state for orders fetch
        state.orderStatus = "loading";
        state.orderError = null;
      })
      .addCase(fetchOrders.fulfilled, (state, action) => {
        state.orderStatus = "succeeded";
        // Get current user ID for filtering
        const currentUserId = state.currentUserId;
        
        // Extract orders from the response
        let ordersList = [];
        if (action.payload && action.payload.orders && Array.isArray(action.payload.orders)) {
          ordersList = action.payload.orders;
        } else if (Array.isArray(action.payload)) {
          ordersList = action.payload;
        }

        // CRITICAL: Filter orders to only include current user's orders
        if (currentUserId) {
          // Convert both IDs to string for safer comparison
          ordersList = ordersList.filter(order => {
            // If order has a user field and it doesn't match current user, filter it out
            if (order.user && order.user.toString() !== currentUserId.toString()) {
              console.warn(`Filtered out order ${order._id} that belongs to another user`);
              return false;
            }
            return true;
          });
          console.log(`Client-side filtered orders for user ${currentUserId}: ${ordersList.length} orders`);
        } else {
          console.warn("No current user ID available for filtering orders");
          // If no user ID, don't show any orders
          ordersList = [];
        }
        
        // Update state with filtered orders
        state.orders = ordersList;
      })
      .addCase(fetchOrders.rejected, (state, action) => {
        // Handle order fetch error
        state.orderStatus = "failed";
        state.orderError = action.payload?.message || "Failed to fetch orders";
        console.error("Error fetching orders:", action.payload);
      })
      .addCase(resetOrderStatusAction, (state) => {
        state.orderStatus = "idle";
        state.orderError = null;
      })
      // Handle clearing orders when user changes
      .addCase('cart/orders/reset', (state) => {
        console.log("Resetting orders due to user change");
        state.orders = [];
        state.orderStatus = "idle";
        state.orderError = null;
      });
  },
});

// Export all actions
export const {
  addToCart,
  increaseQuantity,
  decreaseQuantity,
  removeFromCart,
  saveForLater,
  moveToCart,
  removeSavedItem,
  updateDeliveryAddress,
  updateDeliveryMethod,
  updatePaymentMethod,
  updateDeliveryInstructions,
  updateContactNumber,
  applyPromoCode,
  removePromoCode,
  resetOrderStatus,
  clearCart,
  setCurrentUser,
  migrateCart,
  syncOrderStatus,
  setPickupPoint,
  setDeliveryPoint,
  resetLocationPoints
} = cartSlice.actions;

// Export the reset order status action separately
export { resetOrderStatusAction };

export default cartSlice.reducer;
