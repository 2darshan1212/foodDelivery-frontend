import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchAllOrders, updateOrderStatus, fetchDeliveryStatusHistory, assignDeliveryAgent, resetAssignAgentStatus, resetStatusHistory } from '../../redux/adminSlice';
import { syncOrderStatus } from '../../redux/cartSlice';
import { toast } from 'react-toastify';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  CircularProgress,
  Alert,
  Tooltip,
  Drawer,
  Divider,
  Grid,
  Card,
  CardContent,
  Collapse,
  Container,
  InputAdornment,
  Stack
} from '@mui/material';
import {
  Edit,
  Visibility,
  FilterList,
  Search,
  Refresh,
  Close,
  Timeline,
  Person,
  DirectionsBike
} from '@mui/icons-material';

// Utility function to normalize order data
const mapOrderData = (order) => {
  if (!order) return null;
  
  return {
    _id: order._id || 'unknown-id',
    createdAt: order.createdAt || new Date().toISOString(),
    updatedAt: order.updatedAt || new Date().toISOString(),
    items: Array.isArray(order.items) ? order.items : [],
    status: order.status || 'processing',
    paymentStatus: order.paymentStatus || 'pending',
    paymentMethod: order.paymentMethod || 'cash',
    totalAmount: order.totalAmount || order.total || 0,
    subtotal: order.subtotal || 0,
    tax: order.tax || 0,
    deliveryFee: order.deliveryFee || 0,
    discount: order.discount || 0,
    deliveryAddress: order.deliveryAddress || 'No address provided',
    contactNumber: order.contactNumber || 'No contact provided',
    deliveryInstructions: order.deliveryInstructions || '',
    notes: order.notes || '',
    user: {
      name: order.user?.name || order.user?.username || 'Unknown Customer',
      email: order.user?.email || 'No email',
      phone: order.user?.phone || order.contactNumber || 'No phone'
    },
    deliveryAgent: order.deliveryAgent || null
  };
};

// Status color mapping
const STATUS_COLORS = {
  processing: 'primary',
  confirmed: 'warning',
  preparing: 'info',
  out_for_delivery: 'secondary',
  delivered: 'success',
  cancelled: 'error'
};

// Status descriptions for users
const STATUS_DESCRIPTIONS = {
  processing: 'Your order is being processed',
  confirmed: 'Your order has been confirmed',
  preparing: 'Your order is being prepared',
  out_for_delivery: 'Your order is out for delivery',
  delivered: 'Your order has been delivered',
  cancelled: 'Your order has been cancelled'
};

// Payment status color mapping
const PAYMENT_STATUS_COLORS = {
  pending: 'warning',
  paid: 'success',
  failed: 'error',
  refunded: 'secondary'
};

// Format currency
const formatCurrency = (amount) => {
  // Handle undefined, null, NaN, or non-numeric values
  if (amount === undefined || amount === null || isNaN(parseFloat(amount))) {
    amount = 0;
  }
  
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  } catch (error) {
    console.error('Error formatting currency:', error);
    return '₹0';
  }
};

// Format date
const formatDate = (dateString) => {
  if (!dateString) {
    return 'Unknown date';
  }
  
  try {
    const date = new Date(dateString);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }
    
    const options = { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    
    return date.toLocaleDateString(undefined, options);
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid date';
  }
};

