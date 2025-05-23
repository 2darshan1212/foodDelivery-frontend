import React, { useEffect, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchOrderStats } from '../../redux/adminSlice';
import {
  Card,
  CardContent,
  Typography,
  Grid,
  Box,
  CircularProgress,
  Alert,
  Paper,
  Chip,
  Divider,
  Button,
  Container
} from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  AttachMoney,
  LocalShipping,
  Assignment,
  CheckCircle,
  Cancel,
  Refresh,
  TrendingUp
} from '@mui/icons-material';

// Define colors for status
const STATUS_COLORS = {
  processing: '#1976d2', // Blue
  confirmed: '#ff9800', // Orange
  preparing: '#2196f3', // Light Blue
  out_for_delivery: '#673ab7', // Deep Purple
  delivered: '#4caf50', // Green
  cancelled: '#f44336' // Red
};

// Define colors for payment status
const PAYMENT_COLORS = {
  pending: '#ff9800', // Orange
  paid: '#4caf50', // Green
  failed: '#f44336', // Red
  refunded: '#9c27b0' // Purple
};

// Format currency
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

const AdminDashboard = () => {
  const dispatch = useDispatch();
  const { data: stats, status, error } = useSelector((state) => state.admin.stats);
  const [refreshing, setRefreshing] = useState(false);
  const authState = useSelector((state) => state.auth);

  useEffect(() => {
    console.log('AdminDashboard - Fetching order stats');
    console.log('Current auth state:', authState);
    dispatch(fetchOrderStats())
      .unwrap()
      .then(response => {
        console.log('Order stats fetched successfully:', response);
      })
      .catch(error => {
        console.error('Error fetching order stats:', error);
      });
  }, [dispatch, authState]);

  const handleRefresh = () => {
    setRefreshing(true);
    dispatch(fetchOrderStats())
      .finally(() => {
        setTimeout(() => setRefreshing(false), 1000);
      });
  };

  // Prepare data for status pie chart
  const prepareStatusChartData = () => {
    if (!stats || !stats.byStatus) return [];
    
    return Object.entries(stats.byStatus).map(([status, data]) => ({
      name: status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' '),
      value: data.count,
      color: STATUS_COLORS[status] || '#999'
    }));
  };

  // Prepare data for payment status pie chart
  const preparePaymentChartData = () => {
    if (!stats || !stats.byPaymentStatus) return [];
    
    return Object.entries(stats.byPaymentStatus).map(([status, data]) => ({
      name: status.charAt(0).toUpperCase() + status.slice(1),
      value: data.count,
      color: PAYMENT_COLORS[status] || '#999'
    }));
  };

  // Prepare data for daily orders bar chart
  const prepareDailyOrdersChartData = () => {
    if (!stats || !stats.dailyOrders) return [];
    
    return stats.dailyOrders.map(item => ({
      date: item._id,
      Orders: item.count,
      Revenue: item.revenue
    }));
  };

  if (status === 'loading' && !stats) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (status === 'failed') {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        Error loading dashboard: {error}
      </Alert>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom fontWeight="bold">
          Admin Dashboard
        </Typography>
        <Button 
          variant="outlined" 
          startIcon={refreshing ? <CircularProgress size={20} /> : <Refresh />}
          onClick={handleRefresh}
          disabled={refreshing}
        >
          Refresh Data
        </Button>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%', borderRadius: 2, boxShadow: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Assignment sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6" color="text.secondary">
                  Total Orders
                </Typography>
              </Box>
              <Typography variant="h4" component="div" fontWeight="bold">
                {stats?.totalOrders || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%', borderRadius: 2, boxShadow: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <AttachMoney sx={{ mr: 1, color: 'success.main' }} />
                <Typography variant="h6" color="text.secondary">
                  Total Revenue
                </Typography>
              </Box>
              <Typography variant="h4" component="div" fontWeight="bold">
                {formatCurrency(stats?.totalRevenue || 0)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%', borderRadius: 2, boxShadow: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <CheckCircle sx={{ mr: 1, color: 'success.main' }} />
                <Typography variant="h6" color="text.secondary">
                  Delivered Orders
                </Typography>
              </Box>
              <Typography variant="h4" component="div" fontWeight="bold">
                {stats?.byStatus?.delivered?.count || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {formatCurrency(stats?.byStatus?.delivered?.revenue || 0)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%', borderRadius: 2, boxShadow: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <LocalShipping sx={{ mr: 1, color: 'info.main' }} />
                <Typography variant="h6" color="text.secondary">
                  In Transit
                </Typography>
              </Box>
              <Typography variant="h4" component="div" fontWeight="bold">
                {(stats?.byStatus?.out_for_delivery?.count || 0)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {formatCurrency(stats?.byStatus?.out_for_delivery?.revenue || 0)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Chart Row */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, borderRadius: 2, boxShadow: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Daily Orders & Revenue (Last 7 Days)
            </Typography>
            <Box sx={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={prepareDailyOrdersChartData()}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis yAxisId="left" orientation="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip formatter={(value, name) => [
                    name === 'Revenue' ? formatCurrency(value) : value,
                    name
                  ]} />
                  <Legend />
                  <Bar yAxisId="left" dataKey="Orders" fill="#1976d2" />
                  <Bar yAxisId="right" dataKey="Revenue" fill="#4caf50" />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, borderRadius: 2, boxShadow: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Orders by Status
            </Typography>
            <Box sx={{ height: 300, display: 'flex', justifyContent: 'center' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={prepareStatusChartData()}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {prepareStatusChartData().map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value, name, props) => [value, props.payload.name]} />
                </PieChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Status Summary */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, borderRadius: 2, boxShadow: 3 }}>
            <Typography variant="h6" gutterBottom>
              Order Status Summary
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {stats && stats.byStatus && Object.entries(stats.byStatus).map(([status, data]) => (
                <Box key={status}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Box 
                        sx={{ 
                          width: 12, 
                          height: 12, 
                          borderRadius: '50%', 
                          bgcolor: STATUS_COLORS[status] || '#999',
                          mr: 1 
                        }} 
                      />
                      <Typography variant="body1">
                        {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
                      </Typography>
                    </Box>
                    <Chip 
                      label={`${data.count} orders`} 
                      size="small" 
                      sx={{ bgcolor: 'background.default' }} 
                    />
                  </Box>
                  <Box 
                    sx={{ 
                      height: 8, 
                      bgcolor: 'background.default', 
                      borderRadius: 1, 
                      overflow: 'hidden',
                      mb: 1
                    }}
                  >
                    <Box 
                      sx={{ 
                        height: '100%', 
                        width: `${(data.count / (stats.totalOrders || 1)) * 100}%`, 
                        bgcolor: STATUS_COLORS[status] || '#999' 
                      }} 
                    />
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    Revenue: {formatCurrency(data.revenue || 0)}
                  </Typography>
                  {status !== 'cancelled' && <Divider sx={{ mt: 1 }} />}
                </Box>
              ))}
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, borderRadius: 2, boxShadow: 3 }}>
            <Typography variant="h6" gutterBottom>
              Payment Status Summary
            </Typography>
            <Box sx={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={preparePaymentChartData()}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {preparePaymentChartData().map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value, name, props) => [value, props.payload.name]} />
                </PieChart>
              </ResponsiveContainer>
            </Box>
            <Box sx={{ mt: 2 }}>
              {stats && stats.byPaymentStatus && Object.entries(stats.byPaymentStatus).map(([status, data]) => (
                <Box key={status} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Box 
                    sx={{ 
                      width: 12, 
                      height: 12, 
                      borderRadius: '50%', 
                      bgcolor: PAYMENT_COLORS[status] || '#999',
                      mr: 1 
                    }} 
                  />
                  <Typography variant="body2" sx={{ mr: 1 }}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}:
                  </Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {formatCurrency(data.amount || 0)}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default AdminDashboard; 