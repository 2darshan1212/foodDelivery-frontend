import React from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';
import { Receipt, ShoppingCart } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const NoOrders = () => {
  const navigate = useNavigate();
  
  return (
    <Paper 
      elevation={0} 
      sx={{ 
        py: 6, 
        px: 4, 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center',
        textAlign: 'center',
        borderRadius: 2,
        backgroundColor: 'rgba(245, 245, 245, 0.8)',
        border: '1px dashed #ccc'
      }}
    >
      <Receipt sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
      
      <Typography variant="h5" gutterBottom>
        No Orders Yet
      </Typography>
      
      <Typography variant="body1" color="text.secondary" paragraph sx={{ maxWidth: 500 }}>
        You haven't placed any orders yet. Browse our delicious food items and place your first order!
      </Typography>
      
      <Button 
        variant="contained" 
        color="primary" 
        size="large"
        onClick={() => navigate('/')}
        startIcon={<ShoppingCart />}
        sx={{ mt: 2 }}
      >
        Browse Food
      </Button>
    </Paper>
  );
};

export default NoOrders; 