import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import axios from 'axios';
import { Box, Button, Typography, Paper, Alert, CircularProgress, Divider } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { setAuthUser } from '../redux/authSlice';
import debugAdmin from '../utils/debugAdmin';

const AdminCheck = () => {
  const { user } = useSelector(state => state.auth);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const runAdminCheck = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Run the debug utility
      await debugAdmin();
      
      // Check /me endpoint
      const meResponse = await axios.get('http://localhost:8000/api/v1/user/me', {
        withCredentials: true
      });
      
      // Check admin status endpoint
      const adminCheckResponse = await axios.get('http://localhost:8000/api/v1/user/check-admin', {
        withCredentials: true
      });
      
      // Set results
      setResults({
        meEndpoint: meResponse.data,
        adminCheckEndpoint: adminCheckResponse.data
      });
      
      // Update user in Redux if needed
      if (meResponse.data.user?.isAdmin && (!user?.isAdmin)) {
        console.log('Updating user in Redux with admin status');
        dispatch(setAuthUser({
          ...user,
          isAdmin: true
        }));
      }
    } catch (err) {
      console.error('Admin check error:', err);
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const fixAdminStatus = async () => {
    try {
      setLoading(true);
      
      // Force update the user with admin status
      if (user) {
        dispatch(setAuthUser({
          ...user,
          isAdmin: true
        }));
        
        // Verify the change worked
        await runAdminCheck();
      }
    } catch (err) {
      console.error('Fix admin error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>Admin Access Check</Typography>
        
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6">Current User:</Typography>
          <pre style={{ background: '#f5f5f5', padding: 10, borderRadius: 4, overflow: 'auto' }}>
            {JSON.stringify(user, null, 2)}
          </pre>
        </Box>
        
        <Divider sx={{ my: 2 }} />
        
        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <Button 
            variant="contained" 
            onClick={runAdminCheck}
            disabled={loading}
          >
            Run Admin Check
          </Button>
          
          <Button 
            variant="outlined" 
            onClick={fixAdminStatus}
            disabled={loading || !user}
          >
            Fix Admin Status
          </Button>
          
          <Button 
            variant="outlined" 
            color="secondary"
            onClick={() => navigate('/admin/dashboard')}
          >
            Go to Admin Dashboard
          </Button>
        </Box>
        
        {loading && (
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <CircularProgress size={24} sx={{ mr: 1 }} />
            <Typography>Checking admin access...</Typography>
          </Box>
        )}
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        {results && (
          <Box>
            <Typography variant="h6">Results:</Typography>
            
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle1">/me Endpoint:</Typography>
              <pre style={{ background: '#f5f5f5', padding: 10, borderRadius: 4, overflow: 'auto' }}>
                {JSON.stringify(results.meEndpoint, null, 2)}
              </pre>
            </Box>
            
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle1">/check-admin Endpoint:</Typography>
              <pre style={{ background: '#f5f5f5', padding: 10, borderRadius: 4, overflow: 'auto' }}>
                {JSON.stringify(results.adminCheckEndpoint, null, 2)}
              </pre>
            </Box>
            
            <Alert 
              severity={
                results.meEndpoint?.user?.isAdmin && results.adminCheckEndpoint?.isAdmin 
                  ? "success" 
                  : "warning"
              }
              sx={{ mt: 2 }}
            >
              {results.meEndpoint?.user?.isAdmin && results.adminCheckEndpoint?.isAdmin 
                ? "Admin status confirmed! You should be able to access the admin panel." 
                : "Admin status mismatch or not confirmed. Check the results above."}
            </Alert>
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default AdminCheck; 