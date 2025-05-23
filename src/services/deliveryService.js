import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

// Create axios instance with credentials and timeout
const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 10000 // 10 second timeout
});

// Add request interceptor to include auth token
api.interceptors.request.use(
  config => {
    // Get token from localStorage
    const token = localStorage.getItem('token');
    if (token) {
      // Add token to authorization header
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

// Add response interceptor for better error handling
api.interceptors.response.use(
  response => response,
  error => {
    // Handle request timeout
    if (error.code === 'ECONNABORTED') {
      console.error('Request timed out');
      return Promise.reject({ message: 'Request timed out. Please try again.' });
    }
    
    // Handle network errors
    if (!error.response) {
      console.error('Network error:', error);
      return Promise.reject({ message: 'Network error. Please check your internet connection.' });
    }
    
    // Log the error for debugging
    console.error('API Error:', error.response?.data || error.message);
    
    // Return a structured error
    return Promise.reject(error.response?.data || { message: error.message || 'An error occurred' });
  }
);

// Register as a delivery agent
export const registerAsDeliveryAgent = async (data) => {
  try {
    const response = await api.post('/api/v1/delivery/register', data);
    return response.data;
  } catch (error) {
    console.error('Failed to register as delivery agent:', error);
    throw error;
  }
};

// Get delivery agent profile
export const getAgentProfile = async () => {
  try {
    const response = await api.get('/api/v1/delivery/profile');
    return response.data;
  } catch (error) {
    console.error('Failed to fetch delivery agent profile:', error);
    throw error;
  }
};

// Get delivery history
export const getDeliveryHistory = async () => {
  try {
    const response = await api.get('/api/v1/delivery/history');
    return response.data;
  } catch (error) {
    console.error('Failed to fetch delivery history:', error);
    throw error;
  }
};

// Update availability status
export const updateAvailability = async (isAvailable) => {
  try {
    const response = await api.put('/api/v1/delivery/availability', { isAvailable });
    return response.data;
  } catch (error) {
    console.error('Failed to update availability:', error);
    throw error;
  }
};

// Update current location
export const updateLocation = async (longitude, latitude) => {
  try {
    // Validate coordinates
    if (typeof longitude !== 'number' || typeof latitude !== 'number' ||
        isNaN(longitude) || isNaN(latitude) ||
        longitude < -180 || longitude > 180 || 
        latitude < -90 || latitude > 90) {
      throw new Error('Invalid coordinates provided');
    }
    
    // Round to 6 decimal places for precision (~11cm at the equator)
    const formattedLongitude = parseFloat(longitude.toFixed(6));
    const formattedLatitude = parseFloat(latitude.toFixed(6));
    
    console.log(`Updating location: [${formattedLongitude}, ${formattedLatitude}]`);
    
    const response = await api.put('/api/v1/delivery/location', { 
      longitude: formattedLongitude, 
      latitude: formattedLatitude 
    });
    
    return response.data;
  } catch (error) {
    console.error('Failed to update location:', error);
    // Add more specific error handling
    if (error.message === 'Invalid coordinates provided') {
      throw { message: error.message };
    }
    if (error.code === 'ECONNABORTED') {
      throw { message: 'Location update timed out. Server might be busy.' };
    }
    throw error;
  }
};

// Get nearby orders available for delivery
export const getNearbyOrders = async () => {
  try {
    // Added includeAllConfirmed=true to fetch all confirmed orders regardless of distance
    const response = await api.get('/api/v1/delivery/nearby-orders?includeAllConfirmed=true');
    return response.data;
  } catch (error) {
    console.error('Failed to fetch nearby orders:', error);
    throw error;
  }
};

// Accept an order for delivery
export const acceptOrder = async (orderId) => {
  try {
    const response = await api.post(`/api/v1/delivery/accept/${orderId}`);
    return response.data;
  } catch (error) {
    console.error('Failed to accept order:', error);
    throw error;
  }
};

// Reject an order (don't want to deliver it)
export const rejectOrder = async (orderId) => {
  try {
    const response = await api.post(`/api/v1/delivery/reject/${orderId}`);
    return response.data;
  } catch (error) {
    console.error('Failed to reject order:', error);
    throw error;
  }
};

// Mark an order as delivered
export const completeDelivery = async (orderId) => {
  try {
    const response = await api.put(`/api/v1/delivery/complete/${orderId}`);
    return response.data;
  } catch (error) {
    console.error('Failed to complete delivery:', error);
    throw error;
  }
};

// Admin: Get all delivery agents
export const getAllAgents = async () => {
  try {
    const response = await api.get('/api/v1/delivery/admin/all');
    return response.data;
  } catch (error) {
    console.error('Failed to fetch all delivery agents:', error);
    throw error;
  }
};

// Admin: Verify delivery agent
export const verifyDeliveryAgent = async (agentId, isVerified) => {
  try {
    const response = await api.put(`/api/v1/delivery/admin/verify/${agentId}`, { isVerified });
    return response.data;
  } catch (error) {
    console.error('Failed to verify delivery agent:', error);
    throw error;
  }
};

// Get orders with 'confirmed' status that need delivery
export const getConfirmedOrders = async () => {
  try {
    const response = await api.get('/api/v1/delivery/confirmed-orders');
    return response.data;
  } catch (error) {
    console.error('Failed to fetch confirmed orders:', error);
    throw error;
  }
}; 