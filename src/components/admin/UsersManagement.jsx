import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Box,
  Container,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  CircularProgress,
  Alert,
  Snackbar,
  Chip,
  Avatar,
  FormControlLabel,
  Switch,
  InputAdornment,
  Tooltip,
  Pagination,
  Grid
} from '@mui/material';
import {
  Search as SearchIcon,
  Edit as EditIcon,
  AdminPanelSettings as AdminIcon,
  Person as PersonIcon,
  Block as BlockIcon,
  Check as CheckIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';

const UsersManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openAdminDialog, setOpenAdminDialog] = useState(false);
  const [openBlockDialog, setOpenBlockDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState({ username: '', email: '', isAdmin: false, isBlocked: false });
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [refreshing, setRefreshing] = useState(false);

  const ROWS_PER_PAGE = 10;

  // Fetch users on component mount and when search/page changes
  useEffect(() => {
    fetchUsers();
  }, [page, searchQuery]);

  // Fetch users from the API
  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Create query params
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('limit', ROWS_PER_PAGE);
      if (searchQuery) {
        params.append('q', searchQuery);
      }
      
      const response = await axios.get(`http://localhost:8000/api/v1/user/admin/users?${params.toString()}`, {
        withCredentials: true
      });
      
      if (response.data.success) {
        setUsers(response.data.users || []);
        setTotalPages(response.data.pagination?.pages || 1);
      } else {
        throw new Error(response.data.message || 'Failed to fetch users');
      }
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Failed to load users. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Handle search input changes
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setPage(1); // Reset to first page on new search
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value, checked } = e.target;
    const newValue = name === 'isAdmin' || name === 'isBlocked' ? checked : value;
    setFormData(prev => ({ ...prev, [name]: newValue }));
  };

  // Handle page change
  const handlePageChange = (event, newPage) => {
    setPage(newPage);
  };

  // Refresh user data
  const handleRefresh = () => {
    setRefreshing(true);
    fetchUsers();
  };

  // Open edit user dialog
  const handleOpenEditDialog = (user) => {
    setSelectedUser(user);
    setFormData({
      username: user.username,
      email: user.email,
      isAdmin: user.isAdmin || false,
      isBlocked: user.isBlocked || false
    });
    setOpenEditDialog(true);
  };

  // Open make admin dialog
  const handleOpenAdminDialog = (user) => {
    setSelectedUser(user);
    setOpenAdminDialog(true);
  };

  // Open block user dialog
  const handleOpenBlockDialog = (user) => {
    setSelectedUser(user);
    setOpenBlockDialog(true);
  };

  // Close all dialogs
  const handleCloseDialogs = () => {
    setOpenEditDialog(false);
    setOpenAdminDialog(false);
    setOpenBlockDialog(false);
  };

  // Update user details
  const handleUpdateUser = async () => {
    try {
      setLoading(true);
      
      const response = await axios.put(`http://localhost:8000/api/v1/user/admin/${selectedUser._id}`, {
        username: formData.username,
        email: formData.email,
        isAdmin: formData.isAdmin,
        isBlocked: formData.isBlocked
      }, {
        withCredentials: true
      });
      
      if (response.data.success) {
        setNotification({
          open: true,
          message: 'User updated successfully!',
          severity: 'success'
        });
        
        handleCloseDialogs();
        fetchUsers();
      } else {
        throw new Error(response.data.message || 'Failed to update user');
      }
    } catch (err) {
      console.error('Error updating user:', err);
      setNotification({
        open: true,
        message: err.response?.data?.message || 'Failed to update user',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Toggle admin status
  const handleToggleAdmin = async () => {
    try {
      setLoading(true);
      
      const newAdminStatus = !selectedUser.isAdmin;
      const endpoint = newAdminStatus ? 'make-admin' : 'remove-admin';
      
      const response = await axios.put(`http://localhost:8000/api/v1/user/admin/${selectedUser._id}/${endpoint}`, {}, {
        withCredentials: true
      });
      
      if (response.data.success) {
        setNotification({
          open: true,
          message: `User ${newAdminStatus ? 'promoted to admin' : 'demoted from admin'} successfully!`,
          severity: 'success'
        });
        
        handleCloseDialogs();
        fetchUsers();
      } else {
        throw new Error(response.data.message || `Failed to ${newAdminStatus ? 'promote' : 'demote'} user`);
      }
    } catch (err) {
      console.error('Error toggling admin status:', err);
      setNotification({
        open: true,
        message: err.response?.data?.message || 'Failed to update admin status',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Toggle block status
  const handleToggleBlock = async () => {
    try {
      setLoading(true);
      
      const newBlockStatus = !selectedUser.isBlocked;
      const endpoint = newBlockStatus ? 'block' : 'unblock';
      
      const response = await axios.put(`http://localhost:8000/api/v1/user/admin/${selectedUser._id}/${endpoint}`, {}, {
        withCredentials: true
      });
      
      if (response.data.success) {
        setNotification({
          open: true,
          message: `User ${newBlockStatus ? 'blocked' : 'unblocked'} successfully!`,
          severity: 'success'
        });
        
        handleCloseDialogs();
        fetchUsers();
      } else {
        throw new Error(response.data.message || `Failed to ${newBlockStatus ? 'block' : 'unblock'} user`);
      }
    } catch (err) {
      console.error('Error toggling block status:', err);
      setNotification({
        open: true,
        message: err.response?.data?.message || 'Failed to update block status',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Close notification
  const handleCloseNotification = () => {
    setNotification(prev => ({ ...prev, open: false }));
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 4 }}>
        <Typography variant="h4" component="h1" fontWeight="bold">
          Users Management
        </Typography>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={handleRefresh}
          disabled={refreshing}
        >
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
      </Box>

      <Paper sx={{ p: 2, mb: 3 }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Search users by username or email"
          value={searchQuery}
          onChange={handleSearchChange}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            )
          }}
        />
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {loading && !users.length ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <TableContainer component={Paper} sx={{ mb: 2 }}>
            <Table>
              <TableHead sx={{ bgcolor: 'primary.main' }}>
                <TableRow>
                  <TableCell sx={{ color: 'white' }}>User</TableCell>
                  <TableCell sx={{ color: 'white' }}>Email</TableCell>
                  <TableCell sx={{ color: 'white' }}>Status</TableCell>
                  <TableCell sx={{ color: 'white' }} align="center">Role</TableCell>
                  <TableCell sx={{ color: 'white' }} align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      No users found.
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user._id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Avatar 
                            src={user.profilePicture} 
                            alt={user.username}
                            sx={{ mr: 2 }}
                          />
                          <Typography variant="body1" fontWeight="medium">
                            {user.username}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        {user.isBlocked ? (
                          <Chip 
                            label="Blocked" 
                            color="error" 
                            size="small"
                            icon={<BlockIcon />}
                          />
                        ) : (
                          <Chip 
                            label="Active" 
                            color="success" 
                            size="small"
                            icon={<CheckIcon />}
                          />
                        )}
                      </TableCell>
                      <TableCell align="center">
                        {user.isAdmin ? (
                          <Chip 
                            label="Admin" 
                            color="primary" 
                            size="small"
                            icon={<AdminIcon />}
                          />
                        ) : (
                          <Chip 
                            label="User" 
                            variant="outlined"
                            size="small"
                            icon={<PersonIcon />}
                          />
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="Edit User">
                          <IconButton 
                            color="primary" 
                            onClick={() => handleOpenEditDialog(user)}
                            size="small"
                            sx={{ mr: 1 }}
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        
                        <Tooltip title={user.isAdmin ? "Remove Admin" : "Make Admin"}>
                          <IconButton 
                            color={user.isAdmin ? "secondary" : "info"} 
                            onClick={() => handleOpenAdminDialog(user)}
                            size="small"
                            sx={{ mr: 1 }}
                          >
                            <AdminIcon />
                          </IconButton>
                        </Tooltip>
                        
                        <Tooltip title={user.isBlocked ? "Unblock User" : "Block User"}>
                          <IconButton 
                            color={user.isBlocked ? "success" : "error"}
                            onClick={() => handleOpenBlockDialog(user)}
                            size="small"
                          >
                            {user.isBlocked ? <CheckIcon /> : <BlockIcon />}
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
          
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
            <Pagination 
              count={totalPages} 
              page={page} 
              onChange={handlePageChange} 
              color="primary" 
              showFirstButton 
              showLastButton
            />
          </Box>
        </>
      )}

      {/* Edit User Dialog */}
      <Dialog open={openEditDialog} onClose={handleCloseDialogs} maxWidth="sm" fullWidth>
        <DialogTitle>Edit User</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                name="username"
                label="Username"
                value={formData.username}
                onChange={handleInputChange}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                name="email"
                label="Email"
                value={formData.email}
                onChange={handleInputChange}
                fullWidth
                required
                type="email"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.isAdmin}
                    onChange={handleInputChange}
                    name="isAdmin"
                    color="primary"
                  />
                }
                label="Admin Privileges"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.isBlocked}
                    onChange={handleInputChange}
                    name="isBlocked"
                    color="error"
                  />
                }
                label="Block User"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialogs}>Cancel</Button>
          <Button 
            onClick={handleUpdateUser} 
            variant="contained" 
            disabled={!formData.username || !formData.email || loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Update'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Admin Status Dialog */}
      <Dialog open={openAdminDialog} onClose={handleCloseDialogs}>
        <DialogTitle>
          {selectedUser?.isAdmin ? 'Remove Admin Privileges' : 'Grant Admin Privileges'}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {selectedUser?.isAdmin 
              ? `Are you sure you want to remove admin privileges from ${selectedUser?.username}?`
              : `Are you sure you want to grant admin privileges to ${selectedUser?.username}? This will give them access to the admin panel and all administrative functions.`
            }
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialogs}>Cancel</Button>
          <Button 
            onClick={handleToggleAdmin} 
            color={selectedUser?.isAdmin ? "error" : "primary"}
            variant="contained"
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : (selectedUser?.isAdmin ? 'Remove Admin' : 'Make Admin')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Block User Dialog */}
      <Dialog open={openBlockDialog} onClose={handleCloseDialogs}>
        <DialogTitle>
          {selectedUser?.isBlocked ? 'Unblock User' : 'Block User'}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {selectedUser?.isBlocked 
              ? `Are you sure you want to unblock ${selectedUser?.username}? This will allow them to use the system again.`
              : `Are you sure you want to block ${selectedUser?.username}? This will prevent them from logging in and using the system.`
            }
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialogs}>Cancel</Button>
          <Button 
            onClick={handleToggleBlock} 
            color={selectedUser?.isBlocked ? "success" : "error"}
            variant="contained"
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : (selectedUser?.isBlocked ? 'Unblock User' : 'Block User')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Notification Snackbar */}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseNotification} 
          severity={notification.severity}
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default UsersManagement; 