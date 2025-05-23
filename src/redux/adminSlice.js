import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

// Create axios instance with credentials
const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 10000
});

// Normalize order data when receiving from API
const normalizeOrder = (order) => {
  if (!order) return null;
  
  return {
    ...order,
    // Ensure these fields always exist
    totalAmount: order.totalAmount || order.total || 0,
    subtotal: order.subtotal || 0,
    tax: order.tax || 0,
    deliveryFee: order.deliveryFee || 0,
    status: order.status || 'processing',
    paymentStatus: order.paymentStatus || 'pending',
    items: Array.isArray(order.items) ? order.items : []
  };
};

// Action to fetch all orders (admin)
export const fetchAllOrders = createAsyncThunk(
  'admin/fetchAllOrders',
  async (params, { rejectWithValue }) => {
    try {
      const { page = 1, limit = 10, status, sortBy, sortOrder } = params || {};
      
      let url = `/api/v1/orders/admin/all?page=${page}&limit=${limit}`;
      
      if (status && status !== 'all') {
        url += `&status=${status}`;
      }
      
      if (sortBy) {
        url += `&sortBy=${sortBy}`;
      }
      
      if (sortOrder) {
        url += `&sortOrder=${sortOrder}`;
      }
      
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      console.error('Error fetching orders:', error);
      return rejectWithValue(
        error.response?.data || { message: 'Failed to fetch orders' }
      );
    }
  }
);

// Action to fetch order statistics
export const fetchOrderStats = createAsyncThunk(
  'admin/fetchOrderStats',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/api/v1/orders/admin/stats');
      return response.data;
    } catch (error) {
      console.error('Error fetching order stats:', error);
      return rejectWithValue(
        error.response?.data || { message: 'Failed to fetch order statistics' }
      );
    }
  }
);

// Action to update order status
export const updateOrderStatus = createAsyncThunk(
  'admin/updateOrderStatus',
  async ({ orderId, status, paymentStatus, deliveryNotes }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/api/v1/orders/admin/${orderId}/status`, {
        status,
        paymentStatus,
        deliveryNotes
      });
      return response.data;
    } catch (error) {
      console.error('Error updating order status:', error);
      return rejectWithValue(
        error.response?.data || { message: 'Failed to update order status' }
      );
    }
  }
);

// Action to fetch delivery status history
export const fetchDeliveryStatusHistory = createAsyncThunk(
  'admin/fetchDeliveryStatusHistory',
  async (orderId, { rejectWithValue }) => {
    try {
      const response = await api.get(`/api/v1/orders/admin/${orderId}/status-history`);
      return response.data;
    } catch (error) {
      console.error('Error fetching status history:', error);
      return rejectWithValue(
        error.response?.data || { message: 'Failed to fetch status history' }
      );
    }
  }
);

// Action to assign a delivery agent
export const assignDeliveryAgent = createAsyncThunk(
  'admin/assignDeliveryAgent',
  async ({ orderId, agentId }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/api/v1/orders/admin/${orderId}/assign-agent`, {
        agentId
      });
      return response.data;
    } catch (error) {
      console.error('Error assigning delivery agent:', error);
      return rejectWithValue(
        error.response?.data || { message: 'Failed to assign delivery agent' }
      );
    }
  }
);

