import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import OrderHistory from './OrderHistory';
import OrderDetail from './OrderDetail';
import { Box, Container, Typography } from '@mui/material';

const OrdersPage = () => {
  const { user } = useSelector(state => state.auth);
  const location = useLocation();
  
  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 3 }}>
        <Routes>
          <Route path="/" element={<OrderHistory />} />
          <Route path="/:id" element={<OrderDetail />} />
        </Routes>
      </Box>
    </Container>
  );
};

export default OrdersPage; 