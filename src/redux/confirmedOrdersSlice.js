import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { getConfirmedOrders, acceptOrder } from "../services/deliveryService";
import { calculateDistance } from "../utils/distanceUtils";
import axios from "axios";

// Axios instance for direct API calls
const api = axios.create({
  baseURL: "http://localhost:8000",
  withCredentials: true,
});

// Add auth token to requests
api.interceptors.request.use(config => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Async thunk for fetching confirmed orders
export const fetchConfirmedOrders = createAsyncThunk(
  "confirmedOrders/fetchConfirmedOrders",
  async (_, { rejectWithValue }) => {
    try {
      const response = await getConfirmedOrders();
      return response;
    } catch (error) {
      return rejectWithValue(error.message || "Failed to fetch confirmed orders");
    }
  }
);

// Async thunk for accepting an order
export const acceptConfirmedOrder = createAsyncThunk(
  "confirmedOrders/acceptOrder",
  async (orderId, { rejectWithValue }) => {
    try {
      const response = await acceptOrder(orderId);
      return { ...response, orderId };
    } catch (error) {
      return rejectWithValue(error.message || "Failed to accept order");
    }
  }
);

const initialState = {
  orders: [],
  pickupPoints: [],
  deliveryPoints: [],
  agentLocation: {
    latitude: null,
    longitude: null,
  },
  distances: {}, // Map of orderId to distance from agent to pickup
  pickupToDeliveryDistances: {}, // Map of orderId to distance from pickup to delivery
  estimatedTravelTimes: {}, // Map of orderId to estimated travel time in minutes
  isLoading: false,
  error: null,
  lastUpdated: null,
  acceptingOrderId: null
};

// New async thunk to directly fetch a single order by ID and add it to confirmed orders
export const addOrderToConfirmed = createAsyncThunk(
  "confirmedOrders/addOrderToConfirmed",
  async (orderId, { rejectWithValue }) => {
    try {
      // Direct API call to get the order details
      const response = await api.get(`/api/v1/orders/${orderId}`);
      const order = response.data.order;
      
      // Verify the order is in confirmed status
      if (order && order.status === 'confirmed') {
        // Get the restaurant details for this order if needed
        let restaurantData = order.restaurant;
        
        // If we only have restaurantId but not full restaurant data, fetch it
        if (!restaurantData || !restaurantData.name) {
          try {
            const restaurantResponse = await api.get(`/api/v1/restaurants/${order.restaurantId}`);
            restaurantData = restaurantResponse.data.restaurant;
          } catch (err) {
            console.error('Failed to fetch restaurant details:', err);
            // Continue with limited restaurant data
          }
        }
        
        // Return order with restaurant data
        return { 
          order: {
            ...order,
            restaurant: restaurantData
          }
        };
      } else {
        return rejectWithValue("Order is not in confirmed status");
      }
    } catch (error) {
      console.error('Failed to fetch order details:', error);
      return rejectWithValue(error.message || "Failed to add order to confirmed orders");
    }
  }
);

const confirmedOrdersSlice = createSlice({
  name: "confirmedOrders",
  initialState,
  reducers: {
    // Update agent location and recalculate distances
    updateAgentLocation: (state, action) => {
      const { latitude, longitude } = action.payload;
      state.agentLocation = { latitude, longitude };
      
      // Recalculate distances if we have pickup points and agent location
      if (state.pickupPoints.length > 0 && latitude && longitude) {
        const newDistances = {};
        const newTravelTimes = {};
        
        state.pickupPoints.forEach(point => {
          if (point.latitude && point.longitude) {
            // Calculate distance from agent to pickup point
            const distance = calculateDistance(
              latitude,
              longitude,
              point.latitude,
              point.longitude
            );
            
            newDistances[point.orderId] = distance;
            
            // Estimate travel time (assuming average speed of 30 km/h)
            const travelTimeMinutes = Math.round((distance / 30) * 60);
            newTravelTimes[point.orderId] = travelTimeMinutes;
          }
        });
        
        state.distances = newDistances;
        state.estimatedTravelTimes = newTravelTimes;
      }
    },
    
    // Manually refresh orders
    refreshOrders: (state) => {
      state.isLoading = true;
      state.error = null;
    },
    
    // Clear all orders
    clearOrders: (state) => {
      state.orders = [];
      state.pickupPoints = [];
      state.deliveryPoints = [];
      state.distances = {};
      state.pickupToDeliveryDistances = {};
      state.estimatedTravelTimes = {};
      state.lastUpdated = null;
    },
    
    // Reset state
    reset: () => initialState
  },
  extraReducers: (builder) => {
    // Handle fetchConfirmedOrders lifecycle
    builder.addCase(fetchConfirmedOrders.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    
    builder.addCase(fetchConfirmedOrders.fulfilled, (state, action) => {
      state.isLoading = false;
      state.orders = action.payload.orders || [];
      state.lastUpdated = new Date().toISOString();
      
      // Extract pickup and delivery points from orders
      const pickupPoints = [];
      const deliveryPoints = [];
      const pickupToDeliveryDistances = {};
      
      state.orders.forEach(order => {
        // Extract restaurant/pickup coordinates
        if (order.restaurant && order.restaurant.location && 
            order.restaurant.location.coordinates && 
            order.restaurant.location.coordinates.length === 2) {
          
          const coordinates = order.restaurant.location.coordinates;
          let deliveryLongitude = null;
          let deliveryLatitude = null;
          
          // Extract delivery location coordinates if available
          if (order.deliveryLocation && order.deliveryLocation.coordinates && 
              order.deliveryLocation.coordinates.length === 2) {
            deliveryLongitude = order.deliveryLocation.coordinates[0];
            deliveryLatitude = order.deliveryLocation.coordinates[1];
            
            // Add to delivery points
            deliveryPoints.push({
              orderId: order._id,
              longitude: deliveryLongitude,
              latitude: deliveryLatitude,
              address: order.deliveryAddress || 'No address provided',
              customerName: order.user?.name || 'Customer'
            });
          }
          
          // Add to pickup points
          pickupPoints.push({
            orderId: order._id,
            restaurantId: order.restaurant._id,
            restaurantName: order.restaurant.name,
            longitude: coordinates[0],
            latitude: coordinates[1],
            deliveryLatitude,
            deliveryLongitude,
            deliveryAddress: order.deliveryAddress || 'No address provided',
            orderAmount: order.totalAmount,
            items: order.items?.length || 0,
            customerName: order.user?.name || 'Customer',
            orderTime: order.createdAt,
            status: order.status,
            orderDetails: {
              items: order.items || [],
              paymentMethod: order.paymentMethod,
              specialInstructions: order.specialInstructions || '',
              subtotal: order.subtotal || 0,
              deliveryFee: order.deliveryFee || 0,
              tax: order.tax || 0,
              tip: order.tip || 0,
              total: order.totalAmount || 0
            }
          });
          
          // Calculate distance between pickup and delivery if both coordinates exist
          if (deliveryLatitude && deliveryLongitude) {
            const distance = calculateDistance(
              coordinates[1],
              coordinates[0],
              deliveryLatitude,
              deliveryLongitude
            );
            pickupToDeliveryDistances[order._id] = distance;
          }
        }
      });
      
      state.pickupPoints = pickupPoints;
      state.deliveryPoints = deliveryPoints;
      state.pickupToDeliveryDistances = pickupToDeliveryDistances;
      
      // Calculate distances if agent location is available
      if (state.agentLocation.latitude && state.agentLocation.longitude) {
        const newDistances = {};
        const newTravelTimes = {};
        
        pickupPoints.forEach(point => {
          if (point.latitude && point.longitude) {
            // Calculate distance from agent to pickup
            const distance = calculateDistance(
              state.agentLocation.latitude,
              state.agentLocation.longitude,
              point.latitude,
              point.longitude
            );
            
            newDistances[point.orderId] = distance;
            
            // Estimate travel time (assuming average speed of 30 km/h)
            const travelTimeMinutes = Math.round((distance / 30) * 60);
            newTravelTimes[point.orderId] = travelTimeMinutes;
          }
        });
        
        state.distances = newDistances;
        state.estimatedTravelTimes = newTravelTimes;
      }
    });
    
    builder.addCase(fetchConfirmedOrders.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload;
    });
    
    // Handle accepting an order
    builder.addCase(acceptConfirmedOrder.pending, (state, action) => {
      state.acceptingOrderId = action.meta.arg;
    });
    
    builder.addCase(acceptConfirmedOrder.fulfilled, (state, action) => {
      state.acceptingOrderId = null;
      
      // Remove the accepted order from the list
      state.orders = state.orders.filter(order => order._id !== action.payload.orderId);
      state.pickupPoints = state.pickupPoints.filter(point => point.orderId !== action.payload.orderId);
      state.deliveryPoints = state.deliveryPoints.filter(point => point.orderId !== action.payload.orderId);
      
      // Clean up distance maps
      delete state.distances[action.payload.orderId];
      delete state.pickupToDeliveryDistances[action.payload.orderId];
      delete state.estimatedTravelTimes[action.payload.orderId];
    });
    
    builder.addCase(acceptConfirmedOrder.rejected, (state) => {
      state.acceptingOrderId = null;
    });
    
    // Handle the manual refresh action
    builder.addCase(refreshOrders.type, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    
    // Handle adding a single order to confirmed orders
    builder.addCase(addOrderToConfirmed.pending, (state) => {
      // Don't set loading true to avoid UI flicker
      state.error = null;
    });
    
    builder.addCase(addOrderToConfirmed.fulfilled, (state, action) => {
      const newOrder = action.payload.order;
      
      // Check if order already exists in the list
      const orderExists = state.orders.some(order => order._id === newOrder._id);
      
      // Only add if it doesn't already exist
      if (!orderExists) {
        console.log('Adding new confirmed order to Redux store:', newOrder._id);
        
        // Add the new order to the orders array
        state.orders.push(newOrder);
        
        // Process the order to extract pickup and delivery points
        if (newOrder.restaurant && newOrder.restaurant.location && 
            newOrder.restaurant.location.coordinates && 
            newOrder.restaurant.location.coordinates.length === 2) {
          
          const coordinates = newOrder.restaurant.location.coordinates;
          let deliveryLongitude = null;
          let deliveryLatitude = null;
          
          // Extract delivery location coordinates if available
          if (newOrder.deliveryLocation && newOrder.deliveryLocation.coordinates && 
              newOrder.deliveryLocation.coordinates.length === 2) {
            deliveryLongitude = newOrder.deliveryLocation.coordinates[0];
            deliveryLatitude = newOrder.deliveryLocation.coordinates[1];
            
            // Add to delivery points
            state.deliveryPoints.push({
              orderId: newOrder._id,
              longitude: deliveryLongitude,
              latitude: deliveryLatitude,
              address: newOrder.deliveryAddress || 'No address provided',
              customerName: newOrder.user?.name || 'Customer'
            });
            
            // Calculate pickup to delivery distance
            if (coordinates[1] && coordinates[0]) {
              const distance = calculateDistance(
                coordinates[1],
                coordinates[0],
                deliveryLatitude,
                deliveryLongitude
              );
              state.pickupToDeliveryDistances[newOrder._id] = distance;
            }
          }
          
          // Add to pickup points
          state.pickupPoints.push({
            orderId: newOrder._id,
            restaurantId: newOrder.restaurant._id,
            restaurantName: newOrder.restaurant.name,
            longitude: coordinates[0],
            latitude: coordinates[1],
            deliveryLatitude,
            deliveryLongitude,
            deliveryAddress: newOrder.deliveryAddress || 'No address provided',
            orderAmount: newOrder.totalAmount,
            items: newOrder.items?.length || 0,
            customerName: newOrder.user?.name || 'Customer',
            orderTime: newOrder.createdAt,
            status: newOrder.status,
            orderDetails: {
              items: newOrder.items || [],
              paymentMethod: newOrder.paymentMethod,
              specialInstructions: newOrder.specialInstructions || '',
              subtotal: newOrder.subtotal || 0,
              deliveryFee: newOrder.deliveryFee || 0,
              tax: newOrder.tax || 0,
              tip: newOrder.tip || 0,
              total: newOrder.totalAmount || 0
            }
          });
          
          // Calculate distance from agent if location is available
          if (state.agentLocation.latitude && state.agentLocation.longitude) {
            const distance = calculateDistance(
              state.agentLocation.latitude,
              state.agentLocation.longitude,
              coordinates[1],
              coordinates[0]
            );
            
            state.distances[newOrder._id] = distance;
            
            // Estimate travel time (assuming average speed of 30 km/h)
            const travelTimeMinutes = Math.round((distance / 30) * 60);
            state.estimatedTravelTimes[newOrder._id] = travelTimeMinutes;
          }
        }
        
        // Update lastUpdated timestamp
        state.lastUpdated = new Date().toISOString();
      } else {
        console.log('Order already exists in confirmed orders:', newOrder._id);
      }
    });
    
    builder.addCase(addOrderToConfirmed.rejected, (state, action) => {
      // Don't set loading false to avoid UI flicker
      state.error = action.payload;
      console.error('Failed to add order to confirmed orders:', action.payload);
    });
  },
});

export const { 
  updateAgentLocation, 
  refreshOrders, 
  clearOrders, 
  reset 
} = confirmedOrdersSlice.actions;

export default confirmedOrdersSlice.reducer;
