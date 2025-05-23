import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, CircularProgress, Skeleton, Divider, IconButton } from '@mui/material';
import { BarChart2, Link, Users, Eye, Calendar, PieChart, X } from 'lucide-react';
import axios from 'axios';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart as RePieChart, Pie, Cell } from 'recharts';

// API base URL from environment or default to localhost
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const ShareStats = ({ postId, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const fetchStats = async () => {
      if (!postId) {
        setError('Post ID is required');
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        
        const response = await axios.get(
          `${API_BASE_URL}/api/v1/share/stats/${postId}`,
          { withCredentials: true }
        );
        
        if (response.data.success) {
          setStats(response.data.stats);
        } else {
          setError(response.data.message || 'Failed to load statistics');
        }
      } catch (err) {
        console.error('Error fetching share stats:', err);
        setError('Error loading statistics. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchStats();
  }, [postId]);
  
  // Generate platform data for charts
  const getPlatformData = () => {
    if (!stats || !stats.platformStats) return [];
    
    return Object.entries(stats.platformStats).map(([platform, count]) => ({
      name: platform.charAt(0).toUpperCase() + platform.slice(1),
      value: count
    }));
  };
  
  // Generate time-based data
  const getTimeData = () => {
    if (!stats || !stats.timeStats) return [];
    
    return stats.timeStats.map(item => ({
      name: new Date(item.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      shares: item.count
    }));
  };
  
  // Colors for pie chart
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];
  
  // Handle close
  const handleClose = () => {
    if (onClose) {
      onClose();
    }
  };
  
  // Handle loading state
  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <BarChart2 size={20} className="mr-2" />
          <Skeleton width={200} height={32} />
        </Box>
        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          {[1, 2, 3, 4].map(i => (
            <Paper key={i} sx={{ p: 2, flex: 1 }}>
              <Skeleton width={40} height={24} />
              <Skeleton width={60} height={40} />
            </Paper>
          ))}
        </Box>
        <Skeleton variant="rectangular" height={200} />
      </Box>
    );
  }
  
  // Handle error state
  if (error) {
    return (
      <Box sx={{ p: 3, color: 'error.main' }}>
        <Typography variant="body1">{error}</Typography>
      </Box>
    );
  }
  
  // Handle no data state
  if (!stats || stats.totalShares === 0) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <BarChart2 size={40} className="text-gray-400 mb-2 mx-auto" />
        <Typography variant="h6" gutterBottom>No Share Data Yet</Typography>
        <Typography variant="body2" color="textSecondary">
          When people share your post, statistics will appear here.
        </Typography>
      </Box>
    );
  }
  
  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6" className="flex items-center">
          <BarChart2 size={20} className="mr-2" />
          Share Analytics
        </Typography>
        {onClose && (
          <IconButton 
            size="small" 
            onClick={handleClose}
            aria-label="Close analytics"
          >
            <X size={18} />
          </IconButton>
        )}
      </Box>
      
      {/* Summary Cards */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 4 }}>
        <Paper sx={{ p: 2, flex: '1 1 120px', minWidth: 120 }}>
          <Typography variant="caption" color="textSecondary" className="flex items-center">
            <Link size={14} className="mr-1" /> Total Shares
          </Typography>
          <Typography variant="h5">{stats.totalShares}</Typography>
        </Paper>
        
        <Paper sx={{ p: 2, flex: '1 1 120px', minWidth: 120 }}>
          <Typography variant="caption" color="textSecondary" className="flex items-center">
            <Users size={14} className="mr-1" /> Recipients
          </Typography>
          <Typography variant="h5">{stats.uniqueRecipients}</Typography>
        </Paper>
        
        <Paper sx={{ p: 2, flex: '1 1 120px', minWidth: 120 }}>
          <Typography variant="caption" color="textSecondary" className="flex items-center">
            <Eye size={14} className="mr-1" /> Views
          </Typography>
          <Typography variant="h5">{stats.viewCount || 0}</Typography>
        </Paper>
        
        <Paper sx={{ p: 2, flex: '1 1 120px', minWidth: 120 }}>
          <Typography variant="caption" color="textSecondary" className="flex items-center">
            <Calendar size={14} className="mr-1" /> Latest
          </Typography>
          <Typography variant="body2">
            {stats.latestShare ? new Date(stats.latestShare).toLocaleDateString() : 'N/A'}
          </Typography>
        </Paper>
      </Box>
      
      <Divider sx={{ my: 3 }} />
      
      {/* Platform Distribution */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="subtitle1" gutterBottom className="flex items-center">
          <PieChart size={16} className="mr-2" /> Platform Distribution
        </Typography>
        
        <Box sx={{ height: 250 }}>
          <ResponsiveContainer width="100%" height="100%">
            <RePieChart>
              <Pie
                data={getPlatformData()}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={80}
                innerRadius={40}
                fill="#8884d8"
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {getPlatformData().map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </RePieChart>
          </ResponsiveContainer>
        </Box>
      </Box>
      
      {/* Time-based Distribution */}
      <Box>
        <Typography variant="subtitle1" gutterBottom className="flex items-center">
          <BarChart2 size={16} className="mr-2" /> Shares Over Time
        </Typography>
        
        <Box sx={{ height: 250 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={getTimeData()}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="shares" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </Box>
      </Box>
    </Box>
  );
};

export default ShareStats; 