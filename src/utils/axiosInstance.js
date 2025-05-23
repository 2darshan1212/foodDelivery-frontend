// utils/axiosInstance.js
import axios from "axios";

// Determine the backend URL based on environment
const isProduction = true; // Force production mode for Vercel

// IMPORTANT: Make sure this matches your actual backend URL
const backendUrl = "https://food-delivery-backend-gray.vercel.app/api/v1";
console.log('Using backend URL:', backendUrl);

// Initialize auth token from localStorage if exists
const initializeAuthToken = () => {
  const authToken = localStorage.getItem('authToken');
  if (authToken) {
    console.log('Found existing auth token in localStorage');
    return authToken;
  }
  return null;
};

// Create axios instance
const instance = axios.create({
  baseURL: backendUrl,
  withCredentials: true, // Still try cookies, but we'll primarily use token auth
  timeout: 30000, // Increased timeout for Vercel's cold starts
});

// Global variable to store token - will be refreshed on login
let currentAuthToken = initializeAuthToken();

// Set the global axios default for all requests
if (currentAuthToken) {
  axios.defaults.headers.common['Authorization'] = `Bearer ${currentAuthToken}`;
  console.log('Set global Authorization header for all axios requests');
}

// Function to set auth token that can be called from anywhere
export const setAuthToken = (token) => {
  if (token) {
    // Store in memory
    currentAuthToken = token;
    
    // Store in localStorage for persistence
    localStorage.setItem('authToken', token);
    
    // Set for all future axios requests
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    instance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    
    console.log('Auth token set globally for all future requests');
    return true;
  }
  return false;
};

// Function to clear auth token on logout
export const clearAuthToken = () => {
  // Clear from memory
  currentAuthToken = null;
  
  // Clear from localStorage
  localStorage.removeItem('authToken');
  
  // Clear from axios defaults
  delete axios.defaults.headers.common['Authorization'];
  delete instance.defaults.headers.common['Authorization'];
  
  console.log('Auth token cleared');
};

// Add request interceptor for debugging and ensuring token is set
instance.interceptors.request.use(
  (config) => {
    // Debug info
    console.log(`Making ${config.method.toUpperCase()} request to: ${config.url}`);
    
    // Double-check token is in headers for this request
    const authToken = currentAuthToken || localStorage.getItem('authToken');
    if (authToken && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${authToken}`;
      console.log('Added missing Authorization header to request');
    }
    
    return config;
  },
  (error) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
instance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Log detailed error information
    console.error(`API Error (${error.response?.status || 'Network Error'}):`, 
      error.response?.data || error.message);
    
    // Handle 401 errors - token might be expired or invalid
    if (error.response?.status === 401) {
      console.error('Authentication failed - you may need to log in again');
      // You could implement auto-redirect to login here
    }
    
    return Promise.reject(error);
  }
);

export default instance;
