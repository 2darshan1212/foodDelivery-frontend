import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchNearbyOrders, acceptDeliveryOrder, rejectDeliveryOrder } from '../../redux/deliverySlice';
import { MdDirections, MdDeliveryDining, MdLocationOff, MdMyLocation, MdRefresh, MdMap, MdFastfood, MdLocalOffer } from 'react-icons/md';
import { BsCheck2Circle, BsXCircle } from 'react-icons/bs';
import { FiPackage, FiClock, FiAlertCircle } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import useLocationTracking from '../../hooks/useLocationTracking';
import LocationMap from './LocationMap';

// Helper functions for location and distance handling
const formatCoordinate = (coord) => {
  if (coord === null || coord === undefined || isNaN(coord)) return "N/A";
  return coord.toFixed(6);
};

// Calculate distance between two points in km using Haversine formula
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  // Handle invalid or missing coordinates
  if (!lat1 || !lon1 || !lat2 || !lon2 || 
      isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)) {
    return 9999; // Return a large distance as fallback
  }
  
  // Convert degrees to radians
  const radLat1 = (Math.PI * lat1) / 180;
  const radLon1 = (Math.PI * lon1) / 180;
  const radLat2 = (Math.PI * lat2) / 180;
  const radLon2 = (Math.PI * lon2) / 180;
  
  // Haversine formula
  const dLat = radLat2 - radLat1;
  const dLon = radLon2 - radLon1;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(radLat1) * Math.cos(radLat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = 6371 * c; // Earth radius in km
  
  return distance;
};

// Simple check for significant location change
const hasLocationChangedSignificantly = (lastPosition, currentPosition, threshold = 0.1) => {
  if (!lastPosition?.latitude || !lastPosition?.longitude || 
      !currentPosition?.latitude || !currentPosition?.longitude) {
    return true; // Default to true if coordinates are missing
  }
  
  // Use our calculateDistance function to determine if position changed significantly
  const distance = calculateDistance(
    lastPosition.latitude,
    lastPosition.longitude,
    currentPosition.latitude,
    currentPosition.longitude
  );
  
  return distance > threshold;
};

// Threshold for location change detection (in km)
const LOCATION_CHANGE_THRESHOLD = 0.1; // 100 meters

