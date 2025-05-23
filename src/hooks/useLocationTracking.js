import { useState, useEffect, useRef, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setCurrentLocation, setAgentLocation } from '../redux/deliverySlice';
import { updateAgentLocation as updateConfirmedOrdersAgentLocation } from '../redux/confirmedOrdersSlice';
import { toast } from 'react-hot-toast';

/**
 * Simplified location tracking hook for delivery agents
 * @param {boolean} enabled - Whether tracking is enabled
 * @param {number} interval - Update interval in ms (default: 10000ms)
 * @returns {Object} Location data and control functions
 */
const useLocationTracking = (enabled = true, interval = 10000) => {
  const dispatch = useDispatch();
  const { isDeliveryAgent } = useSelector(state => state.delivery);
  
  // State for current position
  const [position, setPosition] = useState({
    latitude: null,
    longitude: null,
    accuracy: null,
    timestamp: null
  });
  
  // Tracking state
  const [error, setError] = useState(null);
  const [isTracking, setIsTracking] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);
  
  // Refs to store interval IDs
  const intervalIdRef = useRef(null);
  
  // Get current position and update state
  const updatePosition = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      setIsAvailable(false);
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        // Extract coordinates
        const { latitude, longitude, accuracy } = position.coords;
        const timestamp = position.timestamp;
        
        // Update local state
        setPosition({
          latitude,
          longitude,
          accuracy,
          timestamp
        });
        
        setIsAvailable(true);
        setError(null);
        
        // Update Redux store
        try {
          dispatch(setCurrentLocation({ latitude, longitude }));
          
          if (isDeliveryAgent) {
            // Update both slices for delivery agent
            dispatch(setAgentLocation({ latitude, longitude }));
            dispatch(updateConfirmedOrdersAgentLocation({ latitude, longitude }));
          }
        } catch (err) {
          console.error('Failed to update location in Redux:', err);
        }
      },
      (error) => {
        // Handle geolocation errors
        let errorMessage = 'Location error';
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location unavailable';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out';
            break;
        }
        
        setError(errorMessage);
        if (!isTracking) {
          toast.error(errorMessage);
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, [dispatch, isDeliveryAgent, isTracking]);
  
  // Start location tracking
  const startTracking = useCallback(() => {
    if (intervalIdRef.current) {
      clearInterval(intervalIdRef.current);
    }
    
    setIsTracking(true);
    
    // Get initial position
    updatePosition();
    
    // Set up interval for updates
    intervalIdRef.current = setInterval(updatePosition, interval);
    
    return true;
  }, [updatePosition, interval]);
  
  // Stop tracking
  const stopTracking = useCallback(() => {
    if (intervalIdRef.current) {
      clearInterval(intervalIdRef.current);
      intervalIdRef.current = null;
    }
    
    setIsTracking(false);
    return true;
  }, []);
  
  // Start/stop tracking based on enabled prop
  useEffect(() => {
    if (enabled) {
      startTracking();
    } else {
      stopTracking();
    }
    
    return () => {
      stopTracking();
    };
  }, [enabled, startTracking, stopTracking]);
  
  return {
    position,
    isTracking,
    error,
    isAvailable,
    startTracking,
    stopTracking
  };
};

export default useLocationTracking;
