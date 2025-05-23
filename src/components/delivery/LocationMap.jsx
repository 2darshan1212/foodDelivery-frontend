import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MdMyLocation, MdRefresh, MdLocationOff } from 'react-icons/md';
import { calculateDistance, formatCoordinate } from '../../utils/distanceUtils';
import { renderToString } from 'react-dom/server';
import { MdDeliveryDining, MdRestaurant, MdHome, MdPerson } from 'react-icons/md';

// Fix leaflet icon issues
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

// Need to explicitly set the default icon for Leaflet
const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// No longer need local implementation, using the imported calculateDistance utility

// Add custom CSS for map rendering
if (!document.getElementById('leaflet-custom-styles')) {
  const style = document.createElement('style');
  style.id = 'leaflet-custom-styles';
  style.innerHTML = `
    .leaflet-container {
      width: 100%;
      height: 100%;
      background-color: #f8fafc;
    }
    .marker-icon {
      position: relative;
    }
    .marker-dot {
      width: 12px;
      height: 12px;
      background-color: #3B82F6;
      border-radius: 50%;
      border: 2px solid white;
      box-shadow: 0 0 5px rgba(0, 0, 0, 0.3);
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 2;
    }
    .marker-pulse {
      width: 30px;
      height: 30px;
      background-color: rgba(59, 130, 246, 0.4);
      border-radius: 50%;
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 1;
      animation: pulse 1.5s infinite;
    }
    .order-marker-dot {
      width: 10px;
      height: 10px;
      background-color: #EF4444;
      border-radius: 50%;
      border: 2px solid white;
      box-shadow: 0 0 5px rgba(0, 0, 0, 0.3);
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
    }
    .active-order-marker-dot {
      width: 14px;
      height: 14px;
      background-color: #10B981;
      border-radius: 50%;
      border: 2px solid white;
      box-shadow: 0 0 8px rgba(16, 185, 129, 0.6);
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      animation: active-pulse 1.5s infinite;
    }
    .in-range-dot {
      opacity: 1;
      border-color: white;
    }
    .out-of-range-dot {
      opacity: 0.75;
      border-color: #f3f4f6;
      box-shadow: 0 0 3px rgba(0, 0, 0, 0.2);
    }
    .out-of-range-dot.confirmed-order {
      opacity: 0.9;
      border: 2px solid #fef08a;
      box-shadow: 0 0 6px rgba(234, 179, 8, 0.6);
    }
    .confirmed-order-popup {
      border-left: 4px solid #10B981 !important;
    }
    
    /* Pickup point markers */
    .pickup-marker-dot {
      width: 16px;
      height: 16px;
      background-color: #F59E0B;
      border-radius: 50%;
      border: 2px solid white;
      box-shadow: 0 0 8px rgba(245, 158, 11, 0.7);
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 5;
      animation: pickup-pulse 2s infinite;
    }
    
    .pickup-marker-label {
      background-color: rgba(255, 255, 255, 0.9);
      border: 1px solid #F59E0B;
      border-radius: 4px;
      padding: 2px 6px;
      font-size: 11px;
      font-weight: bold;
      color: #92400E;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
      white-space: nowrap;
    }
    
    .pickup-popup {
      border-left: 4px solid #F59E0B !important;
    }
    .pickup-marker-dot {
      width: 16px;
      height: 16px;
      background-color: #F59E0B;
      border-radius: 50%;
      border: 2px solid white;
      box-shadow: 0 0 8px rgba(245, 158, 11, 0.7);
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 5;
    }
    .pickup-marker-label {
      background-color: rgba(255, 255, 255, 0.9);
      border: 1px solid #F59E0B;
      border-radius: 4px;
      padding: 2px 6px;
      font-size: 11px;
      font-weight: bold;
      color: #92400E;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
      white-space: nowrap;
    }
    .pickup-popup {
      border-left: 4px solid #F59E0B !important;
    }
    .order-popup {
      padding: 8px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    .order-popup-title {
      font-weight: 600;
      margin-bottom: 5px;
      font-size: 14px;
      color: #1F2937;
    }
    .order-status-badge {
      display: inline-block;
      font-size: 10px;
      padding: 2px 6px;
      border-radius: 9999px;
      margin-left: 5px;
      background-color: #10B981;
      color: white;
      font-weight: 500;
    }
    .order-popup-details {
      margin-bottom: 8px;
    }
    .order-popup-row {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      margin-bottom: 2px;
      color: #4B5563;
    }
    .order-popup-actions {
      display: flex;
      justify-content: space-between;
      gap: 4px;
    }
    .popup-button {
      padding: 4px 8px;
      border-radius: 4px;
      border: none;
      font-size: 12px;
      cursor: pointer;
      flex: 1;
    }
    .popup-accept {
      background-color: #10B981;
      color: white;
    }
    .popup-reject {
      background-color: #EF4444;
      color: white;
    }
    
    @keyframes pulse {
      0% {
        transform: translate(-50%, -50%) scale(1);
        opacity: 0.8;
      }
      70% {
        transform: translate(-50%, -50%) scale(2);
        opacity: 0;
      }
      100% {
        transform: translate(-50%, -50%) scale(2.5);
        opacity: 0;
      }
    }
    
    @keyframes active-pulse {
      0% {
        transform: translate(-50%, -50%) scale(1);
        opacity: 1;
      }
      50% {
        transform: translate(-50%, -50%) scale(1.2);
        opacity: 0.8;
      }
      100% {
        transform: translate(-50%, -50%) scale(1);
        opacity: 1;
      }
    }
    
    /* Special animation for pickup markers */
    @keyframes pickup-pulse {
      0% {
        transform: translate(-50%, -50%) scale(1);
        opacity: 1;
      }
      50% {
        transform: translate(-50%, -50%) scale(1.3);
        opacity: 0.9;
      }
      100% {
        transform: translate(-50%, -50%) scale(1);
        opacity: 1;
      }
    }
    
    /* Special animation for pickup markers */
    @keyframes pickup-pulse {
      0% {
        transform: translate(-50%, -50%) scale(1);
        opacity: 1;
      }
      50% {
        transform: translate(-50%, -50%) scale(1.3);
        opacity: 0.9;
      }
      100% {
        transform: translate(-50%, -50%) scale(1);
        opacity: 1;
      }
    }
    
    /* Special styles for confirmed orders */
    .confirmed-order {
      background-color: #10B981;
      box-shadow: 0 0 10px rgba(16, 185, 129, 0.8);
      border: 2px solid #ecfdf5;
    }
    
    /* Special styles for pickup points */
    .pickup-point {
      background-color: #F59E0B;
      box-shadow: 0 0 12px rgba(245, 158, 11, 0.8);
      border: 2px solid #fffbeb;
      animation: pickup-pulse 2s infinite;
    }
  `;
  document.head.appendChild(style);
}