const adminSlice = createSlice({
  name: 'admin',
  initialState: {
    orders: {
      data: [],
      pagination: {
        totalOrders: 0,
        totalPages: 0,
        currentPage: 1,
        limit: 10,
        hasNextPage: false,
        hasPrevPage: false
      },
      status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
      error: null
    },
    stats: {
      data: null,
      status: 'idle',
      error: null
    },
    updateStatus: {
      status: 'idle',
      error: null
    },
    deliveryStatusHistory: {
      data: [],
      status: 'idle',
      error: null
    },
    assignAgent: {
      status: 'idle',
      error: null
    }
  },
  reducers: {
    resetUpdateStatus: (state) => {
      state.updateStatus.status = 'idle';
      state.updateStatus.error = null;
    },
    resetAssignAgentStatus: (state) => {
      state.assignAgent.status = 'idle';
      state.assignAgent.error = null;
    },
    resetStatusHistory: (state) => {
      state.deliveryStatusHistory = {
        data: [],
        status: 'idle',
        error: null
      };
    }
  },
  extraReducers: (builder) => {
    builder
      // Handle fetchAllOrders
      .addCase(fetchAllOrders.pending, (state) => {
        state.orders.status = 'loading';
      })
      .addCase(fetchAllOrders.fulfilled, (state, action) => {
        state.orders.status = 'succeeded';
        state.orders.data = action.payload.orders ? 
          action.payload.orders.map(order => normalizeOrder(order)) : 
          [];
        state.orders.pagination = action.payload.pagination || {
          totalOrders: 0,
          totalPages: 0,
          currentPage: 1,
          limit: 10,
          hasNextPage: false,
          hasPrevPage: false
        };
        state.orders.error = null;
      })
      .addCase(fetchAllOrders.rejected, (state, action) => {
        state.orders.status = 'failed';
        state.orders.error = action.payload?.message || 'Failed to fetch orders';
      })
      
      // Handle fetchOrderStats
      .addCase(fetchOrderStats.pending, (state) => {
        state.stats.status = 'loading';
      })
      .addCase(fetchOrderStats.fulfilled, (state, action) => {
        state.stats.status = 'succeeded';
        state.stats.data = action.payload.stats;
        state.stats.error = null;
      })
      .addCase(fetchOrderStats.rejected, (state, action) => {
        state.stats.status = 'failed';
        state.stats.error = action.payload?.message || 'Failed to fetch statistics';
      })
      
      // Handle updateOrderStatus
      .addCase(updateOrderStatus.pending, (state) => {
        state.updateStatus.status = 'loading';
      })
      .addCase(updateOrderStatus.fulfilled, (state, action) => {
        state.updateStatus.status = 'succeeded';
        state.updateStatus.error = null;
        
        // Update the order in the orders list
        if (action.payload && action.payload.order) {
          const updatedOrder = normalizeOrder(action.payload.order);
          const orderIndex = state.orders.data.findIndex(
            (order) => order._id === updatedOrder._id
          );
          
          if (orderIndex !== -1) {
            state.orders.data[orderIndex] = updatedOrder;
          }
        }
      })
      .addCase(updateOrderStatus.rejected, (state, action) => {
        state.updateStatus.status = 'failed';
        state.updateStatus.error = action.payload?.message || 'Failed to update order';
      })
      
      // Handle fetchDeliveryStatusHistory
      .addCase(fetchDeliveryStatusHistory.pending, (state) => {
        state.deliveryStatusHistory.status = 'loading';
      })
      .addCase(fetchDeliveryStatusHistory.fulfilled, (state, action) => {
        state.deliveryStatusHistory.status = 'succeeded';
        state.deliveryStatusHistory.data = action.payload.statusHistory;
        state.deliveryStatusHistory.error = null;
      })
      .addCase(fetchDeliveryStatusHistory.rejected, (state, action) => {
        state.deliveryStatusHistory.status = 'failed';
        state.deliveryStatusHistory.error = action.payload?.message || 'Failed to fetch status history';
      })
      
      // Handle assignDeliveryAgent
      .addCase(assignDeliveryAgent.pending, (state) => {
        state.assignAgent.status = 'loading';
      })
      .addCase(assignDeliveryAgent.fulfilled, (state, action) => {
        state.assignAgent.status = 'succeeded';
        state.assignAgent.error = null;
        
        // Update the order in the orders list
        if (action.payload && action.payload.order) {
          const updatedOrder = normalizeOrder(action.payload.order);
          const orderIndex = state.orders.data.findIndex(
            (order) => order._id === updatedOrder._id
          );
          
          if (orderIndex !== -1) {
            state.orders.data[orderIndex] = updatedOrder;
          }
        }
      })
      .addCase(assignDeliveryAgent.rejected, (state, action) => {
        state.assignAgent.status = 'failed';
        state.assignAgent.error = action.payload?.message || 'Failed to assign delivery agent';
      });
  }
});

export const { resetUpdateStatus, resetAssignAgentStatus, resetStatusHistory } = adminSlice.actions;

export default adminSlice.reducer; 