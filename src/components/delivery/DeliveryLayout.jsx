import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import DeliveryHeader from './DeliveryHeader';
import DeliverySidebar from './DeliverySidebar';
import useLocationTracking from '../../hooks/useLocationTracking';
import { toast } from 'react-hot-toast';

const DeliveryLayout = () => {
  const { isDeliveryAgent, isAvailable } = useSelector(state => state.delivery);
  
  // Initialize location tracking at the layout level
  const { isTracking, error: locationError } = useLocationTracking(
    isDeliveryAgent, // Always track if they're a delivery agent
    1000 // Update every second
  );
  
  // Show location access errors
  useEffect(() => {
    if (locationError) {
      toast.error(locationError, {
        id: 'location-error', // Use an ID to prevent duplicate toasts
        duration: 5000
      });
    }
  }, [locationError]);
  
  // Show tracking status notifications
  useEffect(() => {
    if (isDeliveryAgent) {
      if (isTracking) {
        toast.success('Location tracking active', {
          id: 'location-tracking-active',
          duration: 3000
        });
      } else if (isAvailable && !isTracking) {
        toast.error('Location tracking failed. Please enable location services.', {
          id: 'location-tracking-failed',
          duration: 3000
        });
      }
    }
  }, [isTracking, isDeliveryAgent, isAvailable]);
  
  return (
    <div className="min-h-screen bg-gray-50">
      <DeliveryHeader />
      <div className="flex flex-1 min-h-[calc(100vh-64px)]">
        {/* Sidebar for desktop */}
        <div className="hidden md:block w-64 bg-white border-r border-gray-200">
          <DeliverySidebar />
        </div>
        
        {/* Main content */}
        <div className="flex-1 p-4 md:p-6 overflow-auto">
          <Outlet />
        </div>
      </div>
      
      {/* Mobile bottom navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-2">
        <DeliverySidebar isMobile={true} />
      </div>
    </div>
  );
};

export default DeliveryLayout; 