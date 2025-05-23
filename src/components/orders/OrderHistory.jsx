import React, { useEffect, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchOrders } from '../../redux/cartSlice';
import { 
  Box, 
  Typography, 
  Card, 
  CardContent, 
  Grid, 
  Chip, 
  Button, 
  Divider, 
  CircularProgress,
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Paper,
  Alert,
  Badge
} from '@mui/material';
import { formatDistanceToNow } from 'date-fns';
import { cancelOrder, reorderPreviousOrder } from '../../services/orderService';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import NoOrders from './NoOrders';
import { testApiConnection } from '../../utils/apiTester';

const OrderHistory = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { orders = [], orderStatus } = useSelector(state => state.cart);
  const [loadError, setLoadError] = useState(null);
  const [isConnected, setIsConnected] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Subscribe to socket order updates via Redux
  const socketOrderUpdates = useSelector(state => state.socket.orderStatusUpdates || []);
  const socketConnected = useSelector(state => state.socket.connected);
  
  // Track last update timestamp to prevent redundant refreshes
  const [lastUpdateTime, setLastUpdateTime] = useState(0);
  
  // Keep a local copy of orders that can be updated instantly on status changes
  const [localOrders, setLocalOrders] = useState([]);
  
  // Update local orders when Redux orders change
  useEffect(() => {
    if (orders && orders.length > 0) {
      console.log('Updating local orders from Redux state:', orders);
      setLocalOrders(orders);
    }
  }, [orders]);
  
  const checkConnection = async () => {
    const result = await testApiConnection();
    setIsConnected(result.success);
    if (!result.success) {
      setLoadError(`Backend API is not reachable: ${result.error}`);
    }
    return result.success;
  };
  
  // Function to load orders with proper error handling
  const loadOrders = useCallback(async () => {
    try {
      setRefreshing(true);
      const connected = await checkConnection();
      if (!connected) {
        setRefreshing(false);
        return;
      }
      
      console.log('Fetching orders...');
      const result = await dispatch(fetchOrders()).unwrap();
      console.log('Orders fetched successfully:', result);
      setLastUpdateTime(Date.now());
      setLoadError(null);
    } catch (error) {
      console.error('Error fetching orders:', error);
      setLoadError(error.message || 'Failed to load orders');
      toast.error(error.message || 'Failed to load orders');
    } finally {
      setRefreshing(false);
    }
  }, [dispatch]);
  
  // Initial orders fetch
  useEffect(() => {
    loadOrders();
  }, [loadOrders]);
  
  // Listen for order status updates and update local state immediately
  useEffect(() => {
    // Only process if we have socket updates and they are newer than our last fetch
    if (socketOrderUpdates && socketOrderUpdates.length > 0) {
      // Get the latest update
      const latestUpdate = socketOrderUpdates[socketOrderUpdates.length - 1];
      const updateTime = new Date(latestUpdate.timestamp || Date.now()).getTime();
      
      // If this update is newer than our last refresh
      if (updateTime > lastUpdateTime) {
        console.log('Processing order update:', latestUpdate);
        
        // Update the local orders immediately without waiting for a full refresh
        if (latestUpdate.orderId && latestUpdate.status) {
          setLocalOrders(prevOrders => 
            prevOrders.map(order => {
              if (order._id === latestUpdate.orderId) {
                console.log(`Updating local order ${order._id} status from ${order.status} to ${latestUpdate.status}`);
                return {
                  ...order,
                  status: latestUpdate.status,
                  updatedAt: latestUpdate.timestamp || new Date().toISOString()
                };
              }
              return order;
            })
          );
          
          // Show a toast notification about the update
          const formattedStatus = latestUpdate.status.replace(/_/g, ' ').toUpperCase();
          toast.info(`Order status updated to ${formattedStatus}`);
          
          // Also trigger a full refresh from the server to get complete data
          // But do it with a slight delay to prevent over-fetching
          setTimeout(() => {
            console.log('Triggering full order refresh');
            loadOrders();
          }, 2000);
        }
      }
    }
  }, [socketOrderUpdates, lastUpdateTime, loadOrders]);

  // Monitor socket connection status
  useEffect(() => {
    if (socketConnected) {
      console.log('Socket connected - checking for order updates');
      // Refresh orders when socket reconnects to ensure we have latest data
      loadOrders();
    } else {
      console.log('Socket disconnected');
    }
  }, [socketConnected, loadOrders]);
  
  // Function to handle order cancellation
  const handleCancelOrder = async (orderId) => {
    try {
      await cancelOrder(orderId);
      toast.success('Order cancelled successfully');
      
      // Update local state immediately
      setLocalOrders(prevOrders => 
        prevOrders.map(order => {
          if (order._id === orderId) {
            return {
              ...order,
              status: 'cancelled',
              updatedAt: new Date().toISOString()
            };
          }
          return order;
        })
      );
      
      // Then refresh from server
      loadOrders();
    } catch (error) {
      toast.error(error.message || 'Error cancelling order');
    }
  };
  
  // Function to handle reordering
  const handleReorder = async (orderId) => {
    try {
      const response = await reorderPreviousOrder(orderId);
      toast.success('Order placed successfully');
      // Navigate to order detail
      navigate(`/orders/${response.order._id}`);
    } catch (error) {
      toast.error(error.message || 'Error reordering');
    }
  };
  
  // Function to get status chip color
  const getStatusColor = (status) => {
    switch (status) {
      case 'processing':
        return 'warning';
      case 'confirmed':
        return 'info';
      case 'preparing':
        return 'secondary';
      case 'out_for_delivery':
        return 'primary';
      case 'delivered':
        return 'success';
      case 'cancelled':
        return 'error';
      default:
        return 'default';
    }
  };
  
  // Function to format date
  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return `${date.toLocaleDateString()} (${formatDistanceToNow(date, { addSuffix: true })})`;
    } catch (error) {
      console.error('Error formatting date:', error, dateString);
      return 'Invalid date';
    }
  };
  
  // Render loading state
  if (orderStatus === 'loading' && !localOrders.length) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }
  
  // Render connection error state
  if (!isConnected) {
    return (
      <Box sx={{ py: 3 }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom>Backend Service Unavailable</Typography>
          <Typography variant="body2">
            We are unable to connect to the order service. Please try again later.
          </Typography>
        </Alert>
        <Button variant="contained" onClick={checkConnection}>
          Check Connection
        </Button>
      </Box>
    );
  }
  
  // Render error state
  if (loadError && !localOrders.length) {
    return (
      <Box sx={{ py: 3 }}>
        <Alert severity="error" sx={{ mb: 3 }}>{loadError}</Alert>
        <Button variant="contained" onClick={loadOrders}>
          Try Again
        </Button>
      </Box>
    );
  }
  
  // Render no orders
  if (!localOrders || localOrders.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <NoOrders />
      </Box>
    );
  }
  
  console.log('Rendering orders:', localOrders);
  
  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', px: 2, py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <div>
          <Typography variant="h4" gutterBottom>Order History</Typography>
          <Typography variant="body1" color="text.secondary">
            View and manage your orders
          </Typography>
        </div>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          {socketConnected ? (
            <Badge color="success" variant="dot" sx={{ mr: 2 }}>
              <Typography variant="caption">Live updates active</Typography>
            </Badge>
          ) : (
            <Badge color="error" variant="dot" sx={{ mr: 2 }}>
              <Typography variant="caption">Live updates disconnected</Typography>
            </Badge>
          )}
          <Button 
            onClick={loadOrders} 
            variant="outlined" 
            disabled={refreshing}
          >
            {refreshing ? <CircularProgress size={24} /> : 'Refresh'}
          </Button>
        </Box>
      </Box>
      
      {loadError && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          {loadError} <Button size="small" onClick={loadOrders}>Retry</Button>
        </Alert>
      )}
      
      <Grid container spacing={3}>
        {localOrders.map((order) => (
          <Grid item xs={12} key={order._id}>
            <Card 
              sx={{ 
                mb: 2, 
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                transition: 'transform 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                }
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box>
                    <Typography variant="h6">Order #{order._id.substring(order._id.length - 6)}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {formatDate(order.createdAt)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Last updated: {formatDate(order.updatedAt || order.createdAt)}
                    </Typography>
                  </Box>
                  <Box>
                    <Chip 
                      label={order.status.replace(/_/g, ' ').toUpperCase()} 
                      color={getStatusColor(order.status)} 
                      variant="filled" 
                      sx={{ fontWeight: 'bold' }}
                    />
                  </Box>
                </Box>
                
                <Divider sx={{ my: 2 }} />
                
                <TableContainer component={Paper} elevation={0} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Item</TableCell>
                        <TableCell align="right">Quantity</TableCell>
                        <TableCell align="right">Price</TableCell>
                        <TableCell align="right">Total</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {order.items.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              {item.image && (
                                <Box
                                  component="img"
                                  src={item.image}
                                  alt={item.name}
                                  sx={{ width: 40, height: 40, borderRadius: 1, mr: 1, objectFit: 'cover' }}
                                />
                              )}
                              <Typography variant="body2">{item.name}</Typography>
                            </Box>
                          </TableCell>
                          <TableCell align="right">{item.quantity}</TableCell>
                          <TableCell align="right">₹{item.price.toFixed(2)}</TableCell>
                          <TableCell align="right">₹{(item.price * item.quantity).toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3, flexWrap: 'wrap' }}>
                  <Box sx={{ mb: 2, minWidth: '40%' }}>
                    <Typography variant="subtitle2">Delivery Details</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {order.deliveryAddress}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Contact: {order.contactNumber}
                    </Typography>
                    {order.deliveryInstructions && (
                      <Typography variant="body2" color="text.secondary">
                        Instructions: {order.deliveryInstructions}
                      </Typography>
                    )}
                  </Box>
                  
                  <Box sx={{ mb: 2, minWidth: '30%' }}>
                    <Typography variant="subtitle2">Order Summary</Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                      <Typography variant="body2" color="text.secondary">Subtotal:</Typography>
                      <Typography variant="body2">₹{order.subtotal.toFixed(2)}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">Tax:</Typography>
                      <Typography variant="body2">₹{order.tax.toFixed(2)}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">Delivery Fee:</Typography>
                      <Typography variant="body2">₹{order.deliveryFee.toFixed(2)}</Typography>
                    </Box>
                    {order.discount > 0 && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">Discount:</Typography>
                        <Typography variant="body2" color="error">-₹{order.discount.toFixed(2)}</Typography>
                      </Box>
                    )}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                      <Typography variant="subtitle2">Total:</Typography>
                      <Typography variant="subtitle2" color="primary">
                        ₹{(order.total || order.totalAmount).toFixed(2)}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
                
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2, gap: 2 }}>
                  {order.status !== 'cancelled' && order.status !== 'delivered' && (
                    <Button 
                      variant="outlined" 
                      color="error"
                      onClick={() => handleCancelOrder(order._id)}
                    >
                      Cancel Order
                    </Button>
                  )}
                  <Button 
                    variant="contained" 
                    color="primary"
                    onClick={() => handleReorder(order._id)}
                  >
                    Reorder
                  </Button>
                  <Button 
                    variant="outlined" 
                    color="primary"
                    onClick={() => navigate(`/orders/${order._id}`)}
                  >
                    View Details
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default OrderHistory; 