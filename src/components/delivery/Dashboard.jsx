import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useSocket } from "../../context/SocketContext.jsx";
import {
  fetchAgentProfile,
  fetchNearbyOrders,
  acceptDeliveryOrder,
  rejectDeliveryOrder,
} from "../../redux/deliverySlice";
import {
  fetchConfirmedOrders,
  acceptConfirmedOrder,
  updateAgentLocation
} from "../../redux/confirmedOrdersSlice";
import {
  MdLocationSearching,
  MdDirectionsBike,
  MdHistory,
  MdMyLocation,
  MdLocationOn,
  MdRefresh,
  MdMap,
  MdRestaurant,
  MdDeliveryDining,
  MdLocalOffer,
  MdLocationOff,
} from "react-icons/md";
import { FiPackage, FiClock } from "react-icons/fi";
import { BsCheck2Circle, BsXCircle } from "react-icons/bs";
import { toast } from "react-hot-toast";
import { Link, useNavigate } from "react-router-dom";
import useLocationTracking from "../../hooks/useLocationTracking";
import LocationMap from './LocationMap';
import ConfirmedOrdersMap from './ConfirmedOrdersMap';
import { Box, Typography, Button } from "@mui/material";
import { Refresh } from "@mui/icons-material";
import { calculateDistance, hasLocationChangedSignificantly, formatCoordinate } from '../../utils/distanceUtils';

// Threshold for location change detection (in km)
const LOCATION_CHANGE_THRESHOLD = 0.1; // 100 meters