const OrdersManagement = () => {
  const dispatch = useDispatch();
  const { data: orders, pagination, status, error } = useSelector((state) => state.admin.orders);
  const updateStatus = useSelector((state) => state.admin.updateStatus);
  const statusHistory = useSelector((state) => state.admin.deliveryStatusHistory);
  const assignAgentStatus = useSelector((state) => state.admin.assignAgent);
  
  // State for filters
  const [filters, setFilters] = useState({
    status: 'all',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });
  
  // State for pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // State for order detail drawer
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  
  // State for status update dialog
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [statusUpdateData, setStatusUpdateData] = useState({
    orderId: '',
    status: '',
    paymentStatus: '',
    deliveryNotes: ''
  });
  
  // State for filter drawer
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  
  // State for search
  const [searchTerm, setSearchTerm] = useState('');
  
  // State for delivery agent dialog
  const [agentDialogOpen, setAgentDialogOpen] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [availableAgents, setAvailableAgents] = useState([
    { id: 'agent1', name: 'John Doe' },
    { id: 'agent2', name: 'Jane Smith' },
    { id: 'agent3', name: 'Mike Johnson' }
  ]);
  
  // State for status history dialog
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  
  // Fetch orders on component mount and when filters/pagination change
  useEffect(() => {
    dispatch(fetchAllOrders({
      page: page + 1,
      limit: rowsPerPage,
      ...filters,
      search: searchTerm
    }));
  }, [dispatch, page, rowsPerPage, filters, searchTerm]);
  
  // Handle page change
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };
  
  // Handle rows per page change
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };
  
  // Handle filter change
  const handleFilterChange = (filterName, value) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: value
    }));
    setPage(0);
  };
  
  // Reset filters
  const handleResetFilters = () => {
    setFilters({
      status: 'all',
      sortBy: 'createdAt',
      sortOrder: 'desc'
    });
    setSearchTerm('');
    setPage(0);
  };
  
  // Open order details drawer
  const handleViewDetails = (order) => {
    const normalizedOrder = mapOrderData(order);
    setSelectedOrder(normalizedOrder);
    setDetailsOpen(true);
  };
  
  // Open status update dialog
  const handleOpenStatusDialog = (order) => {
    setStatusUpdateData({
      orderId: order._id,
      status: order.status || 'processing',
      paymentStatus: order.paymentStatus || 'pending',
      deliveryNotes: ''
    });
    setStatusDialogOpen(true);
  };
  
  // Open status history dialog
  const handleOpenHistoryDialog = (orderId) => {
    if (!orderId) {
      console.error('No order ID provided to fetch status history');
      return;
    }
    
    try {
      dispatch(fetchDeliveryStatusHistory(orderId));
      setHistoryDialogOpen(true);
    } catch (error) {
      console.error('Error opening history dialog:', error);
    }
  };
  
  // Open agent assignment dialog
  const handleOpenAgentDialog = (order) => {
    setStatusUpdateData({
      orderId: order._id,
      status: order.status,
      paymentStatus: order.paymentStatus
    });
    setAgentDialogOpen(true);
  };
  
  // Handle agent assignment
  const handleAssignAgent = () => {
    dispatch(assignDeliveryAgent({
      orderId: statusUpdateData.orderId,
      agentId: selectedAgentId
    }))
      .unwrap()
      .then(() => {
        setAgentDialogOpen(false);
        setSelectedAgentId('');
      })
      .catch(error => {
        console.error('Error assigning delivery agent:', error);
      });
  };
  
  // Handle status update
  const handleStatusUpdate = () => {
    // Validation
    if (!statusUpdateData.orderId || !statusUpdateData.status) {
      toast.error("Order ID and status are required");
      return;
    }
    
    // Dispatch update status action
    dispatch(updateOrderStatus(statusUpdateData))
      .unwrap()
      .then((result) => {
        if (result.success) {
          toast.success("Order status updated successfully");
          
          // IMPORTANT: Synchronize the order status in the cart slice for user's order history
          dispatch(syncOrderStatus({
            orderId: statusUpdateData.orderId,
            status: statusUpdateData.status,
            paymentStatus: statusUpdateData.paymentStatus
          }));
          
          // Close dialog and refresh orders
          setStatusDialogOpen(false);
          handleRefresh();
        }
      })
      .catch((error) => {
        toast.error(error.message || "Failed to update order status");
      });
  };
  
  // Refresh orders
  const handleRefresh = () => {
    dispatch(fetchAllOrders({
      page: page + 1,
      limit: rowsPerPage,
      ...filters
    }));
  };
  
  // Handle search term change
  const handleSearch = (event) => {
    const value = event.target.value;
    setSearchTerm(value);
    // Reset to first page when searching
    setPage(0);
  };
  
  // Render delivery status timeline
  const renderStatusTimeline = () => {
    // Check if statusHistory is undefined
    if (!statusHistory) {
      return (
        <Typography variant="body2" color="text.secondary" sx={{ my: 2 }}>
          Status history information not available.
        </Typography>
      );
    }

    // Check loading state
    if (statusHistory.status === 'loading') {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
          <CircularProgress size={24} />
        </Box>
      );
    }
    
    // Check error state
    if (statusHistory.status === 'failed') {
      return (
        <Alert severity="error" sx={{ my: 2 }}>
          {statusHistory.error || 'Failed to load status history'}
        </Alert>
      );
    }
    
    // Check for empty data
    if (!statusHistory.data || statusHistory.data.length === 0) {
      return (
        <Typography variant="body2" color="text.secondary" sx={{ my: 2 }}>
          No status history available.
        </Typography>
      );
    }
    
    // Helper function for status color
    const getStatusColor = (status) => {
      return STATUS_COLORS[status] || 'default';
    };
    
    // Render timeline
    return (
      <Box sx={{ maxHeight: '400px', overflowY: 'auto', px: 2 }}>
        {statusHistory.data.map((item, index) => (
          <Box key={index} sx={{ 
            display: 'flex', 
            mb: 2,
            pb: 2,
            position: 'relative',
            '&:not(:last-child)::after': {
              content: '""',
              position: 'absolute',
              left: '10px',
              top: '24px',
              bottom: '0',
              width: '2px',
              backgroundColor: 'divider'
            }
          }}>
            <Chip
              label={item.status ? item.status.charAt(0).toUpperCase() : '?'}
              color={item.status ? getStatusColor(item.status) : 'default'}
              size="small"
              sx={{ 
                mr: 2, 
                height: '24px', 
                width: '24px', 
                borderRadius: '50%',
                zIndex: 1
              }}
            />
            <Box>
              <Typography variant="subtitle2">
                {item.status 
                  ? item.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
                  : 'Unknown Status'
                }
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {item.timestamp ? formatDate(item.timestamp) : 'Unknown time'}
              </Typography>
              {item.notes && (
                <Typography variant="body2" sx={{ mt: 0.5 }}>
                  {item.notes}
                </Typography>
              )}
            </Box>
          </Box>
        ))}
      </Box>
    );
  };
  
  // Render order status chips
  const renderStatusChip = (status) => (
    <Chip 
      label={status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
      color={STATUS_COLORS[status] || 'default'}
      size="small"
    />
  );
  
  // Render payment status chips
  const renderPaymentStatusChip = (status) => (
    <Chip 
      label={status.charAt(0).toUpperCase() + status.slice(1)}
      color={PAYMENT_STATUS_COLORS[status] || 'default'}
      size="small"
      variant="outlined"
    />
  );
  
  // Render order detail component
  const renderOrderDetails = (order) => {
    if (!order) return null;

    return (
      <>
        <Typography variant="subtitle1" gutterBottom>
          Order #{order._id.substring(0, 8)}...
        </Typography>
        
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Placed on {formatDate(order.createdAt)}
          </Typography>
        </Box>
        
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={6}>
            <Typography variant="subtitle2">Status</Typography>
            {renderStatusChip(order.status)}
          </Grid>
          <Grid item xs={6}>
            <Typography variant="subtitle2">Payment</Typography>
            {renderPaymentStatusChip(order.paymentStatus)}
          </Grid>
        </Grid>
        
        <Typography variant="subtitle2" gutterBottom>
          Customer Information
        </Typography>
        <Box sx={{ mb: 3 }}>
          <Typography variant="body2">
            Name: {order.user?.name || 'Unknown'}
          </Typography>
          <Typography variant="body2">
            Email: {order.user?.email || 'No email provided'}
          </Typography>
          <Typography variant="body2">
            Phone: {order.user?.phone || order.contactNumber || 'No phone provided'}
          </Typography>
        </Box>
        
        <Typography variant="subtitle2" gutterBottom>
          Delivery Address
        </Typography>
        <Box sx={{ mb: 3 }}>
          <Typography variant="body2">
            {typeof order.deliveryAddress === 'string' ? order.deliveryAddress : 'No address provided'}
          </Typography>
        </Box>
        
        <Typography variant="subtitle2" gutterBottom>
          Order Items
        </Typography>
        <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Item</TableCell>
                <TableCell align="right">Quantity</TableCell>
                <TableCell align="right">Price</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {Array.isArray(order.items) && order.items.map((item, index) => (
                <TableRow key={index}>
                  <TableCell>{item.name || (item.productId && (typeof item.productId === 'object' ? item.productId.caption : item.productId)) || 'Unknown product'}</TableCell>
                  <TableCell align="right">{item.quantity || 1}</TableCell>
                  <TableCell align="right">
                    {formatCurrency((item.price || 0) * (item.quantity || 1))}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell colSpan={2} align="right">
                  <Typography variant="subtitle2">
                    Subtotal
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  {formatCurrency(order.subtotal || 0)}
                </TableCell>
              </TableRow>
              {(order.tax > 0) && (
                <TableRow>
                  <TableCell colSpan={2} align="right">
                    <Typography variant="body2">
                      Tax
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    {formatCurrency(order.tax || 0)}
                  </TableCell>
                </TableRow>
              )}
              {(order.deliveryFee > 0) && (
                <TableRow>
                  <TableCell colSpan={2} align="right">
                    <Typography variant="body2">
                      Delivery Fee
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    {formatCurrency(order.deliveryFee || 0)}
                  </TableCell>
                </TableRow>
              )}
              <TableRow>
                <TableCell colSpan={2} align="right">
                  <Typography variant="subtitle2">
                    Total
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="subtitle2">
                    {formatCurrency(order.totalAmount || order.total || 0)}
                  </Typography>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
        
        {order.deliveryAgent && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              Delivery Agent
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Person sx={{ mr: 1 }} />
              <Typography variant="body2">
                {order.deliveryAgent.name || 'Unknown Agent'}
              </Typography>
            </Box>
          </Box>
        )}
        
        {order.notes && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              Order Notes
            </Typography>
            <Typography variant="body2">
              {order.notes}
            </Typography>
          </Box>
        )}
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
          <Button 
            variant="outlined" 
            onClick={() => handleOpenStatusDialog(order)}
          >
            Update Status
          </Button>
          <Button 
            variant="outlined" 
            onClick={() => handleOpenHistoryDialog(order._id)}
          >
            View History
          </Button>
        </Box>
      </>
    );
  };
  
  return (
    <Container maxWidth="xl" sx={{ mt: 3, mb: 5 }}>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h5" component="h1" gutterBottom>
          Order Management
        </Typography>
        
        {/* Search and filter controls */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              placeholder="Search by order ID or customer name"
              value={searchTerm}
              onChange={handleSearch}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
                endAdornment: searchTerm ? (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      aria-label="clear search"
                      onClick={() => {
                        setSearchTerm('');
                        setPage(0);
                      }}
                    >
                      <Close fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ) : null
              }}
              size="small"
            />
          </Grid>
          <Grid item xs={6} md={2}>
            <Button 
              variant="outlined" 
              fullWidth
              startIcon={<FilterList />}
              onClick={() => setFilterDrawerOpen(true)}
            >
              Filters
            </Button>
          </Grid>
          <Grid item xs={6} md={2}>
            <Button 
              variant="outlined" 
              fullWidth
              startIcon={<Refresh />}
              onClick={handleRefresh}
            >
              Refresh
            </Button>
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select
                value={filters.status}
                label="Status"
                onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                <MenuItem value="all">All Statuses</MenuItem>
                <MenuItem value="processing">Processing</MenuItem>
                <MenuItem value="confirmed">Confirmed</MenuItem>
                <MenuItem value="preparing">Preparing</MenuItem>
                <MenuItem value="out_for_delivery">Out for Delivery</MenuItem>
                <MenuItem value="delivered">Delivered</MenuItem>
                <MenuItem value="cancelled">Cancelled</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
        
        {/* Orders table */}
        {status && status === 'loading' ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress />
          </Box>
        ) : status && status === 'failed' ? (
          <Alert severity="error" sx={{ my: 2 }}>
            {error}
          </Alert>
        ) : (
          <>
            <TableContainer>
              <Table sx={{ minWidth: 700 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>Order ID</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Customer</TableCell>
                    <TableCell>Items</TableCell>
                    <TableCell>Total</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Payment</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {orders && orders.length > 0 ? (
                    orders.map((order) => {
                      const normalizedOrder = mapOrderData(order);
                      return (
                        <TableRow key={normalizedOrder._id}>
                          <TableCell>{normalizedOrder._id.substring(0, 8)}...</TableCell>
                          <TableCell>{formatDate(normalizedOrder.createdAt)}</TableCell>
                          <TableCell>{normalizedOrder.user?.name || 'Unknown'}</TableCell>
                          <TableCell>{normalizedOrder.items?.length || 0} items</TableCell>
                          <TableCell>{formatCurrency(normalizedOrder.totalAmount)}</TableCell>
                          <TableCell>{renderStatusChip(normalizedOrder.status)}</TableCell>
                          <TableCell>{renderPaymentStatusChip(normalizedOrder.paymentStatus)}</TableCell>
                          <TableCell>
                            <Stack direction="row" spacing={1} justifyContent="center">
                              <Tooltip title="View Details">
                                <IconButton 
                                  size="small" 
                                  onClick={() => handleViewDetails(order)}
                                >
                                  <Visibility fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Update Status">
                                <IconButton 
                                  size="small" 
                                  onClick={() => handleOpenStatusDialog(order)}
                                >
                                  <Edit fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Status History">
                                <IconButton 
                                  size="small" 
                                  onClick={() => handleOpenHistoryDialog(normalizedOrder._id)}
                                >
                                  <Timeline fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Assign Delivery Agent">
                                <IconButton 
                                  size="small" 
                                  onClick={() => handleOpenAgentDialog(order)}
                                  disabled={normalizedOrder.status === 'delivered' || normalizedOrder.status === 'cancelled'}
                                >
                                  <DirectionsBike fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} align="center">
                        <Typography variant="body1" sx={{ py: 3 }}>
                          No orders found
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              count={pagination.totalOrders || 0}
              page={page}
              onPageChange={handleChangePage}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              rowsPerPageOptions={[5, 10, 25, 50]}
            />
          </>
        )}
      </Paper>
      
      {/* Order details drawer */}
      <Drawer
        anchor="right"
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        sx={{
          '& .MuiDrawer-paper': { width: { xs: '100%', sm: 500 } }
        }}
      >
        <Box sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Order Details</Typography>
            <IconButton onClick={() => setDetailsOpen(false)}>
              <Close />
            </IconButton>
          </Box>
          <Divider sx={{ mb: 2 }} />
          
          {selectedOrder ? renderOrderDetails(selectedOrder) : (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
              <CircularProgress />
            </Box>
          )}
        </Box>
      </Drawer>
      
      {/* Status update dialog */}
      <Dialog 
        open={statusDialogOpen} 
        onClose={() => setStatusDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Update Order Status</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2, mb: 2 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={statusUpdateData.status}
              label="Status"
              onChange={(e) => setStatusUpdateData(prev => ({
                ...prev,
                status: e.target.value
              }))}
            >
              <MenuItem value="processing">Processing</MenuItem>
              <MenuItem value="confirmed">Confirmed</MenuItem>
              <MenuItem value="preparing">Preparing</MenuItem>
              <MenuItem value="out_for_delivery">Out for Delivery</MenuItem>
              <MenuItem value="delivered">Delivered</MenuItem>
              <MenuItem value="cancelled">Cancelled</MenuItem>
            </Select>
          </FormControl>
          
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Payment Status</InputLabel>
            <Select
              value={statusUpdateData.paymentStatus}
              label="Payment Status"
              onChange={(e) => setStatusUpdateData(prev => ({
                ...prev,
                paymentStatus: e.target.value
              }))}
            >
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="paid">Paid</MenuItem>
              <MenuItem value="failed">Failed</MenuItem>
              <MenuItem value="refunded">Refunded</MenuItem>
            </Select>
          </FormControl>
          
          <TextField
            fullWidth
            label="Delivery Notes"
            multiline
            rows={3}
            value={statusUpdateData.deliveryNotes || ''}
            onChange={(e) => setStatusUpdateData(prev => ({
              ...prev,
              deliveryNotes: e.target.value
            }))}
            placeholder="Add notes about this status update (visible to customer)"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStatusDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleStatusUpdate} 
            variant="contained"
            disabled={updateStatus && updateStatus.status === 'loading'}
          >
            {updateStatus && updateStatus.status === 'loading' ? <CircularProgress size={24} /> : 'Update'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Status history dialog */}
      <Dialog
        open={historyDialogOpen}
        onClose={() => {
          setHistoryDialogOpen(false);
          // Clear status history on close to avoid keeping stale data
          if (statusHistory) {
            dispatch(resetStatusHistory());
          }
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Order Status History</DialogTitle>
        <DialogContent>
          {renderStatusTimeline()}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setHistoryDialogOpen(false);
            dispatch(resetStatusHistory());
          }}>Close</Button>
        </DialogActions>
      </Dialog>
      
      {/* Assign delivery agent dialog */}
      <Dialog
        open={agentDialogOpen}
        onClose={() => {
          setAgentDialogOpen(false);
          setSelectedAgentId('');
        }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Assign Delivery Agent</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Delivery Agent</InputLabel>
            <Select
              value={selectedAgentId}
              label="Delivery Agent"
              onChange={(e) => setSelectedAgentId(e.target.value)}
            >
              {availableAgents.map(agent => (
                <MenuItem key={agent.id} value={agent.id}>
                  {agent.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setAgentDialogOpen(false);
            setSelectedAgentId('');
          }}>Cancel</Button>
          <Button 
            onClick={handleAssignAgent} 
            variant="contained"
            disabled={!selectedAgentId || (assignAgentStatus && assignAgentStatus.status === 'loading')}
          >
            {assignAgentStatus && assignAgentStatus.status === 'loading' ? <CircularProgress size={24} /> : 'Assign'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Filter drawer */}
      <Drawer
        anchor="right"
        open={filterDrawerOpen}
        onClose={() => setFilterDrawerOpen(false)}
        sx={{
          '& .MuiDrawer-paper': { width: { xs: '100%', sm: 350 } }
        }}
      >
        <Box sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Filters</Typography>
            <IconButton onClick={() => setFilterDrawerOpen(false)}>
              <Close />
            </IconButton>
          </Box>
          <Divider sx={{ mb: 3 }} />
          
          <Typography variant="subtitle2" gutterBottom>
            Order Status
          </Typography>
          <FormControl fullWidth sx={{ mb: 3 }}>
            <Select
              value={filters.status}
              displayEmpty
              onChange={(e) => handleFilterChange('status', e.target.value)}
              size="small"
            >
              <MenuItem value="all">All Statuses</MenuItem>
              <MenuItem value="processing">Processing</MenuItem>
              <MenuItem value="confirmed">Confirmed</MenuItem>
              <MenuItem value="preparing">Preparing</MenuItem>
              <MenuItem value="out_for_delivery">Out for Delivery</MenuItem>
              <MenuItem value="delivered">Delivered</MenuItem>
              <MenuItem value="cancelled">Cancelled</MenuItem>
            </Select>
          </FormControl>
          
          <Typography variant="subtitle2" gutterBottom>
            Sort By
          </Typography>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <Select
              value={filters.sortBy}
              displayEmpty
              onChange={(e) => handleFilterChange('sortBy', e.target.value)}
              size="small"
            >
              <MenuItem value="createdAt">Order Date</MenuItem>
              <MenuItem value="totalAmount">Total Amount</MenuItem>
            </Select>
          </FormControl>
          
          <FormControl fullWidth sx={{ mb: 3 }}>
            <Select
              value={filters.sortOrder}
              displayEmpty
              onChange={(e) => handleFilterChange('sortOrder', e.target.value)}
              size="small"
            >
              <MenuItem value="desc">Newest First</MenuItem>
              <MenuItem value="asc">Oldest First</MenuItem>
            </Select>
          </FormControl>
          
          <Box sx={{ mt: 4, display: 'flex', justifyContent: 'space-between' }}>
            <Button 
              variant="outlined" 
              onClick={handleResetFilters}
            >
              Reset Filters
            </Button>
            <Button 
              variant="contained" 
              onClick={() => setFilterDrawerOpen(false)}
            >
              Apply Filters
            </Button>
          </Box>
        </Box>
      </Drawer>
    </Container>
  );
};

export default OrdersManagement; 