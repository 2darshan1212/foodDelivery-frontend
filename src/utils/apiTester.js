import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

/**
 * Test the backend API connectivity
 * @returns {Promise} A promise that resolves to the health status
 */
export const testApiConnection = async () => {
  try {
    console.log('Testing API connection to:', `${API_BASE_URL}/api/health`);
    const response = await axios.get(`${API_BASE_URL}/api/health`, { timeout: 5000 });
    console.log('API health check response:', response.data);
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('API connection test failed:', error.message);
    return {
      success: false,
      error: error.message,
      details: error.response?.data || 'No response data'
    };
  }
};

/**
 * Test a specific API endpoint
 * @param {string} endpoint - The API endpoint to test (e.g., "/api/v1/orders")
 * @returns {Promise} A promise that resolves to the test result
 */
export const testEndpoint = async (endpoint) => {
  try {
    const url = `${API_BASE_URL}${endpoint}`;
    console.log('Testing endpoint:', url);
    const response = await axios.get(url, { 
      withCredentials: true,
      timeout: 5000
    });
    console.log('Endpoint test response:', response.data);
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('Endpoint test failed:', error.message);
    return {
      success: false,
      error: error.message,
      details: error.response?.data || 'No response data',
      status: error.response?.status
    };
  }
}; 