const Dashboard = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const {
    isDeliveryAgent,
    profile,
    isProfileLoading,
    isAvailable,
    currentLocation,
    activeOrders,
    stats,
    nearbyOrders,
    isNearbyOrdersLoading,
  } = useSelector((state) => state.delivery);
  
  // Get confirmed orders data from the new confirmedOrders slice
  const {
    orders: confirmedOrders,
  } = useSelector((state) => state.confirmedOrders);

  // Use our location tracking hook
  const {
    position,
    isTracking,
    error: locationError,
    isAvailable: isLocationAvailable,
  } = useLocationTracking(isDeliveryAgent && isAvailable, 1000);

  const [acceptingOrderId, setAcceptingOrderId] = useState(null);
  const [rejectingOrderId, setRejectingOrderId] = useState(null);
  const [lastFetchPosition, setLastFetchPosition] = useState({
    latitude: null,
    longitude: null,
  });
  const [refreshKey, setRefreshKey] = useState(0);

  // Handle refreshing orders with debounce
  const [isRefreshing, setIsRefreshing] = useState(false);
  const refreshTimeoutRef = useRef(null);

  // Memoize position data to prevent unnecessary re-renders
  const memoizedPosition = useMemo(() => {
    if (!position.latitude || !position.longitude) return null;

    return {
      latitude: position.latitude,
      longitude: position.longitude,
      accuracy: position.accuracy,
      timestamp: position.timestamp,
    };
  }, [
    position.latitude,
    position.longitude,
    position.accuracy,
    position.timestamp,
  ]);

  // Memoize nearby orders to prevent re-renders when they haven't changed
  const memoizedNearbyOrders = useMemo(() => {
    return nearbyOrders || [];
  }, [nearbyOrders]);
  
  // Get confirmed orders data from the Redux store
  const { 
    pickupPoints: confirmedPickupPoints, 
    deliveryPoints: confirmedDeliveryPoints,
    distances: confirmedDistances,
    estimatedTravelTimes,
    isLoading: isLoadingConfirmedOrders,
    pickupPoints
  } = useSelector(state => state.confirmedOrders);
  
  // Memoize orders and pickup points with enhanced sorting
  const memoizedConfirmedOrders = useMemo(() => {
    if (!confirmedOrders || confirmedOrders.length === 0) return [];
    
    // Map orders with distance data for sorting
    const ordersWithDistance = confirmedOrders.map(order => {
      // Find matching pickup point for this order
      const matchingPickup = pickupPoints.find(point => point.orderId === order._id);
      let distance = null;
      
      if (matchingPickup && confirmedDistances[matchingPickup.orderId]) {
        distance = confirmedDistances[matchingPickup.orderId];
      } else if (order.restaurant?.location?.coordinates && position.latitude && position.longitude) {
        try {
          const restaurantLat = order.restaurant.location.coordinates[1];
          const restaurantLng = order.restaurant.location.coordinates[0];
          
          if (restaurantLat && restaurantLng) {
            distance = calculateDistance(
              position.latitude,
              position.longitude,
              restaurantLat,
              restaurantLng
            );
          }
        } catch (error) {
          console.error('Error calculating distance for order sorting:', error);
        }
      }
      
      // Check if order is within 2km delivery range
      const withinDeliveryRange = distance !== null && distance <= 2;
      
      return {
        ...order,
        distance,
        withinDeliveryRange,
        matchingPickupPoint: matchingPickup
      };
    });
    
    // Sort by distance (nearest first)
    return ordersWithDistance.sort((a, b) => {
      // First prioritize orders with calculated distances
      if (a.distance === null) return 1;
      if (b.distance === null) return -1;
      return a.distance - b.distance;
    });
  }, [confirmedOrders, pickupPoints, confirmedDistances, position.latitude, position.longitude]);
  
  // Memoize pickup points
  const memoizedPickupPoints = useMemo(() => {
    // Sort by distance (nearest first)
    return [...(confirmedPickupPoints || [])].sort((a, b) => {
      // Sort by distance (nearest first)
      const distanceA = confirmedDistances[a.orderId] || null;
      const distanceB = confirmedDistances[b.orderId] || null;
      if (distanceA === null) return 1;
      if (distanceB === null) return -1;
      return distanceA - distanceB;
    });
  }, [confirmedPickupPoints, confirmedDistances]);

  // Get socket from context
  const socket = useSocket();

  // Listen for socket events when socket is available
  useEffect(() => {
    if (socket) {
      console.log('Socket connection established in Dashboard');
      
      // Listen for confirmed order events
      const handleOrderConfirmed = () => {
        console.log('New order confirmed event received in Dashboard');
        dispatch(fetchConfirmedOrders());
      };
      
      // Listen for the custom order-confirmed event
      window.addEventListener('order-confirmed', handleOrderConfirmed);
      
      // Listen for visibility changes to refresh data when tab becomes visible
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          console.log('Tab became visible, refreshing confirmed orders');
          dispatch(fetchConfirmedOrders());
        }
      };
      
      document.addEventListener('visibilitychange', handleVisibilityChange);
      
      // Also listen for localStorage changes from other tabs
      const handleStorageChange = (e) => {
        if (e.key === 'lastConfirmedOrder' || e.key === 'confirmedOrdersUpdated') {
          console.log('Order confirmed in another tab, refreshing orders');
          dispatch(fetchConfirmedOrders());
        }
      };
      
      window.addEventListener('storage', handleStorageChange);
      
      // Initial refresh
      dispatch(fetchConfirmedOrders());

      // Clean up on unmount
      return () => {
        console.log('Dashboard component unmounting, cleaning up socket listeners');
        window.removeEventListener('order-confirmed', handleOrderConfirmed);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('storage', handleStorageChange);
      };
    }
  }, [socket, dispatch]);
  
  // Fetch agent profile and nearby orders on component mount
  useEffect(() => {
    dispatch(fetchAgentProfile());
    dispatch(fetchNearbyOrders());
    dispatch(fetchConfirmedOrders());
    
    // Setup interval to refresh confirmed orders every 30 seconds
    const refreshInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        console.log('Dashboard refreshing confirmed orders automatically');
        dispatch(fetchConfirmedOrders());
      }
    }, 30000);
    
    return () => clearInterval(refreshInterval);
  }, [dispatch]);
  
  // Handle socket events for real-time updates
  useEffect(() => {
    if (socket) {
      // Listen for new order confirmations
      socket.on('order_confirmed', (data) => {
        console.log('Real-time order confirmation received:', data);
        toast.success('New order available for delivery!', {
          icon: '🍔',
          duration: 4000
        });
        
        // Refresh confirmed orders list
        dispatch(fetchConfirmedOrders());
        
        // Dispatch a custom event that other components can listen for
        window.dispatchEvent(new CustomEvent('new-order', { detail: { type: 'NEW_ORDER', data } }));
      });
      
      return () => {
        // Clean up socket listeners
        socket.off('order_confirmed');
      };
    }
  }, [socket, dispatch]);
  
  // Fetch agent profile
  useEffect(() => {
    if (user && user._id) {
      dispatch(fetchAgentProfile())
        .unwrap()
        .catch((error) => {
          // If not a 404 (not found), show an error
          if (!error || !error.includes("not found")) {
            toast.error(error || "Failed to load delivery agent profile");
          }
        });
        
      // Fetch confirmed orders on initial load from the confirmedOrders slice
      dispatch(fetchConfirmedOrders())
        .unwrap()
        .catch((error) => {
          console.error("Failed to fetch confirmed orders:", error);
        });
    }
  }, [dispatch, user]);
  
  // Listen for localStorage changes as a fallback communication channel
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'confirmedOrdersPollingId') {
        // A new order was placed, refresh the confirmed orders list
        dispatch(fetchConfirmedOrders());
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [dispatch]);

  // Fetch nearby orders when location changes significantly
  useEffect(() => {
    if (isDeliveryAgent && isAvailable && isTracking) {
      // Use the utility function to check if location has changed significantly
      const hasLocationChanged = hasLocationChangedSignificantly(
        lastFetchPosition,
        position,
        LOCATION_CHANGE_THRESHOLD
      );

      if (hasLocationChanged && position.latitude && position.longitude) {
        // Fetch nearby orders available for delivery
        dispatch(fetchNearbyOrders())
          .unwrap()
          .catch((error) => {
            console.error("Failed to fetch nearby orders:", error);
          });
          
        // Also fetch confirmed orders to display on map using the confirmedOrders slice
        dispatch(fetchConfirmedOrders())
          .unwrap()
          .catch((error) => {
            console.error("Failed to fetch confirmed orders:", error);
          });
          
        // Update agent location in confirmedOrders slice
        dispatch(updateAgentLocation({
          latitude: position.latitude,
          longitude: position.longitude
        }));

        setLastFetchPosition({
          latitude: position.latitude,
          longitude: position.longitude,
        });
      }
    }
  }, [
    isDeliveryAgent,
    isAvailable,
    isTracking,
    position.latitude,
    position.longitude,
  ]);

  // Show location error toasts
  useEffect(() => {
    if (locationError) {
      toast.error(locationError);
    }
  }, [locationError]);

  // Helper function for formatting - using imported calculateDistance instead
  const deg2rad = (deg) => {
    return deg * (Math.PI / 180);
  };

  // Format coordinates to be more readable
  const formatCoordinate = (coord) => {
    if (coord === null || coord === undefined) return "N/A";
    return coord.toFixed(6);
  };

  // Get time since last position update
  const getTimeSinceUpdate = () => {
    if (!position.timestamp) return "N/A";

    const now = new Date().getTime();
    const seconds = Math.floor((now - position.timestamp) / 1000);

    if (seconds < 60) return `${seconds} seconds ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    return `${Math.floor(seconds / 3600)} hours ago`;
  };

  // Simple function to handle accepting an order
  const handleAcceptOrder = useCallback((orderId) => {
    if (!orderId) return;
    
    setAcceptingOrderId(orderId);
    toast.loading('Accepting order...', { id: 'acceptOrder' });
    
    // Single approach for all order types for simplicity
    const acceptPromise = pickupPoints.some(point => point.orderId === orderId)
      ? dispatch(acceptConfirmedOrder(orderId))
      : dispatch(acceptDeliveryOrder(orderId));
    
    acceptPromise
      .unwrap()
      .then(() => {
        toast.success('Order accepted successfully!', { id: 'acceptOrder' });
        
        // Store last accepted order for sync across tabs
        localStorage.setItem('lastAcceptedOrder', orderId);
        localStorage.setItem('orderAcceptedTimestamp', Date.now().toString());
        
        // Navigate to my deliveries page
        navigate('/deliver/my-deliveries');
      })
      .catch((error) => {
        const errorMsg = typeof error === 'object' && error !== null 
          ? error.message || 'Failed to accept order'
          : error || 'Failed to accept order';
        
        toast.error(errorMsg, { id: 'acceptOrder' });
        setAcceptingOrderId(null);
      });
  }, [dispatch, navigate, pickupPoints]);

  // Handle rejecting an order - use useCallback to prevent recreation on renders
  const handleRejectOrder = useCallback(
    (orderId) => {
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
    },
    [dispatch]
  );

  // Refresh nearby orders with debounce
  const handleRefreshOrders = useCallback(() => {
    // Prevent refresh spam by checking last refresh time
    const now = Date.now();
    const REFRESH_COOLDOWN = 3000; // 3 seconds cooldown

    if (isRefreshing) {
      toast.info("Already refreshing...");
      return;
    }

    const lastRefreshTime = localStorage.getItem("lastDashboardMapRefreshTime");
    if (lastRefreshTime && now - parseInt(lastRefreshTime) < REFRESH_COOLDOWN) {
      toast.info("Please wait a moment before refreshing again");
      return;
    }

    // Clear any existing timeout
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }

    // Set refreshing state for UI feedback
    setIsRefreshing(true);
    localStorage.setItem("lastDashboardMapRefreshTime", now.toString());

    dispatch(fetchNearbyOrders())
      .unwrap()
      .then(() => {
        toast.success("Orders refreshed!");

        // Update refresh key to force map refresh without rerendering parent
        // Use timeout to ensure UI has updated
        refreshTimeoutRef.current = setTimeout(() => {
          setRefreshKey((prevKey) => prevKey + 1);
          setIsRefreshing(false);
        }, 500);
      })
      .catch((error) => {
        toast.error(error || "Failed to refresh nearby orders");
        setIsRefreshing(false);
      });
  }, [dispatch, isRefreshing]);

  // Clean up timeout on unmount
  useEffect(() => {
    // Set up auto-refresh for real-time updates (every 60 seconds)
    const autoRefreshInterval = setInterval(() => {
      // Only refresh if the page is visible
      if (document.visibilityState === 'visible' && isDeliveryAgent && isAvailable) {
        dispatch(fetchConfirmedOrders());
      }
    }, 60000);
    
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      clearInterval(autoRefreshInterval);
    };
  }, [dispatch, isDeliveryAgent, isAvailable]);
  
  // Update visible state refresh
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isDeliveryAgent && isAvailable) {
        // Refresh data when tab becomes visible again
        dispatch(fetchConfirmedOrders());
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [dispatch, isDeliveryAgent, isAvailable]);

  // Only render if we have position data
  const shouldRenderMap =
    memoizedPosition && memoizedPosition.latitude && memoizedPosition.longitude;

  // Add effect to force redraw map upon coordinates change
  const prevPositionRef = useRef(null);
  useEffect(() => {
    // Initial position setup
    if (position.latitude && position.longitude && !prevPositionRef.current) {
      prevPositionRef.current = {
        latitude: position.latitude,
        longitude: position.longitude,
      };
    }

    // Force map refresh if the position changes significantly
    if (
      position.latitude &&
      position.longitude &&
      isDeliveryAgent &&
      isAvailable &&
      prevPositionRef.current
    ) {
      const hasLocationChanged =
        Math.abs(prevPositionRef.current.latitude - position.latitude) >
          0.0001 ||
        Math.abs(prevPositionRef.current.longitude - position.longitude) >
          0.0001;

      if (hasLocationChanged) {
        // Update position reference
        prevPositionRef.current = {
          latitude: position.latitude,
          longitude: position.longitude,
        };

        // Force refresh on significant movement (about 10m)
        setRefreshKey(Date.now());
      }
    }
  }, [position.latitude, position.longitude, isDeliveryAgent, isAvailable]);

  // Add a dedicated function to handle live map refresh
  const handleLiveMapRefresh = useCallback(() => {
    setRefreshKey((prevKey) => prevKey + 1);
    // Manually trigger location update
    if (position.latitude && position.longitude) {
      toast.success("Location refreshed", { duration: 1500 });
    }
  }, [position.latitude, position.longitude]);

  if (isProfileLoading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-64px)]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (!isDeliveryAgent && !isProfileLoading) {
    return (
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow p-6 mt-8">
        <div className="text-center mb-6">
          <MdDirectionsBike className="text-indigo-600 text-6xl mx-auto" />
          <h2 className="text-2xl font-bold mt-4">Become a Delivery Agent</h2>
          <p className="text-gray-600 mt-2">
            Join our team and start earning money by delivering orders to
            customers.
          </p>
        </div>

        <div className="bg-indigo-50 p-4 rounded-lg mb-6">
          <h3 className="font-medium text-indigo-800 mb-2">How It Works</h3>
          <ol className="list-decimal text-indigo-700 pl-5 space-y-2">
            <li className="text-gray-700">
              <span className="font-medium">Register as a delivery agent</span>{" "}
              - Sign up, provide your vehicle information and complete
              verification.
            </li>
            <li className="text-gray-700">
              <span className="font-medium">Accept delivery orders</span> - You
              can choose which orders to deliver based on your location and
              availability.
            </li>
            <li className="text-gray-700">
              <span className="font-medium">Make deliveries</span> - Pickup
              orders from restaurants and deliver them to customers.
            </li>
            <li className="text-gray-700">
              <span className="font-medium">Get paid</span> - Earn competitive
              pay for each successful delivery plus tips.
            </li>
          </ol>
        </div>

        <div className="text-center">
          <button
            onClick={() => navigate("/deliver/register")}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-6 rounded-md transition duration-150"
          >
            Register as Delivery Agent
          </button>
        </div>
      </div>
    );
  }

  // Return actual dashboard
  return (
    <div className="max-w-4xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Stats Cards */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="bg-indigo-50 px-4 py-2 border-b border-indigo-100">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-medium text-indigo-800">
                Confirmed Orders
              </h3>
              <button 
                className="text-xs bg-white text-indigo-600 border border-indigo-300 px-2 py-1 rounded flex items-center gap-1"
                onClick={() => dispatch(fetchConfirmedOrders())}
              >
                <MdRefresh className="text-indigo-600" /> Refresh
              </button>
            </div>
          </div>
          <div className="flex items-center px-4 py-5">
            <div className="bg-indigo-100 p-3 rounded-full mr-4">
              <MdDeliveryDining className="text-indigo-600" size={24} />
            </div>
            <div>
              <span className="text-2xl font-bold text-gray-800">
                {activeOrders?.length || 0}
              </span>
              <p className="text-xs text-gray-500 mt-1">
                Currently assigned deliveries
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="bg-green-50 px-4 py-2 border-b border-green-100">
            <h3 className="text-sm font-medium text-green-800">
              Earnings Today
            </h3>
          </div>
          <div className="flex items-center px-4 py-5">
            <div className="bg-green-100 p-3 rounded-full mr-4">
              <MdLocalOffer className="text-green-600" size={24} />
            </div>
            <div>
              <span className="text-2xl font-bold text-gray-800">
                ${stats?.todayEarnings?.toFixed(2) || "0.00"}
              </span>
              <p className="text-xs text-gray-500 mt-1">
                From {stats?.todayDeliveries || 0} deliveries
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="bg-yellow-50 px-4 py-2 border-b border-yellow-100">
            <h3 className="text-sm font-medium text-yellow-800">
              Total Completed
            </h3>
          </div>
          <div className="flex items-center px-4 py-5">
            <div className="bg-yellow-100 p-3 rounded-full mr-4">
              <MdHistory className="text-yellow-600" size={24} />
            </div>
            <div>
              <span className="text-2xl font-bold text-gray-800">
                {stats?.totalDeliveries || 0}
              </span>
              <p className="text-xs text-gray-500 mt-1">Lifetime deliveries</p>
            </div>
          </div>
        </div>
      </div>

      {/* Location & Map Section */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">Your Location</h2>
          {isDeliveryAgent && isAvailable && (
            <div className="flex items-center">
              {isTracking ? (
                <span className="text-sm text-green-700 flex items-center">
                  <MdLocationSearching className="mr-1" />
                  Location tracking active
                </span>
              ) : (
                <span className="text-sm text-red-600 flex items-center">
                  <MdLocationOff className="mr-1" />
                  Location tracking inactive
                </span>
              )}
            </div>
          )}
        </div>

        <div className="prose prose-sm text-gray-500 mb-4">
          {isDeliveryAgent && isAvailable ? (
            <p>
              Your current location is being tracked and shared with customers
              when you accept orders. Nearby orders within 2km of your location
              will appear below.
            </p>
          ) : (
            <p>
              Location tracking is currently disabled because you're set as
              unavailable. Toggle your availability in the header to start
              receiving orders.
            </p>
          )}
        </div>

        {isDeliveryAgent && !isAvailable && (
          <div className="text-center py-8">
            <MdLocationOff className="mx-auto text-gray-400" size={48} />
            <p className="mt-4 text-gray-600">
              Location tracking is disabled because you are currently
              unavailable.
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Toggle your availability in the header to start tracking.
            </p>
          </div>
        )}

        {isDeliveryAgent && isAvailable && (
          <div>
            {/* Add a dedicated Live Tracking Map section above the grid */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                  <MdMap className="text-indigo-500 mr-2" size={20} />
                  <h3 className="font-medium text-gray-700">
                    Live Location Tracking
                  </h3>
                </div>
                <button
                  onClick={() => {
                    // Force refresh with new key
                    setRefreshKey(Date.now());
                    toast.success("Refreshing map...", { duration: 1500 });
                  }}
                  className="text-xs bg-white border border-gray-300 rounded px-2 py-1 text-gray-700 hover:bg-gray-50"
                >
                  <MdRefresh className="inline mr-1" size={12} />
                  Refresh
                </button>
              </div>

              {/* Simple but stable container for the live map */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                {position.latitude && position.longitude ? (
                  <div
                    style={{
                      height: "180px",
                      width: "100%",
                      backgroundColor: "#f1f5f9",
                    }}
                    className="static-map-container"
                  >
                    {/* Simple static map representation instead of a dynamic leaflet map */}
                    <div className="relative h-full w-full">
                      <iframe
                        title="Live Location"
                        width="100%"
                        height="100%"
                        frameBorder="0"
                        style={{ border: 0 }}
                        src={`https://www.openstreetmap.org/export/embed.html?bbox=${
                          position.longitude - 0.005
                        },${position.latitude - 0.005},${
                          position.longitude + 0.005
                        },${position.latitude + 0.005}&marker=${
                          position.latitude
                        },${position.longitude}&layers=M`}
                        allowFullScreen
                      ></iframe>
                      <div className="absolute top-2 right-2 bg-white px-2 py-1 rounded shadow-sm text-xs">
                        Live position
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    className="flex items-center justify-center bg-gray-50"
                    style={{ height: "180px" }}
                  >
                    <div className="text-center text-gray-500">
                      <MdLocationOff size={24} className="mx-auto mb-2" />
                      <p className="text-sm">Waiting for location data...</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center mt-2">
                <div className="text-xs text-gray-500">
                  <span className="inline-block w-2 h-2 rounded-full bg-blue-500 mr-1"></span>
                  Your current position
                </div>
                <div className="text-xs text-gray-500">
                  Last updated: {getTimeSinceUpdate()}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                <MdMyLocation className="text-indigo-500 mr-3" size={24} />
                <div>
                  <div className="text-xs text-gray-500">Latitude</div>
                  <div className="font-medium">
                    {formatCoordinate(position.latitude)}
                  </div>
                </div>
              </div>
              <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                <MdMyLocation className="text-indigo-500 mr-3" size={24} />
                <div>
                  <div className="text-xs text-gray-500">Longitude</div>
                  <div className="font-medium">
                    {formatCoordinate(position.longitude)}
                  </div>
                </div>
              </div>
              <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                <MdLocationOn className="text-indigo-500 mr-3" size={24} />
                <div>
                  <div className="text-xs text-gray-500">Accuracy</div>
                  <div className="font-medium">
                    {position.accuracy
                      ? `±${Math.round(position.accuracy)} meters`
                      : "N/A"}
                  </div>
                </div>
              </div>
              <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                <MdRefresh className="text-indigo-500 mr-3" size={24} />
                <div>
                  <div className="text-xs text-gray-500">Last Update</div>
                  <div className="font-medium">{getTimeSinceUpdate()}</div>
                </div>
              </div>
            </div>
            {position.accuracy && (
              <div className="mt-3 text-sm text-gray-600 flex items-center">
                <MdMyLocation className="inline mr-1" />
                <span>Accuracy: {Math.round(position.accuracy)} meters</span>
              </div>
            )}
            {locationError && (
              <div className="mt-3 text-sm text-red-600 p-2 bg-red-50 rounded-lg">
                {locationError}
              </div>
            )}

            {/* Map section with extreme stability */}
            {shouldRenderMap && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <MdMap className="text-indigo-500 mr-2" />
                    <h4 className="text-sm font-medium text-gray-700">
                      Your Location & Nearby Orders
                    </h4>
                  </div>
                  <button
                    onClick={handleRefreshOrders}
                    className={`flex items-center text-xs bg-white border border-gray-300 rounded px-2 py-1 text-gray-700 hover:bg-gray-50 disabled:opacity-70 disabled:cursor-not-allowed ${
                      isRefreshing ? "animate-pulse" : ""
                    }`}
                    disabled={isNearbyOrdersLoading || isRefreshing}
                  >
                    <MdRefresh
                      className={`mr-1 ${
                        isNearbyOrdersLoading || isRefreshing
                          ? "animate-spin"
                          : ""
                      }`}
                      size={14}
                    />
                    {isRefreshing ? "Refreshing..." : "Refresh"}
                  </button>
                </div>

                {/* Stable container for map - ensure fixed dimensions */}
                <div
                  className="border border-gray-200 rounded-lg overflow-hidden relative"
                  style={{ height: "240px", width: "100%" }}
                >
                  {/* Remove the nested div structure to eliminate potential DOM issues */}
                  <LocationMap
                    key={`dashboard-map-${refreshKey}`}
                    latitude={memoizedPosition.latitude}
                    longitude={memoizedPosition.longitude}
                    zoom={14}
                    height="240px"
                    nearbyOrders={memoizedNearbyOrders}
                    onOrderClick={handleAcceptOrder}
                    onRejectClick={handleRejectOrder}
                  />
                </div>

                <div className="mt-2 text-xs text-gray-500 text-center">
                  Map shows your current location and nearby orders within 2km
                  for delivery. Click on a marker to see order details and
                  accept or reject it.
                </div>

                {/* Add map legend */}
                <div className="mt-3 bg-white rounded p-2 border border-gray-200">
                  <div className="flex flex-wrap gap-3">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-blue-500 rounded-full mr-1"></div>
                      <span className="text-xs text-gray-600">
                        Your Location
                      </span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-red-500 rounded-full mr-1"></div>
                      <span className="text-xs text-gray-600">
                        Regular Order
                      </span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-green-500 rounded-full mr-1"></div>
                      <span className="text-xs text-gray-600">
                        Active Order
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Confirmed Orders Map Section */}
      {isDeliveryAgent &&
        isAvailable &&
        position.latitude &&
        position.longitude && (
          <div className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">
                Confirmed Orders Map
              </h2>
              <div className="flex items-center">
                <span className="text-xs text-gray-500 mr-2">
                  {isLoadingConfirmedOrders ? "Loading..." : `${pickupPoints.length} orders available`}
                </span>
                <button
                  onClick={() => dispatch(fetchConfirmedOrders())}
                  className={`flex items-center text-xs bg-white border border-gray-300 rounded px-2 py-1 text-gray-700 hover:bg-gray-50 disabled:opacity-70 disabled:cursor-not-allowed ${
                    isLoadingConfirmedOrders ? "animate-pulse" : ""
                  }`}
                  disabled={isLoadingConfirmedOrders}
                >
                  <MdRefresh
                    className={isLoadingConfirmedOrders ? "animate-spin mr-1" : "mr-1"}
                    size={14}
                  />
                  Refresh
                </button>
              </div>
            </div>

            {/* Confirmed Orders Map */}
            <div className="bg-white rounded-lg shadow-sm p-2 border border-gray-200 overflow-hidden">
              <div style={{ height: "400px", width: "100%" }}>
                <ConfirmedOrdersMap
                  key={`confirmed-map-${refreshKey}`}
                  height="400px"
                  onAcceptOrder={handleAcceptOrder}
                />
              </div>
              
              <div className="mt-2 p-2 text-xs text-gray-500">
                <div className="flex flex-wrap gap-3">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-blue-500 rounded-full mr-1"></div>
                    <span>Your Location</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-green-500 rounded-full mr-1"></div>
                    <span>Pickup Points ({confirmedPickupPoints.length})</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-purple-500 rounded-full mr-1"></div>
                    <span>Delivery Locations ({confirmedDeliveryPoints.length})</span>
                  </div>
                </div>
                {confirmedPickupPoints.length > 0 && (
                  <div className="mt-2 p-2 bg-gray-50 rounded">
                    <div className="text-xs font-medium mb-1">Recently added orders:</div>
                    {confirmedPickupPoints.slice(0, 2).map(point => (
                      <div key={point.orderId} className="text-xs mb-1 flex items-center">
                        <span className="font-medium mr-1">{point.restaurantName}:</span>
                        <span className="text-gray-600 truncate">
                          {estimatedTravelTimes[point.orderId] ? `${estimatedTravelTimes[point.orderId]} mins away` : 'Distance calculating...'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      {/* "All Available Orders" section removed as requested */}
    </div>
  );
};

export default Dashboard;
