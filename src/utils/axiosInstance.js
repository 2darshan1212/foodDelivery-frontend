// utils/axiosInstance.js
import axios from "axios";

// Explicitly set the backend URL to match the Vercel deployment
const backendUrl = "https://food-delivery-backend-gray.vercel.app/api/v1";
console.log('Using backend URL:', backendUrl);

// Create axios instance with appropriate configuration
const instance = axios.create({
  baseURL: backendUrl,
  // Do not use credentials by default for cross-origin requests
  // We'll use Authorization header with Bearer token instead
  withCredentials: false,
  timeout: 60000, // Increased timeout for Vercel serverless functions (60 seconds)
  // Add retry logic for failed requests
  retries: 2,
  retryDelay: 1000,
});

// Check for existing auth token in localStorage - use the correct key name
const authToken = localStorage.getItem('authToken') || localStorage.getItem('token');
if (authToken) {
  // Apply token to both our instance and global axios
  instance.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
  axios.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
  console.log('Found and applied existing auth token');
} else {
  console.log('No auth token found in localStorage');
}

// Function to set auth token that can be called from login/register components
export const setAuthToken = (token) => {
  if (token) {
    try {
      // Store in localStorage for persistence under both possible key names for compatibility
      localStorage.setItem('authToken', token);
      localStorage.setItem('token', token); // Also store as 'token' for backwards compatibility
      
      // Set for both our instance and global axios
      instance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      console.log('Auth token set successfully for all future requests');
      return true;
    } catch (error) {
      console.error('Error setting auth token:', error);
      return false;
    }
  }
  return false;
};

// Function to clear auth token on logout
export const clearAuthToken = () => {
  // Clear from localStorage
  localStorage.removeItem('authToken');
  
  // Clear from axios defaults
  delete instance.defaults.headers.common['Authorization'];
  delete axios.defaults.headers.common['Authorization'];
  
  console.log('Auth token cleared');
};

// Request interceptor for debugging and token verification
instance.interceptors.request.use(
  (config) => {
    console.log(`Request to: ${config.url}`);
    
    // Always check token on each request
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Add metadata for retry mechanism
    config.metadata = { ...config.metadata, startTime: new Date().getTime() };
    
    return config;
  },
  (error) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling with retry logic
instance.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // Only attempt retries on network errors and 5xx responses (server errors)
    const shouldRetry = (!error.response || (error.response.status >= 500 && error.response.status < 600)) && 
                        originalRequest && 
                        originalRequest.retries > 0;
    
    if (shouldRetry) {
      originalRequest.retries -= 1;
      console.log(`Retrying request to ${originalRequest.url}, ${originalRequest.retries} attempts left`);
      
      // Add a delay before retrying
      const delay = originalRequest.retryDelay || 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Return the retry request
      return instance(originalRequest);
    }
    
    // Log the appropriate error
    if (error.response) {
      console.error(`API Error ${error.response.status}:`, error.response.data);
      
      // Handle 401 Unauthorized errors
      if (error.response.status === 401) {
        console.error('Authentication failed - you may need to log in again');
        // You could redirect to login page here
      } else if (error.response.status === 504) {
        console.error('Gateway timeout - server is taking too long to respond');
      }
    } else if (error.code === 'ECONNABORTED') {
      console.error('Request timeout - server did not respond in time');
    } else {
      console.error('Network Error:', error.message);
    }
    
    return Promise.reject(error);
  }
);

export default instance;
