import React, { useState } from 'react';
import { Box, TextField, Button, Typography, FormControl, InputLabel, Select, MenuItem, FormControlLabel, Switch, CircularProgress, Alert } from '@mui/material';
import { Clock, Calendar, AlertCircle } from 'lucide-react';

const ScheduledShare = ({ onSchedule }) => {
  const [scheduledDate, setScheduledDate] = useState(addHours(new Date(), 1));
  const [message, setMessage] = useState('');
  const [audience, setAudience] = useState('followers');
  const [notifyRecipients, setNotifyRecipients] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  // Helper function to add hours to a date
  function addHours(date, hours) {
    const newDate = new Date(date);
    newDate.setHours(newDate.getHours() + hours);
    return newDate;
  }
  
  // Helper function to add days to a date
  function addDays(date, days) {
    const newDate = new Date(date);
    newDate.setDate(newDate.getDate() + days);
    return newDate;
  }
  
  // Format date for input
  const formatDateForInput = (date) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };
  
  const handleDateChange = (e) => {
    const newDate = new Date(e.target.value);
    if (!isNaN(newDate.getTime())) {
      setScheduledDate(newDate);
      // Clear any previous error if the date is valid
      if (error.includes('valid date')) {
        setError('');
      }
    } else {
      setError('Please select a valid date and time');
    }
  };
  
  const handleScheduleShare = () => {
    // Validate inputs
    if (!scheduledDate || isNaN(scheduledDate.getTime())) {
      setError('Please select a valid date and time');
      return;
    }
    
    // Check if date is in the future
    if (scheduledDate <= new Date()) {
      setError('Scheduled time must be in the future');
      return;
    }
    
    setLoading(true);
    setError('');
    
    // Prepare schedule data
    const scheduleData = {
      scheduledDate,
      message,
      audience,
      notifyRecipients
    };
    
    // Simulate API call
    setTimeout(() => {
      try {
        if (onSchedule) {
          onSchedule(scheduleData);
        }
        setSuccess(true);
        setLoading(false);
        
        // Reset form after success
        setTimeout(() => {
          setScheduledDate(addHours(new Date(), 1));
          setMessage('');
          setAudience('followers');
          setNotifyRecipients(true);
          setSuccess(false);
        }, 3000);
      } catch (err) {
        setError('Failed to schedule share. Please try again.');
        setLoading(false);
      }
    }, 1500);
  };
  
  // Quick scheduling options
  const quickScheduleOptions = [
    { label: 'In 1 hour', value: addHours(new Date(), 1) },
    { label: 'Tomorrow morning', value: new Date(new Date().setHours(9, 0, 0, 0) + 24 * 60 * 60 * 1000) },
    { label: 'Tomorrow evening', value: new Date(new Date().setHours(18, 0, 0, 0) + 24 * 60 * 60 * 1000) },
    { label: 'Weekend', value: addDays(new Date(), 7 - new Date().getDay() || 7) },
  ];
  
  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Calendar size={20} className="mr-2 text-blue-500" />
        <Typography variant="h6">Schedule for Later</Typography>
      </Box>
      
      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Share scheduled successfully!
        </Alert>
      )}
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" gutterBottom>
          Quick Schedule
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {quickScheduleOptions.map((option, index) => (
            <Button 
              key={index}
              variant={scheduledDate && option.value.getTime() === scheduledDate.getTime() ? "contained" : "outlined"}
              size="small"
              onClick={() => setScheduledDate(option.value)}
              startIcon={<Clock size={14} />}
              sx={{ mb: 1 }}
            >
              {option.label}
            </Button>
          ))}
        </Box>
      </Box>
      
      <TextField
        label="Schedule Date & Time"
        type="datetime-local"
        value={formatDateForInput(scheduledDate)}
        onChange={handleDateChange}
        fullWidth
        margin="normal"
        InputLabelProps={{
          shrink: true,
        }}
        className="schedule-form-field"
      />
      
      <TextField
        label="Share Message"
        multiline
        rows={3}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        fullWidth
        margin="normal"
        placeholder="Add a message to accompany your scheduled share..."
        className="schedule-form-field"
      />
      
      <FormControl fullWidth margin="normal" className="schedule-form-field">
        <InputLabel>Share With</InputLabel>
        <Select
          value={audience}
          onChange={(e) => setAudience(e.target.value)}
          label="Share With"
        >
          <MenuItem value="followers">All Followers</MenuItem>
          <MenuItem value="specific">Specific Users</MenuItem>
          <MenuItem value="public">Public Link</MenuItem>
        </Select>
      </FormControl>
      
      <FormControlLabel
        control={
          <Switch 
            checked={notifyRecipients} 
            onChange={(e) => setNotifyRecipients(e.target.checked)} 
          />
        }
        label="Send notifications to recipients"
        className="mb-4 block"
      />
      
      <Button
        variant="contained"
        color="primary"
        fullWidth
        onClick={handleScheduleShare}
        disabled={loading}
        startIcon={loading ? <CircularProgress size={20} /> : <Calendar size={20} />}
      >
        {loading ? "Scheduling..." : "Schedule Share"}
      </Button>
      
      <Typography variant="caption" color="textSecondary" className="mt-3 block text-center">
        Note: This is a preview feature. Scheduling functionality will be fully available soon.
      </Typography>
    </Box>
  );
};

export default ScheduledShare; 