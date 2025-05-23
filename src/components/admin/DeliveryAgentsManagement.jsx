import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getAllAgents } from '../../services/deliveryService';
import { verifyDeliveryAgent, clearVerificationStatus } from '../../redux/deliverySlice';
import { toast } from 'react-hot-toast';
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
  Button,
  Chip,
  Avatar,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material';

const DeliveryAgentsManagement = () => {
  const dispatch = useDispatch();
  const { verificationStatus } = useSelector((state) => state.delivery);
  
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // Confirmation dialog
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    agentId: null,
    agentName: '',
    action: null, // 'verify' or 'revoke'
  });
  
  // Load agents on component mount
  useEffect(() => {
    fetchAgents();
  }, []);
  
  // Watch for verification status changes
  useEffect(() => {
    if (verificationStatus.success) {
      toast.success('Agent verification status updated successfully!');
      fetchAgents(); // Refresh agent list
      dispatch(clearVerificationStatus());
    }
    
    if (verificationStatus.error) {
      toast.error(verificationStatus.error || 'Failed to update agent status');
      dispatch(clearVerificationStatus());
    }
  }, [verificationStatus.success, verificationStatus.error, dispatch]);
  
  const fetchAgents = async () => {
    setLoading(true);
    try {
      const response = await getAllAgents();
      setAgents(response.agents || []);
      setError(null);
    } catch (err) {
      setError('Failed to load delivery agents');
      toast.error('Failed to load delivery agents');
    } finally {
      setLoading(false);
    }
  };
  
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };
  
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };
  
  const handleVerifyAction = (agent, action) => {
    setConfirmDialog({
      open: true,
      agentId: agent._id,
      agentName: agent.user?.username || 'Agent',
      action,
    });
  };
  
  const confirmVerificationAction = () => {
    const { agentId, action } = confirmDialog;
    
    dispatch(
      verifyDeliveryAgent({
        agentId,
        isVerified: action === 'verify',
      })
    );
    
    // Close dialog
    setConfirmDialog((prev) => ({
      ...prev,
      open: false,
    }));
  };
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }
  
  if (error) {
    return (
      <Box sx={{ py: 3 }}>
        <Typography color="error" variant="h6" align="center">
          {error}
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <Button variant="contained" onClick={fetchAgents}>
            Retry
          </Button>
        </Box>
      </Box>
    );
  }
  
  return (
    <Box>
      <Typography variant="h5" component="h1" gutterBottom>
        Delivery Agents Management
      </Typography>
      
      <Paper sx={{ width: '100%', mb: 2 }}>
        <TableContainer sx={{ maxHeight: 600 }}>
          <Table stickyHeader aria-label="delivery agents table">
            <TableHead>
              <TableRow>
                <TableCell>Agent</TableCell>
                <TableCell>Vehicle</TableCell>
                <TableCell>Registration Date</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Deliveries</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {agents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    No delivery agents found
                  </TableCell>
                </TableRow>
              ) : (
                agents
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((agent) => (
                    <TableRow key={agent._id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Avatar 
                            src={agent.user?.profilePic} 
                            alt={agent.user?.username} 
                            sx={{ mr: 2, width: 40, height: 40 }} 
                          />
                          <div>
                            <Typography variant="body1">
                              {agent.user?.username || 'Unknown User'}
                            </Typography>
                            <Typography variant="body2" color="textSecondary">
                              {agent.user?.email || 'No email'}
                            </Typography>
                          </div>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                          {agent.vehicleType || 'Not specified'}
                          {agent.vehicleNumber && (
                            <Box component="span" sx={{ display: 'block', color: 'text.secondary', mt: 0.5 }}>
                              {agent.vehicleNumber}
                            </Box>
                          )}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {new Date(agent.createdAt).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </TableCell>
                      <TableCell>
                        {agent.isVerified ? (
                          <Chip 
                            label="Verified" 
                            color="success" 
                            size="small"
                            sx={{ minWidth: 90 }}
                          />
                        ) : (
                          <Chip 
                            label="Pending Verification" 
                            color="warning" 
                            size="small"
                            sx={{ minWidth: 90 }}
                          />
                        )}
                        <Box component="span" sx={{ display: 'block', color: 'text.secondary', mt: 0.5, fontSize: '0.75rem' }}>
                          {agent.isAvailable ? 'Available' : 'Unavailable'}
                        </Box>
                      </TableCell>
                      <TableCell>
                        {agent.activeOrders?.length || 0} active
                        <Box component="span" sx={{ display: 'block', color: 'text.secondary', mt: 0.5, fontSize: '0.75rem' }}>
                          {agent.deliveryHistory?.length || 0} completed
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        {agent.isVerified ? (
                          <Button
                            variant="outlined"
                            color="error"
                            size="small"
                            onClick={() => handleVerifyAction(agent, 'revoke')}
                            disabled={verificationStatus.isPending}
                          >
                            Revoke Verification
                          </Button>
                        ) : (
                          <Button
                            variant="contained"
                            color="success"
                            size="small"
                            onClick={() => handleVerifyAction(agent, 'verify')}
                            disabled={verificationStatus.isPending}
                          >
                            Verify Agent
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={agents.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>
      
      {/* Confirmation Dialog */}
      <Dialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog((prev) => ({ ...prev, open: false }))}
      >
        <DialogTitle>
          {confirmDialog.action === 'verify' ? 'Verify Agent' : 'Revoke Verification'}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {confirmDialog.action === 'verify'
              ? `Are you sure you want to verify ${confirmDialog.agentName}? This will allow them to start accepting and delivering orders.`
              : `Are you sure you want to revoke verification for ${confirmDialog.agentName}? This will prevent them from accepting new orders.`}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialog((prev) => ({ ...prev, open: false }))}>
            Cancel
          </Button>
          <Button 
            onClick={confirmVerificationAction} 
            color={confirmDialog.action === 'verify' ? 'success' : 'error'}
            variant="contained"
            autoFocus
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DeliveryAgentsManagement; 