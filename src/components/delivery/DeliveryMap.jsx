import React, { useEffect, useState, useCallback, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MdMyLocation, MdRefresh, MdLocationOff } from 'react-icons/md';
import { useSelector, useDispatch } from 'react-redux';
import { updateOrderStatus } from '../../services/orderService';
import { toast } from 'react-hot-toast';
// Define calculateDistance locally rather than importing it
import { MdRestaurant, MdHome, MdDirections, MdInfo } from 'react-icons/md';
import { FiPackage } from 'react-icons/fi';

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

// Custom DeliveryMap component for active deliveries
const DeliveryMap = ({ 
  agentLocation, 
  pickupLocation, 
  deliveryLocation,
  orderStatus,
  height = "400px",
  zoom = 13,
  orderDetails = null // Added parameter for order details
}) => {
  const mapRef = useRef(null);
  const mapContainerRef = useRef(null);
  const agentMarkerRef = useRef(null);
  const pickupMarkerRef = useRef(null);
  const deliveryMarkerRef = useRef(null);
  const routeLineRef = useRef(null);
  const boundsTimerRef = useRef(null);
  const [isMapInitialized, setIsMapInitialized] = useState(false);
  const [mapError, setMapError] = useState(null);
  // Tracking previous coordinates to avoid unnecessary updates
  const prevAgentCoordsRef = useRef(null);
  const prevPickupCoordsRef = useRef(null); 
  const prevDeliveryCoordsRef = useRef(null);

    // Simple self-contained distance calculator to prevent reference errors
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    // Handle invalid coordinates with a simple check
    if (!lat1 || !lon1 || !lat2 || !lon2 || 
        isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)) {
      return 9999; // Large value as fallback
    }
    
    // All-in-one calculation to avoid function references
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    const distance = R * c;
    
    // Return with 1 decimal place for simplicity
    return Math.round(distance * 10) / 10;
  };

  // Extract and process coordinates as a separate function to ensure it reruns
  // when the agent location changes
  const getCoordinates = useCallback(() => {
    const agentCoords = agentLocation?.coordinates ? 
      [agentLocation.coordinates[1], agentLocation.coordinates[0]] : 
      [agentLocation?.latitude, agentLocation?.longitude];
    
    const pickupCoords = pickupLocation?.coordinates ? 
      [pickupLocation.coordinates[1], pickupLocation.coordinates[0]] : null;
    
    const deliveryCoords = deliveryLocation?.coordinates ? 
      [deliveryLocation.coordinates[1], deliveryLocation.coordinates[0]] : null;
    
    return {
      agentCoords,
      pickupCoords,
      deliveryCoords,
      isValid: agentCoords && agentCoords[0] && agentCoords[1] && !isNaN(agentCoords[0]) && !isNaN(agentCoords[1])
    };
  }, [agentLocation, pickupLocation, deliveryLocation]);

  // Helper to check if coordinates have changed significantly
  const haveCoordsChanged = useCallback((oldCoords, newCoords) => {
    if (!oldCoords || !newCoords) return true;
    if (!oldCoords[0] || !newCoords[0]) return true;
    
    // Only update if difference is more than 0.00001 (about 1 meter)
    const threshold = 0.00001;
    return Math.abs(oldCoords[0] - newCoords[0]) > threshold ||
           Math.abs(oldCoords[1] - newCoords[1]) > threshold;
  }, []);

  // Initialize map only once and keep it alive throughout the component lifecycle
  useEffect(() => {
    // Only run map initialization once
    if (isMapInitialized || mapRef.current) return;
    
    try {
      // Extract coordinates
      const { agentCoords, pickupCoords, deliveryCoords, isValid } = getCoordinates();
      
      // Check if we have valid coordinates
      if (!isValid) {
        console.log("Invalid coordinates for map initialization");
        return;
      }
      
      console.log("Initializing map...");
      
      // Calculate center point and bounds for initial view
      let allPoints = [];
      if (agentCoords && agentCoords[0] && agentCoords[1]) allPoints.push(agentCoords);
      if (pickupCoords && pickupCoords[0] && pickupCoords[1]) allPoints.push(pickupCoords);
      if (deliveryCoords && deliveryCoords[0] && deliveryCoords[1]) allPoints.push(deliveryCoords);
      
      if (allPoints.length === 0) {
        setMapError("No valid coordinates available for map");
        return;
      }
      
      // Use a default center if no coordinates are available
      const defaultCenter = [0, 0];
      const initialCenter = allPoints.length > 0 ? allPoints[0] : defaultCenter;
      
      mapRef.current = L.map(mapContainerRef.current, {
        center: initialCenter,
        zoom: zoom,
        zoomControl: true,
        attributionControl: true,
        // Disable animations that may cause flickering
        fadeAnimation: false,
        zoomAnimation: false,
        markerZoomAnimation: false
      });
      
      // Add a better tile layer with higher contrast and better colors
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19,
        className: 'map-tiles'
      }).addTo(mapRef.current);
      
      // Add scale control
      L.control.scale({ 
        imperial: false, 
        position: 'bottomright'
      }).addTo(mapRef.current);
      
      // Make sure the map is properly sized
      mapRef.current.invalidateSize({ animate: false });
      
      // Fit map to show all points
      if (allPoints.length > 1) {
        const bounds = L.latLngBounds(allPoints);
        mapRef.current.fitBounds(bounds, { 
          padding: [50, 50],
          animate: false
        });
      } else if (allPoints.length === 1) {
        mapRef.current.setView(allPoints[0], zoom, { animate: false });
      }
      
      setIsMapInitialized(true);
      console.log("Map initialized successfully");
    } catch (error) {
      console.error("Error initializing map:", error);
      setMapError(`Error initializing map: ${error.message}`);
    }
    
    // Cleanup on unmount only
    return () => {
      if (boundsTimerRef.current) {
        clearTimeout(boundsTimerRef.current);
      }
      if (mapRef.current) {
        console.log("Cleaning up map resources");
        mapRef.current.remove();
        mapRef.current = null;
        agentMarkerRef.current = null;
        pickupMarkerRef.current = null;
        deliveryMarkerRef.current = null;
        routeLineRef.current = null;
        setIsMapInitialized(false);
      }
    };
  }, []); // Empty dependency array, only run once on mount

  // Update markers and routes separately from map initialization
  useEffect(() => {
    if (!mapRef.current || !isMapInitialized) return;
    
    try {
      const { agentCoords, pickupCoords, deliveryCoords, isValid } = getCoordinates();
      if (!isValid) return;
      
      // Check if any coordinate has changed significantly before updating
      const agentChanged = haveCoordsChanged(prevAgentCoordsRef.current, agentCoords);
      const pickupChanged = haveCoordsChanged(prevPickupCoordsRef.current, pickupCoords);
      const deliveryChanged = haveCoordsChanged(prevDeliveryCoordsRef.current, deliveryCoords);
      
      if (!agentChanged && !pickupChanged && !deliveryChanged && 
          agentMarkerRef.current && 
          ((pickupMarkerRef.current && pickupCoords) || !pickupCoords) && 
          ((deliveryMarkerRef.current && deliveryCoords) || !deliveryCoords)) {
        // No significant changes, skip update
        return;
      }
      
      console.log("Updating map markers and routes");
      
      // Safe invalidate size without animations to prevent flickering
      mapRef.current.invalidateSize({ animate: false });
      
      // Update agent marker
      if (agentChanged) {
        if (agentMarkerRef.current) {
          agentMarkerRef.current.setLatLng(agentCoords);
        } else {
          // Create a custom marker icon for agent location
          const agentIcon = L.divIcon({
            className: 'agent-marker',
            html: `<div class="agent-marker-icon">
                    <div class="agent-marker-dot"></div>
                    <div class="agent-marker-pulse"></div>
                  </div>`,
            iconSize: [40, 40],
            iconAnchor: [20, 20]
          });
          
          agentMarkerRef.current = L.marker(agentCoords, { 
            icon: agentIcon,
            zIndexOffset: 1000,
            riseOnHover: true
          })
            .addTo(mapRef.current)
            .bindPopup("<b>Your current location</b><br>Active and tracking");
        }
        
        prevAgentCoordsRef.current = [...agentCoords];
      }
      
      // Update pickup marker
      if (pickupCoords && pickupCoords[0] && pickupCoords[1]) {
        if (pickupMarkerRef.current && !pickupChanged) {
          // No need to update
        } else if (pickupMarkerRef.current && pickupChanged) {
          pickupMarkerRef.current.setLatLng(pickupCoords);
        } else {
          // Create a more prominent pickup icon with animation
          const pickupIcon = L.divIcon({
            className: 'pickup-marker',
            html: `<div class="pickup-marker-icon" style="position: relative;">
                    <div class="pickup-marker-bg" style="background-color: #FF5722; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 0 4px rgba(255, 87, 34, 0.4), 0 0 0 8px rgba(255, 87, 34, 0.2);">
                      <i class="pickup-icon" style="color: white; font-size: 18px;">
                        <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                          <circle cx="12" cy="10" r="3"></circle>
                        </svg>
                      </i>
                    </div>
                    <div style="position: absolute; top: -12px; left: 50%; transform: translateX(-50%); background-color: #FF5722; color: white; font-weight: bold; padding: 2px 6px; border-radius: 4px; font-size: 10px; white-space: nowrap;">PICKUP</div>
                  </div>`,
            iconSize: [40, 40],
            iconAnchor: [20, 20]
          });
          
          // Create a more detailed popup content for the pickup location
          const restaurantName = orderDetails?.restaurant?.name || "Restaurant";
          const orderId = orderDetails?._id ? `#${orderDetails._id.slice(-6)}` : "";
          const orderItems = orderDetails?.items?.length || 0;
          
          const popupContent = `
            <div style="min-width: 180px;">
              <div style="font-weight: bold; color: #FF5722; font-size: 14px; margin-bottom: 4px;">
                ${restaurantName}
              </div>
              <div style="font-size: 12px; margin-bottom: 4px;">
                <span style="font-weight: bold;">Pickup for Order:</span> ${orderId}
              </div>
              <div style="font-size: 12px; margin-bottom: 4px;">
                <span style="font-weight: bold;">Items:</span> ${orderItems}
              </div>
              <div style="font-size: 12px; margin-bottom: 4px;">
                <span style="font-weight: bold;">Status:</span> ${orderStatus || 'confirmed'}
              </div>
              <div style="background-color: #f0f0f0; padding: 6px; border-radius: 4px; margin-top: 6px; font-size: 11px;">
                This is the pickup location for your order. After pickup, proceed to the delivery location.
              </div>
            </div>
          `;
          
          pickupMarkerRef.current = L.marker(pickupCoords, { 
            icon: pickupIcon,
            riseOnHover: true,
            title: `Pickup: ${restaurantName}`,
            zIndexOffset: 900 // High z-index to ensure it's visible
          })
            .addTo(mapRef.current)
            .bindPopup(popupContent, {
              maxWidth: 250,
              closeButton: true
            });
            
          // Auto-open the popup to highlight the pickup location
          pickupMarkerRef.current.openPopup();
        }
        
        prevPickupCoordsRef.current = [...pickupCoords];
      } else if (!pickupCoords && pickupMarkerRef.current) {
        mapRef.current.removeLayer(pickupMarkerRef.current);
        pickupMarkerRef.current = null;
        prevPickupCoordsRef.current = null;
      }
      
      // Update delivery marker
      if (deliveryCoords && deliveryCoords[0] && deliveryCoords[1]) {
        if (deliveryMarkerRef.current && !deliveryChanged) {
          // No need to update
        } else if (deliveryMarkerRef.current && deliveryChanged) {
          deliveryMarkerRef.current.setLatLng(deliveryCoords);
        } else {
          const deliveryIcon = L.divIcon({
            className: 'delivery-marker',
            html: `<div class="delivery-marker-icon">
                    <div class="delivery-marker-bg">
                      <i class="delivery-icon"></i>
                    </div>
                  </div>`,
            iconSize: [40, 40],
            iconAnchor: [20, 20]
          });
          
          deliveryMarkerRef.current = L.marker(deliveryCoords, { 
            icon: deliveryIcon,
            riseOnHover: true,
            title: "Delivery Location" 
          })
            .addTo(mapRef.current)
            .bindPopup("<b>Delivery location</b><br>Customer address");
        }
        
        prevDeliveryCoordsRef.current = [...deliveryCoords];
      } else if (!deliveryCoords && deliveryMarkerRef.current) {
        mapRef.current.removeLayer(deliveryMarkerRef.current);
        deliveryMarkerRef.current = null;
        prevDeliveryCoordsRef.current = null;
      }
      
      // Update route line
      if (routeLineRef.current) {
        mapRef.current.removeLayer(routeLineRef.current);
        routeLineRef.current = null;
      }
      
      // Draw route lines based on order status
      const routePoints = [];
      
      // For status "confirmed" or "preparing" - show route from agent to pickup
      if (orderStatus === "confirmed" || orderStatus === "preparing") {
        if (agentCoords[0] && pickupCoords && pickupCoords[0]) {
          routePoints.push(agentCoords, pickupCoords);
        }
      } 
      // For status "out_for_delivery" - show route from pickup to delivery
      else if (orderStatus === "out_for_delivery") {
        if (agentCoords[0] && deliveryCoords && deliveryCoords[0]) {
          routePoints.push(agentCoords, deliveryCoords);
        }
      }
      
      // Add route line if we have points
      if (routePoints.length >= 2) {
        routeLineRef.current = L.polyline(routePoints, {
          color: '#4F46E5',
          weight: 4,
          opacity: 0.8,
          dashArray: '10, 10',
          lineCap: 'round',
          className: 'route-line'
        }).addTo(mapRef.current);
      }
      
      // Update map view/bounds only if significant changes occurred or points are out of view
      if (agentChanged || pickupChanged || deliveryChanged) {
        // Debounce bounds update to prevent flickering from rapid updates
        if (boundsTimerRef.current) {
          clearTimeout(boundsTimerRef.current);
        }
        
        boundsTimerRef.current = setTimeout(() => {
          // Get all active points for fitting bounds
          let activePoints = [];
          if (agentCoords && agentCoords[0]) activePoints.push(agentCoords);
          if ((orderStatus === "confirmed" || orderStatus === "preparing") && 
              pickupCoords && pickupCoords[0]) {
            activePoints.push(pickupCoords);
          } else if (orderStatus === "out_for_delivery" && 
                    deliveryCoords && deliveryCoords[0]) {
            activePoints.push(deliveryCoords);
          }
          
          if (activePoints.length > 1) {
            const bounds = L.latLngBounds(activePoints);
            // Only update bounds if points aren't already visible
            if (!mapRef.current.getBounds().contains(bounds)) {
              mapRef.current.fitBounds(bounds, { 
                padding: [50, 50],
                animate: false,
                duration: 0,
                maxZoom: 16
              });
            }
          }
        }, 300); // Debounce for 300ms
      }
    } catch (error) {
      console.error("Error updating map components:", error);
      setMapError(`Error updating map: ${error.message}`);
    }
  }, [agentLocation, pickupLocation, deliveryLocation, orderStatus, getCoordinates, haveCoordsChanged, isMapInitialized]);

  // If no valid coordinates, show fallback
  const { agentCoords, isValid } = getCoordinates();
    
  if (!isValid) {
    return (
      <div 
        className="bg-gray-100 rounded-lg flex items-center justify-center"
        style={{ height }}
      >
        <div className="text-center text-gray-500">
          <MdMyLocation size={24} className="mx-auto mb-2" />
          <p className="text-sm">Location not available</p>
          <button 
            className="mt-2 px-2 py-1 text-xs bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200"
            onClick={() => window.location.reload()}
          >
            Reload page
          </button>
        </div>
      </div>
    );
  }

  // If error occurred during map initialization
  if (mapError) {
    return (
      <div 
        className="bg-red-50 rounded-lg flex items-center justify-center border border-red-200"
        style={{ height }}
      >
        <div className="text-center text-red-500 p-4">
          <MdInfo size={30} className="mx-auto mb-2" />
          <p className="text-sm mb-2">{mapError}</p>
          <button 
            className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 mr-2"
            onClick={() => window.location.reload()}
          >
            Reload page
          </button>
        </div>
      </div>
    );
  }

  // Display distance information
  const getDistanceInfo = () => {
    const { agentCoords, pickupCoords, deliveryCoords } = getCoordinates();
      
    let distanceInfo = null;

    if (orderStatus === "confirmed" || orderStatus === "preparing") {
      if (agentCoords[0] && pickupCoords && pickupCoords[0]) {
        const distance = calculateDistance(
          agentCoords[0], agentCoords[1], 
          pickupCoords[0], pickupCoords[1]
        );
        distanceInfo = { 
          text: `${distance} km to pickup location`,
          type: 'pickup'
        };
      }
    } else if (orderStatus === "out_for_delivery") {
      if (agentCoords[0] && deliveryCoords && deliveryCoords[0]) {
        const distance = calculateDistance(
          agentCoords[0], agentCoords[1], 
          deliveryCoords[0], deliveryCoords[1]
        );
        distanceInfo = { 
          text: `${distance} km to delivery location`,
          type: 'delivery'
        };
      }
    }
    
    return distanceInfo;
  };

  // Get destination coordinates based on order status
  const getDestinationCoords = () => {
    if (orderStatus === "confirmed" || orderStatus === "preparing") {
      return pickupLocation?.coordinates ? 
        [pickupLocation.coordinates[1], pickupLocation.coordinates[0]] : null;
    } else if (orderStatus === "out_for_delivery") {
      return deliveryLocation?.coordinates ? 
        [deliveryLocation.coordinates[1], deliveryLocation.coordinates[0]] : null;
    }
    return null;
  };

  // Force map refresh manually
  const handleMapRefresh = () => {
    if (mapRef.current) {
      console.log("Manually refreshing map");
      
      // Force a map size recalculation
      mapRef.current.invalidateSize({ animate: false });
      
      // Reset previous coordinates to force marker updates
      prevAgentCoordsRef.current = null;
      prevPickupCoordsRef.current = null;
      prevDeliveryCoordsRef.current = null;
      
      // Trigger a recalculation of markers on next render
      // This will be handled by useEffect
    }
  };

  const distanceInfo = getDistanceInfo();
  const destinationCoords = getDestinationCoords();

  return (
    <div className="relative">
      <div 
        ref={mapContainerRef} 
        className="rounded-lg overflow-hidden border border-gray-200"
        style={{ height }}
      />
      
      {distanceInfo && (
        <div className="absolute bottom-3 left-0 right-0 mx-auto w-max bg-white px-4 py-2 rounded-full shadow-md z-[1000] text-sm flex items-center">
          <MdDirections className="mr-2 text-indigo-600" size={16} />
          <span>{distanceInfo.text}</span>
          
          {destinationCoords && (
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${destinationCoords[0]},${destinationCoords[1]}&origin=${agentCoords[0]},${agentCoords[1]}`}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-3 bg-indigo-600 text-white px-2 py-1 rounded-md text-xs hover:bg-indigo-700 transition-colors"
            >
              Open Maps
            </a>
          )}
          
          <button
            onClick={handleMapRefresh}
            className="ml-2 bg-gray-200 text-gray-700 p-1 rounded hover:bg-gray-300 focus:outline-none"
            title="Refresh map"
          >
            <MdRefresh size={16} />
          </button>
        </div>
      )}
      
      <style jsx>{`
        .agent-marker-icon {
          position: relative;
        }
        .agent-marker-dot {
          width: 14px;
          height: 14px;
          background-color: #3B82F6;
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 0 5px rgba(0, 0, 0, 0.3);
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: 2;
        }
        .agent-marker-pulse {
          width: 40px;
          height: 40px;
          background-color: rgba(59, 130, 246, 0.4);
          border-radius: 50%;
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: 1;
          animation: pulse 1.5s infinite;
        }
        
        .pickup-marker-icon, .delivery-marker-icon {
          position: relative;
        }
        .pickup-marker-bg {
          width: 36px;
          height: 36px;
          background-color: #f97316;
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 0 5px rgba(0, 0, 0, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }
        .delivery-marker-bg {
          width: 36px;
          height: 36px;
          background-color: #10b981;
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 0 5px rgba(0, 0, 0, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }
        .pickup-icon::before {
          content: "";
          display: block;
          width: 16px;
          height: 16px;
          background-color: white;
          clip-path: polygon(50% 0%, 100% 60%, 75% 100%, 25% 100%, 0% 60%);
        }
        .delivery-icon::before {
          content: "";
          display: block;
          width: 16px;
          height: 16px;
          background-color: white;
          clip-path: polygon(0% 20%, 60% 20%, 60% 0%, 100% 50%, 60% 100%, 60% 80%, 0% 80%);
        }
        
        .route-line {
          stroke-dasharray: 10, 10;
          animation: dash 30s linear infinite;
        }
        
        @keyframes dash {
          to {
            stroke-dashoffset: 1000;
          }
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
            transform: translate(-50%, -50%) scale(1);
            opacity: 0;
          }
        }
        
        /* Make sure the map container is visible */
        .leaflet-container {
          width: 100%;
          height: 100%;
          background-color: #f8fafc;
        }
        
        /* Improve marker visibility */
        .leaflet-marker-icon {
          filter: drop-shadow(0 2px 2px rgba(0, 0, 0, 0.3));
        }
        
        /* Enhance popup style */
        .leaflet-popup-content-wrapper {
          border-radius: 8px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        
        .leaflet-popup-content {
          margin: 10px 12px;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        }
      `}</style>
    </div>
  );
};

export default DeliveryMap; 