const NearbyOrders = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { 
    isDeliveryAgent, 
    isAvailable, 
    nearbyOrders, 
    isNearbyOrdersLoading, 
    isNearbyOrdersError,
    nearbyOrdersError,
    isActionPending,
    isRejecting
  } = useSelector((state) => state.delivery);
  
  // Use the location tracking hook
  const { 
    position, 
    isTracking, 
    error: locationError
  } = useLocationTracking(isDeliveryAgent && isAvailable);
  
  const [refreshInterval, setRefreshInterval] = useState(null);
  const [acceptingOrderId, setAcceptingOrderId] = useState(null);
  const [rejectingOrderId, setRejectingOrderId] = useState(null);
  const [lastFetchPosition, setLastFetchPosition] = useState({ latitude: null, longitude: null });
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Memoize position data to prevent unnecessary re-renders
  const memoizedPosition = useMemo(() => {
    if (!position.latitude || !position.longitude) return null;
    
    return {
      latitude: position.latitude,
      longitude: position.longitude,
      accuracy: position.accuracy,
      timestamp: position.timestamp
    };
  }, [position.latitude, position.longitude, position.accuracy, position.timestamp]);

  // Memoize nearby orders to prevent re-renders when they haven't changed
  const memoizedNearbyOrders = useMemo(() => {
    return nearbyOrders || [];
  }, [nearbyOrders]);

  // We already have formatCoordinate defined at the top level

  // Fetch nearby orders function (to use in multiple places)
  const loadNearbyOrders = useCallback(() => {
    if (isDeliveryAgent && isAvailable && position.latitude && position.longitude) {
      dispatch(fetchNearbyOrders())
        .unwrap()
        .then(response => {
          if (response.orders.length === 0) {
            toast.info("No orders available in your area right now");
          } else {
            toast.success(`Found ${response.orders.length} nearby orders`);
          }
          // Update refresh key to force map refresh without rerendering parent
          setRefreshKey(prevKey => prevKey + 1);
        })
        .catch((error) => {
          toast.error(error || "Failed to load nearby orders");
        });
      
      setLastFetchPosition({ 
        latitude: position.latitude, 
        longitude: position.longitude 
      });
    }
  }, [dispatch, isDeliveryAgent, isAvailable, position.latitude, position.longitude]);

  // Fetch nearby orders when component mounts or location changes significantly
  useEffect(() => {
    if (isDeliveryAgent && isAvailable && isTracking) {
      // Check if location has changed significantly (more than 100 meters)
      // Use the utility function to check if location has changed significantly
      const hasLocationChanged = hasLocationChangedSignificantly(
        lastFetchPosition,
        position,
        LOCATION_CHANGE_THRESHOLD
      );
      
      if (hasLocationChanged && position.latitude && position.longitude) {
        loadNearbyOrders();
      }
      
      // Set up periodic refresh every 30 seconds regardless of location changes
      if (autoRefreshEnabled && !refreshInterval) {
        const interval = setInterval(() => {
          if (position.latitude && position.longitude) {
            // Use quieter background refresh that only updates if orders changed
            dispatch(fetchNearbyOrders())
              .unwrap()
              .then((response) => {
                // Skip toast notification for background refreshes
                
                // Compare orders to see if they've changed
                const ordersChanged = haveOrdersChanged(prevOrdersRef.current, response.orders);
                
                // Only update UI and refresh key if orders actually changed
                if (ordersChanged) {
                  console.log("Orders changed during background refresh, updating map");
                  setRefreshKey(prevKey => prevKey + 1);
                  prevOrdersRef.current = [...response.orders];
                } else {
                  console.log("No change in orders during background refresh");
                }
              })
              .catch(error => console.error("Auto-refresh error:", error));
          }
        }, 30000);
        
        setRefreshInterval(interval);
      }
    }
    
    // Clean up interval on component unmount
    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [isDeliveryAgent, isAvailable, isTracking, position.latitude, position.longitude, autoRefreshEnabled, refreshInterval, lastFetchPosition, loadNearbyOrders]);
  
  // Track previous orders for comparison
  const prevOrdersRef = useRef(nearbyOrders || []);
  
  // Force load if there are no orders and we have position
  useEffect(() => {
    const shouldRefresh = 
      isDeliveryAgent && 
      isAvailable && 
      position.latitude && 
      position.longitude && 
      !isNearbyOrdersLoading && 
      nearbyOrders.length === 0;
      
    if (shouldRefresh) {
      // Wait 2 seconds before refreshing to avoid spamming
      const timer = setTimeout(() => {
        loadNearbyOrders();
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [isDeliveryAgent, isAvailable, position, isNearbyOrdersLoading, nearbyOrders.length, loadNearbyOrders]);
  
  // Helper function for radians conversion
  const deg2rad = (deg) => {
    return deg * (Math.PI/180);
  };
  
  const handleRefresh = useCallback(() => {
    // Prevent refresh spam by checking last refresh time
    const now = Date.now();
    const REFRESH_COOLDOWN = 3000; // 3 seconds cooldown
    
    if (isRefreshing) {
      toast.info("Already refreshing...");
      return;
    }
    
    const lastRefreshTime = localStorage.getItem('lastMapRefreshTime');
    if (lastRefreshTime && now - parseInt(lastRefreshTime) < REFRESH_COOLDOWN) {
      toast.info("Please wait a moment before refreshing again");
      return;
    }
    
    // Set refreshing state for UI feedback
    setIsRefreshing(true);
    localStorage.setItem('lastMapRefreshTime', now.toString());
    
    loadNearbyOrders();
    toast.success("Refreshing map and orders...");
    
    // Force a map refresh after loading
    setTimeout(() => {
      setRefreshKey(prevKey => prevKey + 1);
      setIsRefreshing(false);
    }, 1000);
  }, [loadNearbyOrders, isRefreshing]);
  
  const handleAcceptOrder = useCallback((orderId) => {
    setAcceptingOrderId(orderId);
    
    dispatch(acceptDeliveryOrder(orderId))
      .unwrap()
      .then(() => {
        toast.success("Order accepted successfully!");
        navigate("/deliver/my-deliveries");
      })
      .catch((error) => {
        toast.error(error || "Failed to accept order");
        setAcceptingOrderId(null);
      });
  }, [dispatch, navigate]);
  
  const handleRejectOrder = useCallback((orderId) => {
    setRejectingOrderId(orderId);
    
    dispatch(rejectDeliveryOrder(orderId))
      .unwrap()
      .then(() => {
        toast.success("Order rejected successfully");
        setRejectingOrderId(null);
      })
      .catch((error) => {
        toast.error(error || "Failed to reject order");
        setRejectingOrderId(null);
      });
  }, [dispatch]);
  
  const toggleAutoRefresh = useCallback(() => {
    if (autoRefreshEnabled) {
      // Disable auto refresh
      if (refreshInterval) {
        clearInterval(refreshInterval);
        setRefreshInterval(null);
      }
      setAutoRefreshEnabled(false);
      toast.info("Auto-refresh disabled");
    } else {
      // Enable auto refresh
      setAutoRefreshEnabled(true);
      toast.info("Auto-refresh enabled - orders will update every 30 seconds");
    }
  }, [autoRefreshEnabled, refreshInterval]);
  
  // Format amount to local currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
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

  // Only render map if we have valid position data
  const shouldRenderMap = memoizedPosition && 
                         memoizedPosition.latitude && 
                         memoizedPosition.longitude;

  // Helper function to check if orders have changed
  const haveOrdersChanged = useCallback((oldOrders, newOrders) => {
    if (!oldOrders || !newOrders) return true;
    if (oldOrders.length !== newOrders.length) return true;
    
    // Create a map of order IDs for faster comparison
    const oldOrderMap = new Map();
    for (const order of oldOrders) {
      oldOrderMap.set(order._id, order);
    }
    
    // Check if any order exists in newOrders that's not in oldOrders
    for (const newOrder of newOrders) {
      if (!oldOrderMap.has(newOrder._id)) {
        return true;
      }
    }
    
    return false;
  }, []);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-semibold text-gray-800">
          Nearby Orders {nearbyOrders.length > 0 && `(${nearbyOrders.length})`}
        </h1>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing || isNearbyOrdersLoading}
            className={`flex items-center bg-indigo-50 text-indigo-600 px-3 py-1 rounded-md hover:bg-indigo-100 disabled:opacity-70 disabled:cursor-not-allowed ${isRefreshing ? 'animate-pulse' : ''}`}
          >
            <MdRefresh className={`mr-1 ${isRefreshing || isNearbyOrdersLoading ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </button>
          
          <button
            onClick={toggleAutoRefresh}
            className={`px-3 py-1 rounded-md text-sm ${
              autoRefreshEnabled 
                ? 'bg-green-50 text-green-600 hover:bg-green-100' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Auto-refresh: {autoRefreshEnabled ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">Your Location</h2>
          <div className={`flex items-center ${isTracking ? 'text-green-600' : 'text-red-600'}`}>
            <div className={`w-2 h-2 rounded-full mr-2 ${isTracking ? 'bg-green-600 animate-pulse' : 'bg-red-600'}`}></div>
            <span className="text-sm">{isTracking ? 'Tracking' : 'Not tracking'}</span>
          </div>
        </div>
        
        <div className="flex space-x-4 mb-4">
          <div className="bg-gray-50 p-2 rounded flex items-center">
            <MdMyLocation className="text-indigo-500 mr-2" />
            <div>
              <div className="text-xs text-gray-500">Latitude</div>
              <div className="text-sm font-medium">{formatCoordinate(position.latitude)}</div>
            </div>
          </div>
          <div className="bg-gray-50 p-2 rounded flex items-center">
            <MdMyLocation className="text-indigo-500 mr-2" />
            <div>
              <div className="text-xs text-gray-500">Longitude</div>
              <div className="text-sm font-medium">{formatCoordinate(position.longitude)}</div>
            </div>
          </div>
        </div>
        
        {/* Map showing current location and nearby orders with extreme stability */}
        {shouldRenderMap && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center">
                <MdMap className="text-indigo-500 mr-2" />
                <h4 className="text-sm font-medium text-gray-700">Your Location & Nearby Orders</h4>
              </div>
              <button 
                onClick={loadNearbyOrders} 
                className="flex items-center text-xs bg-white border border-gray-300 rounded px-2 py-1 text-gray-700 hover:bg-gray-50"
              >
                <MdRefresh className="mr-1" size={14} />
                Refresh Map
              </button>
            </div>
            
            {/* Simplified map container with fixed dimensions */}
            <div 
              className="border border-gray-200 rounded-lg overflow-hidden relative"
              style={{ height: "350px", width: "100%" }}
            >
              <LocationMap 
                key={`nearby-orders-map-${refreshKey}`}
                latitude={memoizedPosition.latitude} 
                longitude={memoizedPosition.longitude}
                zoom={14}
                height="350px"
                nearbyOrders={memoizedNearbyOrders}
                onOrderClick={handleAcceptOrder}
                onRejectClick={handleRejectOrder}
                showAllOrders={true}
              />
            </div>
            
            <div className="mt-2 text-xs text-gray-500 text-center">
              Map shows your current location and all confirmed orders regardless of distance.
              Orders within 2km are highlighted. Click on a marker to see order details and accept or reject it.
            </div>
            
            {/* Add a map legend to explain the markers */}
            <div className="mt-3 bg-white rounded p-2 border border-gray-200">
              <div className="text-xs font-medium text-gray-700 mb-1">Map Legend:</div>
              <div className="flex flex-wrap gap-3">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-blue-500 rounded-full mr-1"></div>
                  <span className="text-xs text-gray-600">Your Location</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-red-500 rounded-full mr-1"></div>
                  <span className="text-xs text-gray-600">Regular Order</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-green-500 rounded-full mr-1"></div>
                  <span className="text-xs text-gray-600">Confirmed Order</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-blue-300 rounded-full opacity-30 mr-1"></div>
                  <span className="text-xs text-gray-600">2km Delivery Radius</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-red-500 rounded-full opacity-50 mr-1"></div>
                  <span className="text-xs text-gray-600">Orders Outside Range</span>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {locationError && (
          <div className="mt-3 text-sm text-red-600 p-2 bg-red-50 rounded-lg">
            {locationError}
          </div>
        )}
      </div>

      {isNearbyOrdersLoading && (
        <div className="flex justify-center my-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
      )}

      {isNearbyOrdersError && (
        <div className="bg-red-50 p-4 rounded-md text-red-700 mb-6">
          <div className="flex items-start">
            <FiAlertCircle className="mr-2 mt-0.5" size={18} />
            <div>
              <p className="font-medium">Error loading orders</p>
              <p>{nearbyOrdersError || "Something went wrong. Please try again."}</p>
            </div>
          </div>
        </div>
      )}

      {!isNearbyOrdersLoading && !nearbyOrders.length && (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <FiPackage className="mx-auto text-gray-400" size={64} />
          <h3 className="text-lg font-medium text-gray-800 mt-4">No nearby orders available</h3>
          <p className="text-gray-600 mt-2 max-w-md mx-auto">
            There are no orders available for delivery in your area right now.
            We'll automatically refresh to check for new orders.
          </p>
        </div>
      )}

      {/* Nearby Orders List */}
      {!isNearbyOrdersLoading && nearbyOrders.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Available Orders ({nearbyOrders.length})
            {nearbyOrders.filter(order => order.status === 'out_for_delivery' && order.deliveryAgent).length > 0 && (
              <span className="ml-2 text-sm text-green-600">
                {nearbyOrders.filter(order => order.status === 'out_for_delivery' && order.deliveryAgent).length} active
              </span>
            )}
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {nearbyOrders.map((order) => {
              // Determine if order is active based on status or availability
              const isActive = order.status === 'confirmed' || order.status === 'ready_for_pickup' || order.status === 'out_for_delivery' || !order.hasOwnProperty('status');
              
              return (
                <div 
                  key={order._id} 
                  className={`bg-white rounded-lg shadow-sm border ${isActive ? 'border-green-400' : 'border-gray-200'} overflow-hidden hover:shadow-md transition-shadow`}
                >
                  {order.status === 'out_for_delivery' && order.deliveryAgent && (
                    <div className="bg-green-500 text-white text-xs font-medium text-center py-1">
                      YOUR ACTIVE DELIVERY
                    </div>
                  )}
                  <div className={`${isActive ? 'bg-green-50' : 'bg-indigo-50'} px-4 py-3 border-b ${isActive ? 'border-green-100' : 'border-indigo-100'} flex justify-between items-center`}>
                    <div className="flex items-center">
                      <MdFastfood className={`${isActive ? 'text-green-600' : 'text-indigo-600'} mr-2`} size={18} />
                      <span className={`font-medium ${isActive ? 'text-green-900' : 'text-indigo-900'}`}>
                        Order #{order._id.slice(-6)}
                        {isActive && (
                          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Active
                          </span>
                        )}
                      </span>
                    </div>
                    {order.createdAt && (
                      <div className={`text-xs ${isActive ? 'text-green-700' : 'text-indigo-700'} flex items-center`}>
                        <FiClock className="mr-1" />
                        {formatTime(order.createdAt)}
                      </div>
                    )}
                  </div>
                  
                  <div className="p-4">
                    <div className="mb-4">
                      <div className="flex items-center mb-2">
                        <MdLocalOffer className="text-gray-500 mr-1" size={16} />
                        <span className="text-sm font-medium text-gray-700">Order Summary</span>
                      </div>
                      <div className="bg-gray-50 p-3 rounded text-sm">
                        <div className="flex justify-between mb-1">
                          <span className="text-gray-600">Items:</span>
                          <span className="font-medium">{order.items.length}</span>
                        </div>
                        
                        <div className="flex justify-between mb-1">
                          <span className="text-gray-600">Subtotal:</span>
                          <span className="font-medium">{formatCurrency(order.subtotal)}</span>
                        </div>
                        
                        <div className="flex justify-between">
                          <span className="text-gray-600">Total:</span>
                          <span className="font-medium text-indigo-700">{formatCurrency(order.total)}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mb-4">
                      <div className="text-xs text-gray-500 mb-1">Delivery address</div>
                      <div className="text-sm">{order.deliveryAddress}</div>
                    </div>
                    
                    {/* Display distance */}
                    <div className="mb-4">
                      <div className="text-xs text-gray-500 mb-1">Distance from you</div>
                      <div className="text-sm font-medium flex items-center">
                        {order.distance ? (
                          // Use the backend-calculated distance if available
                          <span className={order.distance.value <= 2000 ? 'text-green-600' : 'text-amber-600'}>
                            {order.distance.text}
                            {order.distance.value <= 2000 && (
                              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Within range
                              </span>
                            )}
                          </span>
                        ) : (
                          // Fall back to frontend calculation if backend doesn't provide distance
                          position.latitude && position.longitude && 
                          order.pickupLocation && 
                          order.pickupLocation.coordinates && 
                          order.pickupLocation.coordinates.length === 2 ? (
                            <span>
                              {calculateDistance(
                                position.latitude,
                                position.longitude,
                                order.pickupLocation.coordinates[1],
                                order.pickupLocation.coordinates[0]
                              ).toFixed(1)} km
                            </span>
                          ) : (
                            <span className="text-gray-500">Unknown</span>
                          )
                        )}
                      </div>
                    </div>
                    
                    <div className="mt-4 flex">
                      {order.status === 'out_for_delivery' && order.deliveryAgent ? (
                        <button
                          onClick={() => navigate(`/deliver/my-deliveries`)}
                          className="w-full flex items-center justify-center px-4 py-2 rounded-md text-white bg-green-600 hover:bg-green-700"
                        >
                          <MdDeliveryDining className="mr-2" />
                          Deliver
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => handleAcceptOrder(order._id)}
                            disabled={isActionPending || acceptingOrderId === order._id || rejectingOrderId === order._id}
                            className={`flex-1 mr-2 flex items-center justify-center px-4 py-2 rounded-md text-white
                              ${isActionPending || acceptingOrderId === order._id || rejectingOrderId === order._id
                                ? 'bg-gray-400'
                                : 'bg-green-600 hover:bg-green-700'
                              }`}
                          >
                            {acceptingOrderId === order._id ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                                Accepting...
                              </>
                            ) : (
                              <>
                                <BsCheck2Circle className="mr-2" />
                                Accept
                              </>
                            )}
                          </button>
                          
                          <button
                            onClick={() => handleRejectOrder(order._id)}
                            disabled={isActionPending || acceptingOrderId === order._id || rejectingOrderId === order._id}
                            className={`flex-1 ml-2 flex items-center justify-center px-4 py-2 rounded-md text-white
                              ${isActionPending || acceptingOrderId === order._id || rejectingOrderId === order._id
                                ? 'bg-gray-400'
                                : 'bg-red-600 hover:bg-red-700'
                              }`}
                          >
                            {rejectingOrderId === order._id ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                                Rejecting...
                              </>
                            ) : (
                              <>
                                <BsXCircle className="mr-2" />
                                Reject
                              </>
                            )}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default NearbyOrders; 