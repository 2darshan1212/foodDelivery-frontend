// utils/axiosInstance.js
import axios from "axios";

// Determine the backend URL based on environment
const isProduction = process.env.NODE_ENV === 'production';
const backendUrl = isProduction
  ? "https://food-delivery-backend-gray.vercel.app/api/v1"
  : "http://localhost:3000/api/v1";

const instance = axios.create({
  baseURL: backendUrl,
  withCredentials: true, // This is crucial for sending cookies in cross-origin requests
  timeout: 15000, // 15 second timeout
});

// Add request debugging and authentication token handling
instance.interceptors.request.use(
  (config) => {
    console.log(`Making ${config.method.toUpperCase()} request to: ${config.url}`);
    
    // Check for auth token in localStorage and add it to headers if it exists
    const authToken = localStorage.getItem('authToken');
    if (authToken) {
      config.headers.Authorization = `Bearer ${authToken}`;
      console.log('Using Authorization header with Bearer token');
    }
    
    return config;
  },
  (error) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

// Add response debugging
instance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('Response error:', error.response?.status || 'Network Error');
    if (error.response?.status === 401) {
      console.error('Authentication error - unauthorized access');
      // You could redirect to login page or handle auth errors here
    }
    return Promise.reject(error);
  }
);

export default instance;
