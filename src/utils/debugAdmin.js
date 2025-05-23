import axios from 'axios';

/**
 * Debug utility to diagnose admin authentication issues
 * This is a regular function, not a React hook
 */
const debugAdmin = async () => {
  try {
    console.log('=== ADMIN DEBUG UTILITY ===');
    
    // 1. Check current user from browser localStorage
    const storedState = localStorage.getItem('persist:root');
    console.log('1. Stored Redux State:', storedState ? 'Found' : 'Not found');
    
    if (storedState) {
      try {
        const parsedState = JSON.parse(storedState);
        const authState = JSON.parse(parsedState.auth || '{}');
        console.log('   Auth State:', authState);
        console.log('   User info:', authState.user);
        console.log('   isAdmin flag:', authState.user?.isAdmin);
      } catch (e) {
        console.log('   Error parsing state:', e);
      }
    }
    
    // 2. Check cookie status
    console.log('2. Cookie Status:', document.cookie ? 'Cookies present' : 'No cookies');
    
    // 3. Check API /me endpoint
    console.log('3. Checking /me endpoint...');
    try {
      const meResponse = await axios.get('http://localhost:8000/api/v1/user/me', { 
        withCredentials: true 
      });
      console.log('   /me response:', meResponse.data);
      console.log('   Current user isAdmin:', meResponse.data.user?.isAdmin);
    } catch (e) {
      console.log('   /me error:', e.response?.data || e.message);
    }
    
    // 4. Check explicit admin check endpoint
    console.log('4. Checking admin status endpoint...');
    try {
      const adminCheckResponse = await axios.get('http://localhost:8000/api/v1/user/check-admin', {
        withCredentials: true
      });
      console.log('   Admin check response:', adminCheckResponse.data);
    } catch (e) {
      console.log('   Admin check error:', e.response?.data || e.message);
    }
    
    // 5. Try admin stats endpoint
    console.log('5. Testing admin stats endpoint...');
    try {
      const statsResponse = await axios.get('http://localhost:8000/api/v1/orders/admin/stats', {
        withCredentials: true
      });
      console.log('   Stats response:', statsResponse.data ? 'Success' : 'No data');
    } catch (e) {
      console.log('   Stats error:', e.response?.data || e.message);
    }
    
    console.log('=== DEBUG COMPLETE ===');
    return 'Debug complete - check console output';
  } catch (e) {
    console.error('Debug utility error:', e);
    return 'Debug error: ' + e.message;
  }
};

export default debugAdmin; 