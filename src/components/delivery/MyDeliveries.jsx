import React, { useEffect, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { fetchAgentProfile, completeDeliveryOrder, fetchDeliveryHistory } from '../../redux/deliverySlice';
import { 
  MdDirections, 
  MdDeliveryDining, 
  MdLocationOff, 
  MdCall, 
  MdLocationOn, 
  MdRestaurant, 
  MdPerson, 
  MdMap, 
  MdRefresh,
  MdHistory,
  MdLocalShipping,
  MdNotes,
  MdStar,
  MdStarOutline,
  MdCamera,
  MdCheck
} from 'react-icons/md';
import { FiClock, FiPackage, FiCheck, FiX, FiClipboard } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import useLocationTracking from '../../hooks/useLocationTracking';
import DeliveryMap from './DeliveryMap';
import DeliveryProgressBar from './DeliveryProgressBar';
import DeliveryMetrics from './DeliveryMetrics';

const MyDeliveries = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { 
    activeOrders, 
    deliveryHistory,
    isDeliveryAgent, 
    isAvailable, 
    currentLocation, 
    isProfileLoading, 
    isActionPending 
  } = useSelector((state) => state.delivery);
  
  // Use the location tracking hook
  const { 
    position, 
    isTracking, 
    error: locationError,
    startTracking
  } = useLocationTracking(isDeliveryAgent && isAvailable);
  
  const [completingOrderId, setCompletingOrderId] = useState(null);
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('current');
  const [verificationMethod, setVerificationMethod] = useState('pin');
  const [deliveryPin, setDeliveryPin] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  
  // Format coordinates to be more readable
  const formatCoordinate = (coord) => {
    if (coord === null || coord === undefined) return "N/A";
    return coord.toFixed(6);
  };
  
  // Refresh profile to get updated active orders - using useCallback to maintain reference
  const refreshProfile = useCallback(() => {
    if (isDeliveryAgent) {
      dispatch(fetchAgentProfile())
        .unwrap()
        .catch(error => {
          console.error("Failed to refresh profile:", error);
        });
    }
  }, [dispatch, isDeliveryAgent]);
  
  // Initial load
  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);

  // Handle tab change
  useEffect(() => {
    if (activeTab === 'history' && isDeliveryAgent) {
      dispatch(fetchDeliveryHistory())
        .unwrap()
        .catch(error => {
          console.error("Failed to fetch delivery history:", error);
          toast.error("Failed to load delivery history");
        });
    }
  }, [activeTab, dispatch, isDeliveryAgent]);

  // Auto refresh location and order data at regular intervals without causing flickering
  useEffect(() => {
    if (!isDeliveryAgent || !isAvailable) return;
    
    // Refresh data every 30 seconds without UI indication
    const intervalId = setInterval(() => {
      startTracking(); // Get fresh position
      refreshProfile(); // Refresh order data
    }, 30000);
    
    return () => clearInterval(intervalId);
  }, [isDeliveryAgent, isAvailable, startTracking, refreshProfile]);

  const handleCompleteDelivery = (orderId) => {
    // Simple validation
    if (!orderId) {
      toast.error('Invalid order ID');
      return;
    }
    
    setCompletingOrderId(orderId);
    
    // Use a single toast that updates with status
    toast.loading('Completing delivery...', { id: 'completeDelivery' });
    
    dispatch(completeDeliveryOrder(orderId))
      .unwrap()
      .then(() => {
        // Update toast with success message
        toast.success('Delivery completed successfully!', { id: 'completeDelivery' });
        
        // Reset all form state at once
        setShowDeliveryModal(false);
        setSelectedOrder(null);
        setDeliveryPin('');
        setDeliveryNotes('');
        
        // Refresh delivery history to show the completed order
        dispatch(fetchDeliveryHistory());
        
        // Simple notification for other tabs
        localStorage.setItem('deliveryCompleted', `${orderId}:${Date.now()}`);
      })
      .catch((error) => {
        // Simplified error handling
        const errorMsg = error?.message || error || 'Failed to complete delivery';
        toast.error(errorMsg, { id: 'completeDelivery' });
      })
      .finally(() => {
        setCompletingOrderId(null);
      });
  };
  
  const toggleOrderExpansion = (orderId) => {
    if (expandedOrderId === orderId) {
      setExpandedOrderId(null);
    } else {
      setExpandedOrderId(orderId);
    }
  };
  
  const handleRefresh = () => {
    // Only set refreshing indicator if not already refreshing
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    
    // Restart location tracking to get a fresh position
    startTracking();
    
    // Refresh the appropriate data based on active tab
    const refreshPromise = activeTab === 'history'
      ? dispatch(fetchDeliveryHistory())
      : dispatch(fetchAgentProfile());

    // Wait for the refresh to complete
    refreshPromise
      .unwrap()
      .then(() => {
        toast.success("Data refreshed", {
          duration: 2000, // Short duration to avoid distraction
        });
      })
      .catch((error) => {
        toast.error(error || "Failed to refresh data");
      })
      .finally(() => {
        // Add slight delay before removing indicator to ensure map stabilizes
        setTimeout(() => {
          setIsRefreshing(false);
        }, 500);
      });
  };
  
  const openCompletionModal = (order) => {
    setSelectedOrder(order);
    setShowDeliveryModal(true);
  };
  
  const verifyAndCompleteDelivery = () => {
    // Simple validation for order
    if (!selectedOrder || !selectedOrder._id) {
      toast.error('No valid order selected');
      return;
    }
    
    // Simplified verification - for demo, accept any verification method
    // In a production app, you would validate the PIN or photo against backend data
    if (verificationMethod === 'pin') {
      // Basic PIN validation - must be any 4 digits
      if (!deliveryPin || deliveryPin.length !== 4 || !/^\d+$/.test(deliveryPin)) {
        toast.error('Please enter a 4-digit delivery PIN');
        return;
      }
    } else if (verificationMethod === 'photo') {
      // Very simplified photo check
      const fileInput = document.getElementById('file-upload');
      if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
        toast.error('Please take a photo of the delivered package');
        return;
      }
    }
    
    // All verification passed, complete the delivery
    handleCompleteDelivery(selectedOrder._id);
  };
  
  // Format date for display
  const formatTime = (dateString) => {
    if (!dateString) return 'Unknown';
    
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    }).format(date);
  };
  
  // Format date for display with day
  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    }).format(date);
  };
  
  // Calculate ETA based on distance and average speed
  const calculateETA = (order) => {
    if (!position || !position.latitude || !order?.deliveryLocation?.coordinates) {
      return 'Calculating...';
    }
    
    // Calculate distance in km
    const lat1 = position.latitude;
    const lon1 = position.longitude;
    const lat2 = order.deliveryLocation.coordinates[1];
    const lon2 = order.deliveryLocation.coordinates[0];
    
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    const distance = R * c; // Distance in km
    
    // Assume average speed of 20 km/h
    const timeInHours = distance / 20;
    const timeInMinutes = Math.round(timeInHours * 60);
    
    if (timeInMinutes < 1) {
      return 'Less than a minute';
    } else if (timeInMinutes === 1) {
      return '1 minute';
    } else {
      return `${timeInMinutes} minutes`;
    }
  };
  
  const deg2rad = (deg) => {
    return deg * (Math.PI/180);
  };

  if (!isDeliveryAgent) {
    return (
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-sm p-6">
        <div className="text-center">
          <MdDeliveryDining className="mx-auto text-gray-400" size={80} />
          <h2 className="text-xl font-semibold mt-4">You are not registered as a delivery agent</h2>
          <p className="text-gray-600 mt-2">
            Register first to manage your deliveries
          </p>
          <button
            onClick={() => navigate("/deliver/register")}
            className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-6 rounded-md"
          >
            Register Now
          </button>
        </div>
      </div>
    );
  }

  if (isProfileLoading && activeOrders.length === 0 && deliveryHistory.length === 0) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-64px)]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-semibold text-gray-800">My Deliveries</h1>
        <div className="flex items-center">
          {position && position.latitude && position.longitude && (
            <div className="text-sm text-gray-600 flex items-center mr-3">
              <MdLocationOn className="text-indigo-500 mr-1" />
              <span className="hidden sm:inline">Location tracking active</span>
              <span className="sm:hidden">Tracking</span>
            </div>
          )}
          <button 
            onClick={handleRefresh} 
            disabled={isRefreshing}
            className="flex items-center text-sm bg-indigo-50 text-indigo-600 px-3 py-1 rounded-md hover:bg-indigo-100 disabled:opacity-70 transition-opacity"
          >
            <MdRefresh className={`mr-1 ${isRefreshing ? 'animate-spin' : ''}`} size={16} />
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>
      
      {/* Performance Metrics Section - Only show on current deliveries tab */}
      {activeTab === 'current' && (
        <div className="mb-6">
          <DeliveryMetrics 
            stats={{
              completedDeliveries: deliveryHistory.length,
              rating: 4.8, // This would come from the API in a real app
              totalRatings: deliveryHistory.length,
              estimatedEarnings: deliveryHistory.length * 8.5, // Simplified calculation
              totalDistance: deliveryHistory.length * 5.2, // Simplified calculation
              averageTime: 25 * 60 // 25 minutes in seconds
            }} 
          />
        </div>
      )}
      
      {/* Tabs */}
      <div className="bg-white rounded-t-lg overflow-hidden border border-gray-200 mb-4">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('current')}
            className={`flex-1 py-3 px-4 text-center text-sm font-medium ${
              activeTab === 'current'
                ? 'text-indigo-600 border-b-2 border-indigo-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className="flex items-center justify-center">
              <MdLocalShipping className="mr-2" size={18} />
              Current Deliveries {activeOrders.length > 0 && `(${activeOrders.length})`}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-3 px-4 text-center text-sm font-medium ${
              activeTab === 'history'
                ? 'text-indigo-600 border-b-2 border-indigo-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className="flex items-center justify-center">
              <MdHistory className="mr-2" size={18} />
              Delivery History {deliveryHistory.length > 0 && `(${deliveryHistory.length})`}
            </span>
          </button>
        </div>
      </div>

      {/* Current Deliveries Tab */}
      {activeTab === 'current' && (
        <>
          {activeOrders.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-12 text-center">
              <FiPackage className="mx-auto text-gray-400" size={64} />
              <h3 className="text-lg font-medium text-gray-800 mt-4">No Active Deliveries</h3>
              <p className="text-gray-600 mt-2 max-w-md mx-auto">
                You don't have any active deliveries at the moment.
                Check nearby orders to start delivering.
              </p>
              <button
                onClick={() => navigate('/deliver/nearby-orders')}
                className="mt-6 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-6 rounded-md"
              >
                Find Orders to Deliver
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {activeOrders.map((order, index) => (
                <div
                  key={order._id || `order-${index}`}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
                >
                  {/* Order progress bar */}
                  <div className="w-full h-2 bg-gray-200">
                    <div className={`h-full ${
                      order.status === 'out_for_delivery' ? 'bg-yellow-500 w-3/4' : 'bg-green-500 w-1/2'
                    }`}></div>
                  </div>
                  
                  {/* Order header with status */}
                  <div className="bg-yellow-50 px-6 py-4 border-b border-yellow-100">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
                      <div className="flex items-center mb-3 sm:mb-0">
                        <div className="bg-yellow-100 rounded-full p-2 mr-3">
                          <MdDeliveryDining className="text-yellow-700" size={20} />
                        </div>
                        <div>
                          <span className="font-medium text-gray-800">
                            Order #{order._id?.substr(-6) || 'Unknown'}
                          </span>
                          <div className="flex items-center text-sm text-yellow-700 mt-1">
                            <FiClock className="mr-1" size={14} />
                            <span>{order.status.replace('_', ' ')}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center">
                        <div className="mr-4 text-right hidden sm:block">
                          <div className="text-xs text-gray-500">ETA</div>
                          <div className="text-sm font-medium text-gray-800">{calculateETA(order)}</div>
                        </div>
                        
                        <button 
                          onClick={() => toggleOrderExpansion(order._id)}
                          className={`flex items-center border text-gray-700 px-3 py-1 rounded-md text-sm hover:bg-gray-50 transition-colors ${
                            expandedOrderId === order._id 
                              ? 'bg-gray-200 border-gray-300' 
                              : 'bg-white border-gray-300'
                          }`}
                        >
                          <MdMap className="mr-1" />
                          {expandedOrderId === order._id ? 'Hide Map' : 'Show Map'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <DeliveryProgressBar status={order.status} />

                  {/* Map section (expanded view) */}
                  {expandedOrderId === order._id && (
                    <div className="border-b border-gray-200">
                      <DeliveryMap 
                        key={`map-${order._id}`}
                        agentLocation={position}
                        pickupLocation={order.pickupLocation}
                        deliveryLocation={order.deliveryLocation}
                        orderStatus={order.status}
                        height="350px"
                        orderDetails={order} // Pass the entire order object for detailed pickup information
                      />
                      
                      <div className="p-4 bg-gray-50 flex flex-col md:flex-row md:justify-between text-sm">
                        <div className="flex items-center mb-3 md:mb-0">
                          <MdRestaurant className="text-orange-500 mr-2" size={18} />
                          <div>
                            <div className="text-xs text-gray-500">Pickup</div>
                            <div className="font-medium text-gray-700 mt-0.5">
                              {order.pickupLocation?.coordinates ? 
                                `${formatCoordinate(order.pickupLocation.coordinates[1])}, ${formatCoordinate(order.pickupLocation.coordinates[0])}` : 
                                'No coordinates available'}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center">
                          <MdPerson className="text-green-500 mr-2" size={18} />
                          <div>
                            <div className="text-xs text-gray-500">Delivery</div>
                            <div className="font-medium text-gray-700 mt-0.5">
                              {order.deliveryLocation?.coordinates ? 
                                `${formatCoordinate(order.deliveryLocation.coordinates[1])}, ${formatCoordinate(order.deliveryLocation.coordinates[0])}` : 
                                'No coordinates available'}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Order details */}
                  <div className="p-6">
                    {/* Customer info */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-4">
                      <div>
                        <h4 className="text-sm font-medium text-gray-500 mb-2">DELIVERY INFO</h4>
                        <div className="text-gray-800 mb-1">
                          <span className="font-medium">Address:</span> {order.deliveryAddress || 'No address provided'}
                        </div>
                        <div className="text-gray-800">
                          <span className="font-medium">Contact:</span> {order.contactNumber || 'No contact provided'}
                        </div>
                        
                        {/* Delivery time */}
                        {order.estimatedDeliveryTime && (
                          <div className="mt-1 text-gray-800">
                            <span className="font-medium">Estimated delivery:</span>{' '}
                            {new Date(order.estimatedDeliveryTime).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        )}
                        
                        {/* ETA for mobile */}
                        <div className="mt-1 text-gray-800 sm:hidden">
                          <span className="font-medium">ETA:</span> {calculateETA(order)}
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium text-gray-500 mb-2">PAYMENT</h4>
                        <div className="flex justify-between">
                          <span className="text-gray-800">Method</span>
                          <span className="text-gray-800 font-medium capitalize">{order.paymentMethod || 'Unknown'}</span>
                        </div>
                        <div className="flex justify-between mt-1">
                          <span className="text-gray-800">Subtotal</span>
                          <span className="text-gray-800">${order.subtotal?.toFixed(2) || '0.00'}</span>
                        </div>
                        <div className="flex justify-between mt-1">
                          <span className="text-gray-800">Delivery Fee</span>
                          <span className="text-gray-800">${(order.total - order.subtotal)?.toFixed(2) || '0.00'}</span>
                        </div>
                        <div className="flex justify-between mt-1">
                          <span className="text-gray-800 font-medium">Total</span>
                          <span className="text-gray-800 font-medium">${order.total?.toFixed(2) || '0.00'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="h-px bg-gray-200 my-4"></div>

                    {/* Items */}
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-500 mb-2">ITEMS ({order.items.length})</h4>
                      <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                        {order.items.map((item, index) => (
                          <div key={index} className="flex justify-between text-sm">
                            <span className="text-gray-800">
                              {item.quantity} × {item.name}
                            </span>
                            <span className="text-gray-600">
                              ${(item.price * item.quantity).toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Notes section */}
                    <div className="bg-gray-50 p-3 rounded-lg text-sm mb-4">
                      <div className="flex items-start mb-1">
                        <MdNotes className="text-gray-500 mr-2 mt-0.5" size={16} />
                        <h4 className="font-medium text-gray-700">Delivery Notes</h4>
                      </div>
                      <p className="text-gray-600">
                        {order.deliveryInstructions || 'No special instructions provided.'}
                      </p>
                    </div>

                    {/* Action buttons */}
                    <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${
                          order.deliveryLocation?.coordinates?.[1] || 0
                        },${
                          order.deliveryLocation?.coordinates?.[0] || 0
                        }&origin=${
                          position.latitude || currentLocation.latitude
                        },${
                          position.longitude || currentLocation.longitude
                        }`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center py-2 px-3 border border-gray-300 rounded-md bg-white text-gray-700 hover:bg-gray-50"
                      >
                        <MdDirections className="mr-2" size={18} />
                        <span>Directions</span>
                      </a>
                      
                      <a
                        href={`tel:${order.contactNumber}`}
                        className="flex items-center justify-center py-2 px-3 border border-gray-300 rounded-md bg-white text-gray-700 hover:bg-gray-50"
                      >
                        <MdCall className="mr-2" size={18} />
                        <span>Call</span>
                      </a>
                      
                      <button
                        onClick={() => navigate('/deliver/nearby-orders')}
                        className="flex items-center justify-center py-2 px-3 border border-gray-300 rounded-md bg-white text-gray-700 hover:bg-gray-50 md:col-span-1 col-span-2"
                      >
                        <FiPackage className="mr-2" />
                        <span>Other Orders</span>
                      </button>
                      
                      <button
                        onClick={() => openCompletionModal(order)}
                        disabled={isActionPending || completingOrderId === order._id}
                        className="flex items-center justify-center py-2 px-3 bg-green-600 hover:bg-green-700 text-white rounded-md disabled:opacity-70 col-span-2 md:col-span-1"
                      >
                        {completingOrderId === order._id ? (
                          <span className="inline-flex items-center">
                            <svg
                              className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              ></circle>
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                              ></path>
                            </svg>
                            Completing...
                          </span>
                        ) : (
                          <>
                            <MdCheck className="mr-2" size={18} />
                            <span>Complete Delivery</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Delivery History Tab */}
      {activeTab === 'history' && (
        <>
          {isProfileLoading ? (
            <div className="bg-white rounded-lg shadow-sm p-12 text-center">
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
              </div>
              <p className="mt-4 text-gray-600">Loading delivery history...</p>
            </div>
          ) : deliveryHistory.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-12 text-center">
              <MdHistory className="mx-auto text-gray-400" size={64} />
              <h3 className="text-lg font-medium text-gray-800 mt-4">No Delivery History</h3>
              <p className="text-gray-600 mt-2 max-w-md mx-auto">
                You haven't completed any deliveries yet.
                Check nearby orders to start delivering.
              </p>
              <button
                onClick={() => navigate('/deliver/nearby-orders')}
                className="mt-6 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-6 rounded-md"
              >
                Find Orders to Deliver
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Order ID
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Delivered
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Customer
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Address
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Items
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {deliveryHistory.map((order, index) => (
                      <tr key={order._id || `history-order-${index}`} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">#{order?._id?.substr(-6) || 'Unknown'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{formatDate(order.actualDeliveryTime || order.updatedAt)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{order.customerName || 'N/A'}</div>
                          <div className="text-sm text-gray-500">{order.contactNumber || 'No contact'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">${order.total?.toFixed(2) || '0.00'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 max-w-xs truncate">{order.deliveryAddress || 'No address'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {order.items?.length || 0} items
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
      
      {/* Delivery Completion Modal */}
      {showDeliveryModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
            <div className="bg-green-50 px-6 py-4 border-b border-green-100">
              <h3 className="text-lg font-medium text-gray-800">Complete Delivery</h3>
              <p className="text-sm text-gray-600 mt-1">
                Verify delivery for Order #{selectedOrder?._id?.substr(-6) || 'Unknown'}
              </p>
            </div>
            
            <div className="p-6">
              <div className="mb-4">
                <div className="flex border-b border-gray-200 mb-4">
                  <button
                    onClick={() => setVerificationMethod('pin')}
                    className={`py-2 px-4 text-sm font-medium ${
                      verificationMethod === 'pin'
                        ? 'text-green-600 border-b-2 border-green-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Delivery PIN
                  </button>
                  <button
                    onClick={() => setVerificationMethod('photo')}
                    className={`py-2 px-4 text-sm font-medium ${
                      verificationMethod === 'photo'
                        ? 'text-green-600 border-b-2 border-green-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Photo Proof
                  </button>
                </div>
                
                {verificationMethod === 'pin' && (
                  <div>
                    <label htmlFor="deliveryPin" className="block text-sm font-medium text-gray-700 mb-1">
                      Enter the 4-digit delivery PIN
                    </label>
                    <input
                      type="text"
                      id="deliveryPin"
                      value={deliveryPin}
                      onChange={(e) => setDeliveryPin(e.target.value.slice(0, 4))}
                      maxLength={4}
                      placeholder="e.g. 1234"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Ask the customer for the PIN they received via email/SMS
                    </p>
                  </div>
                )}
                
                {verificationMethod === 'photo' && (
                  <div className="text-center">
                    <div className="mb-4">
                      <label htmlFor="deliveryPhoto" className="block text-sm font-medium text-gray-700 mb-1">
                        Take a photo of the delivered package
                      </label>
                      <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                        <div className="space-y-1 text-center">
                          <MdCamera className="mx-auto text-gray-400" size={48} />
                          <div className="flex text-sm text-gray-600">
                            <label
                              htmlFor="file-upload"
                              className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none"
                            >
                              <span>Take a photo</span>
                              <input id="file-upload" name="file-upload" type="file" accept="image/*" capture className="sr-only" />
                            </label>
                          </div>
                          <p className="text-xs text-gray-500">JPG, PNG, or HEIC up to 10MB</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="mb-4 mt-6">
                  <label htmlFor="deliveryNotes" className="block text-sm font-medium text-gray-700 mb-1">
                    Delivery Notes (optional)
                  </label>
                  <textarea
                    id="deliveryNotes"
                    value={deliveryNotes}
                    onChange={(e) => setDeliveryNotes(e.target.value)}
                    placeholder="Any notes about the delivery..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  ></textarea>
                </div>
              </div>
              
              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <button
                  onClick={() => setShowDeliveryModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={verifyAndCompleteDelivery}
                  disabled={isActionPending || completingOrderId === selectedOrder?._id}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-md text-sm font-medium text-white disabled:opacity-70"
                >
                  {completingOrderId === selectedOrder?._id ? (
                    <span className="inline-flex items-center">
                      <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Processing...
                    </span>
                  ) : (
                    'Complete Delivery'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyDeliveries; 