import axios from 'axios';

// API base URL
const API_BASE_URL = 'http://localhost:8000';

// Create axios instance with credentials
const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 10000 // 10 second timeout
});

/**
 * Utility to check if the current user has admin access
 * This is a regular function, not a React hook
 */
export const checkAdminAccess = async () => {
  console.log('Checking admin access...');
  try {
    // Step 1: Check if user is logged in and has admin flag
    const userResponse = await api.get('/api/v1/user/me');
    console.log('Current user data:', userResponse.data);
    
    if (!userResponse.data.success) {
      return {
        success: false,
        message: 'Failed to retrieve user information',
        details: userResponse.data
      };
    }
    
    const user = userResponse.data.user;
    if (!user) {
      return {
        success: false,
        message: 'User not authenticated',
        isAdmin: false
      };
    }
    
    if (!user.isAdmin) {
      return {
        success: false,
        message: 'User does not have admin privileges',
        isAdmin: false,
        user
      };
    }
    
    // Step 2: Check explicit admin status endpoint
    const adminCheckResponse = await api.get('/api/v1/user/check-admin');
    console.log('Admin check response:', adminCheckResponse.data);
    
    if (!adminCheckResponse.data.isAdmin) {
      return {
        success: false,
        message: 'Admin status inconsistency detected',
        userIsAdmin: user.isAdmin,
        checkIsAdmin: adminCheckResponse.data.isAdmin
      };
    }
    
    // Step 3: Try to access a protected admin endpoint
    try {
      const statsResponse = await api.get('/api/v1/orders/admin/stats');
      console.log('Admin stats response:', statsResponse.data);
      
      return {
        success: true,
        message: 'Admin access confirmed',
        isAdmin: true,
        user
      };
    } catch (adminError) {
      console.error('Error accessing admin endpoint:', adminError);
      return {
        success: false,
        message: 'Cannot access admin endpoints',
        error: adminError.response?.data || adminError.message,
        isAdmin: true, // User has admin flag but can't access admin endpoints
        user
      };
    }
  } catch (error) {
    console.error('Admin access check error:', error);
    return {
      success: false,
      message: error.response?.data?.message || 'Error checking admin access',
      error: error.response?.data || error.message
    };
  }
};

export default {
  checkAdminAccess
}; 