/**
 * Enhanced LocationMap component with iframe fallback
 */
const LocationMap = ({ 
  latitude, 
  longitude, 
  zoom = 15, 
  height = '200px',
  nearbyOrders = [],
  onOrderClick = null,
  onRejectClick = null,
  showAllOrders = false // New prop to control whether to show all orders or just those within 2km
}) => {
  // Create a stable container ID that doesn't change on re-renders
  const mapContainerId = useMemo(() => `map-container-${Math.random().toString(36).substring(2, 9)}`, []);
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const circleRef = useRef(null);
  const orderMarkersRef = useRef([]);
  const [isMapInitialized, setIsMapInitialized] = useState(false);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fallbackMode, setFallbackMode] = useState(false);
  const initAttemptsRef = useRef(0);
  const timeoutRefs = useRef([]);

  // Calculate distance between two points in km using Haversine formula
  const calculateDistance = useCallback((lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;
    
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    const distance = R * c; // Distance in km
    return distance;
  }, []);
  
  const deg2rad = useCallback((deg) => {
    return deg * (Math.PI/180);
  }, []);
  
  // Check if an order is within delivery range (2km)
  const isWithinRange = useCallback((orderLat, orderLong) => {
    const distance = calculateDistance(latitude, longitude, orderLat, orderLong);
    return distance !== null && distance <= 2;
  }, [latitude, longitude, calculateDistance]);
  
  // Format currency for popup display
  const formatCurrency = useCallback((amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  }, []);
  
  // Check if coordinates are valid
  const validCoordinates = useCallback(() => {
    return latitude != null && 
           longitude != null && 
           !isNaN(latitude) && 
           !isNaN(longitude);
  }, [latitude, longitude]);

  // Clear all pending timeouts
  const clearAllTimeouts = useCallback(() => {
    timeoutRefs.current.forEach(timeoutId => clearTimeout(timeoutId));
    timeoutRefs.current = [];
  }, []);

  // Helper to safely clean up map resources
  const cleanupMap = useCallback(() => {
    if (mapRef.current) {
      try {
        // Safely remove all map layers
        mapRef.current.eachLayer(layer => {
          try {
            mapRef.current.removeLayer(layer);
          } catch (e) {
            console.error("Error removing layer:", e);
          }
        });
        
        // Remove event handlers and destroy map
        mapRef.current.off();
        mapRef.current.remove();
      } catch (e) {
        console.error("Error during map cleanup:", e);
      }
    }
    
    // Reset all references
    mapRef.current = null;
    markerRef.current = null;
    circleRef.current = null;
    orderMarkersRef.current = [];
    setIsMapInitialized(false);
    
    // Clear any pending timeouts
    clearAllTimeouts();
  }, [clearAllTimeouts]);

  // Handle refresh button click
  const handleRefresh = useCallback(() => {
    setError(null);
    setIsLoading(true);
    // Reset initialization attempts
    initAttemptsRef.current = 0;
    
    // Clean up existing map
    cleanupMap();
    
    // Force fallback mode off to try Leaflet again
    setFallbackMode(false);
    
    // Force DOM update by changing a timestamp
    setTimeout(() => {
      // This will trigger the useEffect to re-initialize the map
      setIsMapInitialized(false);
    }, 50);
  }, [cleanupMap]);

  // Switch to fallback mode with iframe-based OpenStreetMap
  const switchToFallbackMode = useCallback(() => {
    cleanupMap();
    setFallbackMode(true);
    setIsLoading(false);
    setError(null);
  }, [cleanupMap]);

  // Initialize map when component mounts or coordinates change
  useEffect(() => {
    // Skip if not valid coordinates
    if (!validCoordinates()) {
      setError("Invalid coordinates");
      setIsLoading(false);
      return;
    }
    
    // Skip if already initialized or in fallback mode
    if (isMapInitialized || fallbackMode) {
      return;
    }
    
    // Set loading state
    setIsLoading(true);
    setError(null);
    
    // Clean up any existing map
    cleanupMap();
    
    // Initialize map with additional DOM readiness checks
    const initializeMap = () => {
      try {
        // Ensure we have a valid container
        const container = document.getElementById(mapContainerId);
        if (!container) {
          throw new Error("Map container not found or not ready");
        }
        
        // Ensure container has dimensions
        const { offsetWidth, offsetHeight } = container;
        if (offsetWidth === 0 || offsetHeight === 0) {
          throw new Error("Map container has zero dimensions");
        }
        
        // Initialize the map with simplified options
        mapRef.current = L.map(container, {
          center: [latitude, longitude],
          zoom: zoom,
          zoomControl: true,
          attributionControl: false,
          fadeAnimation: false,
          zoomAnimation: false,
          markerZoomAnimation: false
        });
        
        // Add OpenStreetMap tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: ' OpenStreetMap contributors'
        }).addTo(mapRef.current);
        
        // Add custom marker for current location
        const locationIcon = L.divIcon({
          className: 'custom-marker-icon',
          html: `<div class="marker-icon">
                  <div class="marker-dot"></div>
                  <div class="marker-pulse"></div>
                </div>`,
          iconSize: [30, 30],
          iconAnchor: [15, 15]
        });
        
        // Add location marker
        markerRef.current = L.marker([latitude, longitude], { 
          icon: locationIcon,
          zIndexOffset: 1000
        }).addTo(mapRef.current);
        
        // Add 2km radius circle
        circleRef.current = L.circle([latitude, longitude], {
          color: 'rgba(59, 130, 246, 0.3)',
          fillColor: 'rgba(59, 130, 246, 0.1)',
          fillOpacity: 0.5,
          radius: 2000 // 2km radius
        }).addTo(mapRef.current);
        
        // Add order markers
        const markers = [];
        if (nearbyOrders && nearbyOrders.length) {
          // Process each order
          nearbyOrders.forEach(order => {
            if (order?.pickupLocation?.coordinates && 
                Array.isArray(order.pickupLocation.coordinates) && 
                order.pickupLocation.coordinates.length === 2) {
              
              // Extract coordinates (note: GeoJSON uses [long, lat] format)
              const [orderLong, orderLat] = order.pickupLocation.coordinates;
              
              // Check if the order should be displayed based on range and showAllOrders flag
              const withinRange = isWithinRange(orderLat, orderLong);
              
              // Only display orders that are either within range or if showAllOrders is true
              if (orderLat && orderLong && (showAllOrders || withinRange)) {
                // Calculate distance from current position
                const distance = calculateDistance(
                  latitude,
                  longitude,
                  orderLat,
                  orderLong
                );
                
                // Format distance text
                const distanceText = distance ? `${distance.toFixed(1)} km away` : 'Distance unknown';
                
                // Determine if order is active based on status or availability
                const isActive = order.status === 'confirmed' || order.status === 'ready_for_pickup' || order.status === 'out_for_delivery' || !order.hasOwnProperty('status');
                
                // Determine icon based on whether it's within delivery range and its status
                const inRangeClass = withinRange ? 'in-range' : 'out-of-range';
                
                // Check if this is a confirmed order
                const isConfirmed = order.status === 'confirmed';
                
                // Create custom icon based on order status and range
                // Make confirmed orders outside range more visible but still distinguishable
                const orderIcon = L.divIcon({
                  className: `${isActive ? 'active-order-marker' : 'order-marker'} ${inRangeClass}-marker`,
                  html: `<div class="${isActive ? 'active-order-marker-dot' : 'order-marker-dot'} ${inRangeClass}-dot ${isConfirmed ? 'confirmed-order' : ''}"></div>`,
                  iconSize: isActive ? [24, 24] : [20, 20],
                  iconAnchor: isActive ? [12, 12] : [10, 10]
                });
                
                // Create popup content
                const popupContent = `
                  <div class="order-popup">
                    <div class="order-popup-title">
                      ${isConfirmed ? '📍 ' : ''}Order #${order._id.slice(-6)}
                      ${isActive ? '<span class="order-status-badge">Active</span>' : ''}
                    </div>
                    <div class="order-popup-details">
                      <div class="order-popup-row">
                        <span>Items:</span> <span>${order.items?.length || 0}</span>
                      </div>
                      <div class="order-popup-row">
                        <span>Total:</span> <span>${formatCurrency(order.total)}</span>
                      </div>
                      <div class="order-popup-row">
                        <span>Distance:</span> <span>${distanceText}</span>
                        ${withinRange ? '<span style="color: #10B981; margin-left: 5px;">(Within delivery range)</span>' : '<span style="color: #EF4444; margin-left: 5px;">(Outside delivery range)</span>'}
                      </div>
                      ${order.status ? `
                      <div class="order-popup-row">
                        <span>Status:</span> <span>${order.status.replace('_', ' ')}</span>
                      </div>` : ''}
                    </div>
                    <div class="order-popup-actions">
                      ${order.status === 'out_for_delivery' && order.deliveryAgent ? `
                        <button class="popup-button popup-accept" data-order-id="${order._id}">Navigate</button>
                      ` : `
                        <button class="popup-button popup-accept" data-order-id="${order._id}">Accept</button>
                        <button class="popup-button popup-reject" data-order-id="${order._id}">Reject</button>
                      `}
                    </div>
                  </div>
                `;
                
                // Create marker for the regular order
                const orderMarker = L.marker([orderLat, orderLong], { 
                  icon: orderIcon,
                  zIndexOffset: isActive ? 200 : 100 // Give active orders higher z-index
                }).addTo(mapRef.current);
                
                // Add popup
                const popup = L.popup({
                  minWidth: 180,
                  closeButton: true,
                  className: isConfirmed ? 'confirmed-order-popup' : ''
                }).setContent(popupContent);
                
                orderMarker.bindPopup(popup);
                
                // If this is a confirmed order, add a special pickup point marker
                if (isConfirmed) {
                  // Create pickup icon
                  const pickupIcon = L.divIcon({
                    className: 'pickup-marker',
                    html: `<div class="pickup-marker-dot"></div>`,
                    iconSize: [24, 24],
                    iconAnchor: [12, 12]
                  });
                  
                  // Create pickup marker
                  const pickupMarker = L.marker([orderLat, orderLong], { 
                    icon: pickupIcon,
                    zIndexOffset: 500 // Very high z-index to stay on top
                  }).addTo(mapRef.current);
                  
                  // Add tooltip to the pickup marker
                  pickupMarker.bindTooltip(`Pickup Point - Order #${order._id.slice(-6)}`, {
                    permanent: false,
                    direction: 'top',
                    className: 'pickup-marker-label'
                  });
                  
                  // Create popup content for pickup point
                  const pickupPopupContent = `
                    <div class="order-popup">
                      <div class="order-popup-title">
                        Pickup Point - Order #${order._id.slice(-6)}
                      </div>
                      <div class="order-popup-details">
                        <div class="order-popup-row">
                          <span>Restaurant:</span> <span>${order.items[0]?.name || 'Food Order'}</span>
                        </div>
                        <div class="order-popup-row">
                          <span>Status:</span> <span>${order.status.replace('_', ' ')}</span>
                        </div>
                        <div class="order-popup-row">
                          <span>Distance:</span> <span>${distanceText}</span>
                        </div>
                      </div>
                    </div>
                  `;
                  
                  // Add popup to pickup marker
                  const pickupPopup = L.popup({
                    minWidth: 180,
                    closeButton: true,
                    className: 'pickup-popup'
                  }).setContent(pickupPopupContent);
                  
                  pickupMarker.bindPopup(pickupPopup);
                  
                  // Add to markers array for cleanup
                  markers.push(pickupMarker);
                }
                
                // Add click handler for buttons within popup
                orderMarker.on('popupopen', () => {
                  setTimeout(() => {
                    // Handle buttons based on order status
                    if (order.status === 'out_for_delivery' && order.deliveryAgent) {
                      // Handle navigate button for active orders
                      document.querySelectorAll(`.popup-accept[data-order-id="${order._id}"]`).forEach(button => {
                        button.addEventListener('click', (e) => {
                          e.preventDefault();
                          // Open Google Maps direction in a new tab
                          const url = `https://www.google.com/maps/dir/?api=1&destination=${orderLat},${orderLong}`;
                          window.open(url, '_blank');
                          popup.close();
                        });
                      });
                    } else {
                      // Handle accept button clicks for new orders
                      document.querySelectorAll(`.popup-accept[data-order-id="${order._id}"]`).forEach(button => {
                        button.addEventListener('click', (e) => {
                          e.preventDefault();
                          if (onOrderClick) {
                            onOrderClick(order._id);
                            popup.close();
                          }
                        });
                      });
                      
                      // Handle reject button clicks
                      document.querySelectorAll(`.popup-reject[data-order-id="${order._id}"]`).forEach(button => {
                        button.addEventListener('click', (e) => {
                          e.preventDefault();
                          if (onRejectClick) {
                            onRejectClick(order._id);
                            popup.close();
                          }
                        });
                      });
                    }
                  }, 10);
                });
                
                markers.push(orderMarker);
              }
            }
          });
        }
        
        // Store markers for later cleanup
        orderMarkersRef.current = markers;
        
        // Force invalidate size to ensure proper rendering
        mapRef.current.invalidateSize({ animate: false });
        
        // If we have any order markers, adjust the map bounds to fit them all
        if (markers.length > 0) {
          // Create a bounds object that includes the current location
          const bounds = L.latLngBounds([L.latLng(latitude, longitude)]);
          
          // Add all order markers to the bounds
          markers.forEach(marker => {
            bounds.extend(marker.getLatLng());
          });
          
          // Fit the map to these bounds with some padding
          mapRef.current.fitBounds(bounds, {
            padding: [50, 50],
            maxZoom: 14 // Don't zoom in too far
          });
        }
        
        // Mark initialization as complete
        setIsMapInitialized(true);
        setIsLoading(false);
        
        // Additional size validation after a short delay
        const finalResizeTimeout = setTimeout(() => {
          if (mapRef.current) {
            mapRef.current.invalidateSize({ animate: false });
          }
        }, 250);
        timeoutRefs.current.push(finalResizeTimeout);
        
      } catch (err) {
        console.error("Error initializing map:", err);
        
        // Increment attempt counter
        initAttemptsRef.current++;
        
        if (initAttemptsRef.current >= 3) {
          // After multiple failures, switch to fallback mode
          switchToFallbackMode();
        } else {
          // Set error for current attempt
          setError(`Error initializing map: ${err.message}`);
          
          // Try again after delay
          const retryTimeout = setTimeout(() => {
            initializeMap();
          }, 500 * initAttemptsRef.current); // Increasing delays for subsequent retries
          timeoutRefs.current.push(retryTimeout);
        }
      }
    };
    
    // Start initialization after a short delay to ensure DOM is ready
    const initTimeout = setTimeout(initializeMap, 100);
    timeoutRefs.current.push(initTimeout);
    
    // Cleanup function
    return () => {
      cleanupMap();
    };
  }, [
    validCoordinates, cleanupMap, latitude, longitude, zoom, 
    calculateDistance, formatCurrency, fallbackMode, isMapInitialized,
    nearbyOrders, onOrderClick, onRejectClick, mapContainerId, 
    switchToFallbackMode
  ]);

  // Update map and markers when nearby orders change
  useEffect(() => {
    if (!isMapInitialized || !mapRef.current || fallbackMode) return;
    
    // Update markers for nearby orders
    // (This simplification only works when component is fully re-mounted on orders change)
    // For real-time updates, you would need to compare old and new markers and update accordingly
  }, [nearbyOrders, isMapInitialized, fallbackMode]);

  // Show loading state
  if (isLoading && !fallbackMode) {
    return (
      <div className="bg-gray-100 rounded-lg flex items-center justify-center" style={{ height }}>
        <div className="text-center text-gray-500">
          <div className="w-8 h-8 border-t-2 border-b-2 border-indigo-500 rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-sm">Loading map...</p>
        </div>
      </div>
    );
  }

  // Show error state with retry button
  if (error && !fallbackMode) {
    return (
      <div className="bg-red-50 rounded-lg flex items-center justify-center" style={{ height }}>
        <div className="text-center p-4">
          <div className="flex justify-center items-center mb-3 text-red-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-sm text-red-600 mb-3">{error}</p>
          <div className="flex space-x-2 justify-center">
            <button
              onClick={handleRefresh}
              className="px-3 py-1 bg-white border border-red-300 rounded-md text-sm text-red-600 hover:bg-red-50"
            >
              Retry
            </button>
            <button
              onClick={switchToFallbackMode}
              className="px-3 py-1 bg-white border border-gray-300 rounded-md text-sm text-gray-600 hover:bg-gray-50"
            >
              Use Simple Map
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show fallback iframe map if fallback mode is active
  if (fallbackMode) {
    return (
      <div className="rounded-lg overflow-hidden" style={{ height, width: '100%' }}>
        <iframe
          title="Location Map"
          width="100%"
          height="100%"
          frameBorder="0"
          scrolling="no"
          marginHeight="0"
          marginWidth="0"
          src={`https://www.openstreetmap.org/export/embed.html?bbox=${longitude - 0.02},${latitude - 0.02},${longitude + 0.02},${latitude + 0.02}&layer=mapnik&marker=${latitude},${longitude}`}
          style={{ border: 0 }}
        ></iframe>
      </div>
    );
  }

  // Show placeholder if coordinates aren't valid
  if (!validCoordinates()) {
    return (
      <div className="bg-gray-100 rounded-lg flex items-center justify-center" style={{ height }}>
        <div className="text-center text-gray-500">
          <MdLocationOff size={24} className="mx-auto mb-2" />
          <p className="text-sm">Location not available</p>
        </div>
      </div>
    );
  }

  // Render map container
  return (
    <div className="relative w-full h-full">
      <div
        id={mapContainerId}
        ref={mapContainerRef}
        className="absolute inset-0 w-full h-full rounded-lg overflow-hidden"
        style={{ height, width: '100%' }}
      />
      
      <button
        onClick={handleRefresh}
        className="absolute bottom-3 right-3 bg-white p-2 rounded-full shadow-md z-[1000] hover:bg-gray-100"
        title="Refresh map"
      >
        <MdRefresh size={16} className="text-gray-700" />
      </button>
    </div>
  );
};

export default LocationMap; 