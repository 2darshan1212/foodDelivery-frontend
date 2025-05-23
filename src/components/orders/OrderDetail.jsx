import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getOrderById, cancelOrder, getOrderStatusHistory } from '../../services/orderService';
import { testApiConnection } from '../../utils/apiTester';
import { 
  Box, 
  Typography, 
  Card, 
  CardContent, 
  Divider, 
  Chip, 
  Button, 
  CircularProgress,
  Grid,
  Paper,
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Alert,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  
  
} from '@mui/material';
import { 
  ArrowBack, 
  LocalShipping, 
  Payment, 
  Receipt, 
  AccessTime,
  EventAvailable,
  CheckCircleOutline,
  CancelOutlined,
  ShoppingBag,
  Restaurant,
  DirectionsBike,
  Info
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'react-toastify';

// Order status steps
const ORDER_STATUSES = [
  { 
    status: 'processing', 
    label: 'Processing',
    description: 'Your order is being processed',
    icon: <ShoppingBag />
  },
  { 
    status: 'confirmed', 
    label: 'Confirmed',
    description: 'Your order has been confirmed',
    icon: <CheckCircleOutline />
  },
  { 
    status: 'preparing', 
    label: 'Preparing',
    description: 'Your order is being prepared',
    icon: <Restaurant />
  },
  { 
    status: 'out_for_delivery', 
    label: 'Out for Delivery',
    description: 'Your order is out for delivery',
    icon: <DirectionsBike />
  },
  { 
    status: 'delivered', 
    label: 'Delivered',
    description: 'Your order has been delivered',
    icon: <EventAvailable />
  }
];

const OrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const [statusHistory, setStatusHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  
  const checkConnection = async () => {
    const result = await testApiConnection();
    setIsConnected(result.success);
    if (!result.success) {
      setError(`Backend API is not reachable: ${result.error}`);
    }
    return result.success;
  };
  
  useEffect(() => {
    const fetchOrderDetails = async () => {
      try {
        setLoading(true);
        
        const connected = await checkConnection();
        if (!connected) {
          setLoading(false);
          return;
        }
        
        const response = await getOrderById(id);
        setOrder(response.order);
        setLoading(false);
      } catch (error) {
        setError(error.message || 'Failed to load order details');
        setLoading(false);
        toast.error(error.message || 'Failed to load order details');
      }
    };
    
    if (id) {
      fetchOrderDetails();
    }
  }, [id]);
  
  // Fetch order status history
  const fetchStatusHistory = async () => {
    try {
      setHistoryLoading(true);
      const response = await getOrderStatusHistory(id);
      setStatusHistory(response.statusHistory || []);
      setHistoryLoading(false);
    } catch (error) {
      toast.error('Failed to load status history');
      setHistoryLoading(false);
    }
  };
  
  // Handle viewing status history
  const handleViewHistory = () => {
    fetchStatusHistory();
    setHistoryDialogOpen(true);
  };
  
  // Handle order cancellation
  const handleCancelOrder = async () => {
    try {
      const connected = await checkConnection();
      if (!connected) {
        toast.error('Cannot connect to the server. Please try again later.');
        setCancelDialogOpen(false);
        return;
      }
      
      await cancelOrder(id);
      // Update local order state
      setOrder(prev => ({
        ...prev,
        status: 'cancelled'
      }));
      toast.success('Order cancelled successfully');
      setCancelDialogOpen(false);
    } catch (error) {
      toast.error(error.message || 'Failed to cancel order');
    }
  };
  
  // Get current status step index
  const getCurrentStatusIndex = () => {
    if (!order) return -1;
    if (order.status === 'cancelled') return -1;
    
    return ORDER_STATUSES.findIndex(statusStep => statusStep.status === order.status);
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
    const date = new Date(dateString);
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString()} (${formatDistanceToNow(date, { addSuffix: true })})`;
  };
  
  // Render order status timeline
  const renderStatusTimeline = () => {
    if (historyLoading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
          <CircularProgress />
        </Box>
      );
    }
    
    if (statusHistory.length === 0) {
      return (
        <Typography variant="body2" color="text.secondary" sx={{ my: 2 }}>
          No detailed status history available.
        </Typography>
      );
    }
    
    return (
      <Timeline position="alternate" sx={{ p: { xs: 0, sm: 1 } }}>
        {statusHistory.map((item, index) => (
          <TimelineItem key={index}>
            <TimelineOppositeContent color="text.secondary">
              {formatDate(item.timestamp)}
            </TimelineOppositeContent>
            <TimelineSeparator>
              <TimelineDot color={getStatusColor(item.status)} />
              {index < statusHistory.length - 1 && <TimelineConnector />}
            </TimelineSeparator>
            <TimelineContent>
              <Typography variant="subtitle1" component="span">
                {item.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </Typography>
              {item.notes && (
                <Typography variant="body2">{item.notes}</Typography>
              )}
            </TimelineContent>
          </TimelineItem>
        ))}
      </Timeline>
    );
  };
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '70vh' }}>
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
        <Button 
          variant="contained" 
          onClick={checkConnection}
          sx={{ mr: 2 }}
        >
          Check Connection
        </Button>
        <Button 
          variant="outlined" 
          onClick={() => navigate('/orders')}
        >
          Go Back to Orders
        </Button>
      </Box>
    );
  }
  
  if (error) {
    return (
      <Box sx={{ textAlign: 'center', py: 5 }}>
        <Typography variant="h5" color="error" gutterBottom>Error loading order</Typography>
        <Typography variant="body1" paragraph>{error}</Typography>
        <Button variant="contained" onClick={() => navigate('/orders')}>
          Go Back to Orders
        </Button>
      </Box>
    );
  }
  
  if (!order) {
    return (
      <Box sx={{ textAlign: 'center', py: 5 }}>
        <Typography variant="h5" gutterBottom>Order not found</Typography>
        <Typography variant="body1" paragraph>
          The order you're looking for doesn't exist or you don't have permission to view it.
        </Typography>
        <Button variant="contained" onClick={() => navigate('/orders')}>
          Go Back to Orders
        </Button>
      </Box>
    );
  }
  
  const activeStep = getCurrentStatusIndex();
  
  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', px: 2, py: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Button 
          startIcon={<ArrowBack />} 
          variant="outlined" 
          onClick={() => navigate('/orders')}
          sx={{ mr: 2 }}
        >
          Back to Orders
        </Button>
        <Typography variant="h5" component="h1" sx={{ flexGrow: 1 }}>
          Order Details
        </Typography>
        <Chip 
          label={order.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
          color={getStatusColor(order.status)}
          sx={{ ml: 2 }}
        />
      </Box>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          {/* Order Status Tracker */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  Order Status
                </Typography>
                <Button 
                  size="small" 
                  endIcon={<Info />}
                  onClick={handleViewHistory}
                >
                  View History
                </Button>
              </Box>
              
              {order.status === 'cancelled' ? (
                <Alert severity="error" icon={<CancelOutlined />} sx={{ mb: 2 }}>
                  This order was cancelled {order.statusHistory?.length > 0 && `${formatDistanceToNow(new Date(order.statusHistory[0].timestamp), { addSuffix: true })}`}
                </Alert>
              ) : (
                <Stepper 
                  activeStep={activeStep} 
                  orientation="vertical" 
                  sx={{ 
                    '& .MuiStepLabel-label': { 
                      fontSize: '1rem', 
                      fontWeight: 500 
                    } 
                  }}
                >
                  {ORDER_STATUSES.map((step, index) => (
                    <Step key={step.status}>
                      <StepLabel
                        StepIconProps={{
                          icon: step.icon,
                        }}
                      >
                        {step.label}
                      </StepLabel>
                      <StepContent>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          {step.description}
                        </Typography>
                        {index === activeStep && order.statusNotes && (
                          <Alert severity="info" sx={{ my: 1 }}>
                            {order.statusNotes}
                          </Alert>
                        )}
                        {index === activeStep && order.estimatedDeliveryTime && (
                          <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                            <AccessTime fontSize="small" sx={{ mr: 1 }} />
                            <Typography variant="body2">
                              Estimated delivery: {formatDate(order.estimatedDeliveryTime)}
                            </Typography>
                          </Box>
                        )}
                      </StepContent>
                    </Step>
                  ))}
                </Stepper>
              )}
            </CardContent>
          </Card>
          
          {/* Order Items */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Order Items
              </Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table>
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
                                sx={{ width: 50, height: 50, objectFit: 'cover', borderRadius: 1, mr: 2 }}
                              />
                            )}
                            <Box>
                              <Typography variant="body1">{item.name}</Typography>
                              {item.options && (
                                <Typography variant="caption" color="text.secondary">
                                  {Object.keys(item.options)
                                    .map(key => `${key}: ${item.options[key]}`)
                                    .join(', ')}
                                </Typography>
                              )}
                            </Box>
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
            </CardContent>
          </Card>
          
          {/* Delivery Information */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Delivery Information
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2">Address</Typography>
                  <Typography variant="body2">
                    {order.deliveryAddress?.street}
                  </Typography>
                  <Typography variant="body2">
                    {order.deliveryAddress?.city}, {order.deliveryAddress?.state} {order.deliveryAddress?.postalCode}
                  </Typography>
                </Grid>
                {order.deliveryAgent && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2">Delivery Agent</Typography>
                    <Typography variant="body2">
                      {order.deliveryAgent.name}
                    </Typography>
                    {order.deliveryAgent.phone && (
                      <Typography variant="body2">
                        Contact: {order.deliveryAgent.phone}
                      </Typography>
                    )}
                  </Grid>
                )}
                {order.deliveryInstructions && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2">Delivery Instructions</Typography>
                    <Typography variant="body2">
                      {order.deliveryInstructions}
                    </Typography>
                  </Grid>
                )}
              </Grid>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={4}>
          {/* Order Summary */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Order Summary
              </Typography>
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="text.secondary">Order ID</Typography>
                <Typography variant="body1">{order._id}</Typography>
              </Box>
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="text.secondary">Order Date</Typography>
                <Typography variant="body1">{formatDate(order.createdAt)}</Typography>
              </Box>
              <Divider sx={{ my: 2 }} />
              <Box sx={{ mb: 1 }}>
                <Grid container>
                  <Grid item xs={6}>
                    <Typography variant="body2">Subtotal</Typography>
                  </Grid>
                  <Grid item xs={6} textAlign="right">
                    <Typography variant="body2">₹{order.subtotal?.toFixed(2) || '0.00'}</Typography>
                  </Grid>
                </Grid>
              </Box>
              {order.tax > 0 && (
                <Box sx={{ mb: 1 }}>
                  <Grid container>
                    <Grid item xs={6}>
                      <Typography variant="body2">Tax</Typography>
                    </Grid>
                    <Grid item xs={6} textAlign="right">
                      <Typography variant="body2">₹{order.tax?.toFixed(2) || '0.00'}</Typography>
                    </Grid>
                  </Grid>
                </Box>
              )}
              {order.deliveryFee > 0 && (
                <Box sx={{ mb: 1 }}>
                  <Grid container>
                    <Grid item xs={6}>
                      <Typography variant="body2">Delivery Fee</Typography>
                    </Grid>
                    <Grid item xs={6} textAlign="right">
                      <Typography variant="body2">₹{order.deliveryFee?.toFixed(2) || '0.00'}</Typography>
                    </Grid>
                  </Grid>
                </Box>
              )}
              {order.discount > 0 && (
                <Box sx={{ mb: 1 }}>
                  <Grid container>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="success.main">Discount</Typography>
                    </Grid>
                    <Grid item xs={6} textAlign="right">
                      <Typography variant="body2" color="success.main">-₹{order.discount?.toFixed(2) || '0.00'}</Typography>
                    </Grid>
                  </Grid>
                </Box>
              )}
              <Divider sx={{ my: 1 }} />
              <Box sx={{ mb: 1 }}>
                <Grid container>
                  <Grid item xs={6}>
                    <Typography variant="subtitle2">Total</Typography>
                  </Grid>
                  <Grid item xs={6} textAlign="right">
                    <Typography variant="subtitle2">₹{order.totalAmount?.toFixed(2) || '0.00'}</Typography>
                  </Grid>
                </Grid>
              </Box>
            </CardContent>
          </Card>
          
          {/* Payment Information */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Payment Information
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Payment sx={{ mr: 1 }} />
                <Typography variant="body1">
                  {order.paymentMethod || 'Unknown payment method'}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2">Status</Typography>
                <Chip 
                  label={order.paymentStatus.charAt(0).toUpperCase() + order.paymentStatus.slice(1)}
                  color={order.paymentStatus === 'paid' ? 'success' : 
                         order.paymentStatus === 'pending' ? 'warning' : 'error'}
                  size="small"
                />
              </Box>
            </CardContent>
          </Card>
          
          {/* Actions */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Actions
              </Typography>
              <Button
                variant="contained"
                color="primary"
                fullWidth
                startIcon={<Receipt />}
                sx={{ mb: 2 }}
                onClick={() => window.print()}
              >
                Print Receipt
              </Button>
              
              {order.status !== 'delivered' && order.status !== 'cancelled' && (
                <Button
                  variant="outlined"
                  color="error"
                  fullWidth
                  onClick={() => setCancelDialogOpen(true)}
                  disabled={['out_for_delivery', 'delivered'].includes(order.status)}
                >
                  Cancel Order
                </Button>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      {/* Cancel Order Confirmation Dialog */}
      <Dialog
        open={cancelDialogOpen}
        onClose={() => setCancelDialogOpen(false)}
      >
        <DialogTitle>Cancel Order</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to cancel this order? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelDialogOpen(false)}>No, Keep Order</Button>
          <Button onClick={handleCancelOrder} color="error" variant="contained">
            Yes, Cancel Order
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Status History Dialog */}
      <Dialog
        open={historyDialogOpen}
        onClose={() => setHistoryDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Order Status History</DialogTitle>
        <DialogContent>
          {renderStatusTimeline()}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHistoryDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default OrderDetail; 