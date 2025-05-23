import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MdMyLocation, MdRestaurant, MdDeliveryDining, MdHome, MdDirections, MdTimer, MdRefresh } from 'react-icons/md';
import { renderToString } from 'react-dom/server';
import { useSelector, useDispatch } from 'react-redux';
import { fetchConfirmedOrders, acceptConfirmedOrder, updateAgentLocation, refreshOrders } from '../../redux/confirmedOrdersSlice';

// Fix leaflet icon issues
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.Icon.extend({
  options: {
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  },
});

L.Marker.prototype.options.icon = new DefaultIcon();

// ConfirmedOrdersMap component for showing pickup and delivery points on delivery dashboard
const ConfirmedOrdersMap = ({ 
  height = "400px",
  onAcceptOrder
}) => {
  const dispatch = useDispatch();
  const mapRef = useRef(null);
  const mapContainerRef = useRef(null);
  const markersRef = useRef([]);
  const routesRef = useRef([]);
  
  // Get data from our new confirmedOrders slice
  const { 
    pickupPoints, 
    deliveryPoints,
    agentLocation,
    distances, 
    estimatedTravelTimes, 
    pickupToDeliveryDistances,
    lastUpdated,
    isLoading,
    acceptingOrderId,
    orders: confirmedOrders
  } = useSelector(state => state.confirmedOrders);
  
  // Get current location from delivery slice for initialization
  const { currentLocation } = useSelector(state => state.delivery);
  
  const [mapInitialized, setMapInitialized] = useState(false);
  const [showDeliveryLocations, setShowDeliveryLocations] = useState(true);
  const [showRoutes, setShowRoutes] = useState(true);
  
  // Update agent location in the confirmedOrders slice whenever currentLocation changes
  useEffect(() => {
    if (currentLocation && currentLocation.latitude && currentLocation.longitude) {
      dispatch(updateAgentLocation({
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude
      }));
    }
  }, [currentLocation, dispatch]);

  // Function to refresh confirmed orders
  const handleRefreshOrders = useCallback(() => {
    dispatch(fetchConfirmedOrders());
  }, [dispatch]);
  
  // Set up auto-refresh for real-time updates
  useEffect(() => {
    // Initial fetch
    dispatch(fetchConfirmedOrders());
    
    // Set up polling interval (every 30 seconds)
    const pollingInterval = setInterval(() => {
      // Only refresh if the page is visible to save resources
      if (document.visibilityState === 'visible') {
        dispatch(fetchConfirmedOrders());
      }
    }, 30000);
    
    // Listen for new orders from socket events
    const handleNewOrder = (event) => {
      if (event.detail && event.detail.type === 'NEW_ORDER') {
        console.log('New order detected, refreshing confirmed orders');
        dispatch(fetchConfirmedOrders());
      }
    };
    
    // Listen for localStorage changes as a communication channel
    const handleStorageChange = (e) => {
      if (e.key === 'confirmedOrdersPollingId') {
        // A new order was placed, refresh the list
        dispatch(fetchConfirmedOrders());
      }
    };
    
    // Add event listeners
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('new-order', handleNewOrder);
    
    // Set up visibility change listener to refresh when tab becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        dispatch(fetchConfirmedOrders());
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      // Clean up
      clearInterval(pollingInterval);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('new-order', handleNewOrder);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [dispatch]);
  
  // Format minutes to a readable time string
  const formatTime = useCallback((minutes) => {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  }, []);
  
  // Helper function to create custom icons
  const createCustomIcon = useCallback((type, options = {}) => {
    let html;
    let className;
    
    switch(type) {
      case 'agent':
        html = renderToString(
          <div className="flex items-center justify-center text-blue-600">
            <MdDeliveryDining size={24} />
          </div>
        );
        className = 'custom-marker-icon agent-marker';
        break;
      case 'pickup':
        html = renderToString(
          <div className="flex items-center justify-center text-green-600">
            <MdRestaurant size={22} />
          </div>
        );
        className = 'custom-marker-icon pickup-marker';
        break;
      case 'pickup-out-of-range':
        html = renderToString(
          <div className="flex items-center justify-center text-yellow-600">
            <MdRestaurant size={22} />
          </div>
        );
        className = 'custom-marker-icon pickup-out-of-range-marker';
        break;
      case 'delivery':
        html = renderToString(
          <div className="flex items-center justify-center text-purple-600">
            <MdHome size={22} />
          </div>
        );
        className = 'custom-marker-icon delivery-marker';
        break;
      default:
        html = renderToString(
          <div className="flex items-center justify-center text-gray-600">
            <MdMyLocation size={22} />
          </div>
        );
        className = 'custom-marker-icon default-marker';
    }
    
    return L.divIcon({
      html: html,
      className: className,
      iconSize: [30, 30],
      iconAnchor: [15, 15]
    });
  }, []);
  
  // Initialize the map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    
    if (!mapRef.current) {
      // Create the map
      mapRef.current = L.map(mapContainerRef.current, {
        center: [
          agentLocation.latitude || currentLocation.latitude || 0, 
          agentLocation.longitude || currentLocation.longitude || 0
        ],
        zoom: 13,
        layers: [
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          })
        ]
      });
      
      setMapInitialized(true);
    }
    
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);
  
  // Update the map with markers and delivery locations
  useEffect(() => {
    if (!mapRef.current || !mapInitialized) return;
    
    // Clear existing markers
    markersRef.current.forEach(marker => {
      if (mapRef.current) mapRef.current.removeLayer(marker);
    });
    markersRef.current = [];
    
    // Clear existing routes
    routesRef.current.forEach(route => {
      if (mapRef.current) mapRef.current.removeLayer(route);
    });
    routesRef.current = [];
    
    // Add agent location marker if available
    if (agentLocation.latitude && agentLocation.longitude) {
      const agentMarker = L.marker(
        [agentLocation.latitude, agentLocation.longitude],
        { icon: createCustomIcon('agent') }
      ).addTo(mapRef.current);
      
      agentMarker.bindTooltip("Your Location", {
        permanent: false,
        direction: 'top'
      });
      
      markersRef.current.push(agentMarker);
      
      // Add a 2km radius circle around agent location (delivery range)
      const radiusCircle = L.circle(
        [agentLocation.latitude, agentLocation.longitude],
        {
          radius: 2000, // 2km in meters
          color: '#4F46E5',
          fillColor: '#4F46E5',
          fillOpacity: 0.1,
          weight: 1
        }
      ).addTo(mapRef.current);
      
      markersRef.current.push(radiusCircle);
    }
        
    // We already have confirmedOrders from the top-level useSelector
    
    // Add pickup point markers
    if (pickupPoints && pickupPoints.length > 0) {
      // Create a map of order IDs to their full order objects for faster lookup
      const orderMap = {};
      if (confirmedOrders && confirmedOrders.length > 0) {
        confirmedOrders.forEach(order => {
          orderMap[order._id] = order;
        });
      }
      
      pickupPoints.forEach(point => {
        if (point.latitude && point.longitude) {
          // Find the full order object for this pickup point
          const fullOrder = orderMap[point.orderId];
          // Check if the order is within the delivery range (2km)
          const isWithinRange = distances[point.orderId] ? distances[point.orderId] <= 2 : false;
          // Add pickup point marker with appropriate icon based on distance
          const markerIcon = isWithinRange ? 'pickup' : 'pickup-out-of-range';
          const marker = L.marker(
            [point.latitude, point.longitude],
            { icon: createCustomIcon(markerIcon) }
          ).addTo(mapRef.current);
          
          // Get distance and estimated time information
          const distance = distances[point.orderId] ? 
            `${distances[point.orderId].toFixed(2)} km away` : 
            'Distance unknown';
            
          const travelTime = estimatedTravelTimes[point.orderId] ? 
            formatTime(estimatedTravelTimes[point.orderId]) : 
            'Time unknown';
            
          const pickupToDeliveryDistance = pickupToDeliveryDistances[point.orderId] ? 
            `${pickupToDeliveryDistances[point.orderId].toFixed(2)} km` : 
            'Distance unknown';

          // Get items summary
          const itemsSummary = point.orderDetails?.items?.map(item => 
            `${item.quantity}x ${item.name}`
          ).join(', ') || 'No items';
            
          // Create enhanced popup content with more details
          const popupContent = `
            <div class="pickup-popup p-3">
              <h3 class="text-sm font-bold mb-1">${point.restaurantName}</h3>
              <p class="text-xs text-gray-600">Order #${point.orderId.slice(-6)}</p>
              <p class="text-xs">${point.items} items • $${point.orderAmount?.toFixed(2) || '0.00'}</p>
              <div class="flex items-center mt-1">
                <span class="inline-flex items-center text-xs text-blue-600 mr-2">
                  <svg class="h-3 w-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd"></path>
                  </svg>
                  ${distance}
                </span>
                <span class="inline-flex items-center text-xs text-green-600">
                  <svg class="h-3 w-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"></path>
                  </svg>
                  ${travelTime}
                </span>
              </div>
              <div class="mt-2 text-xs border-t border-gray-100 pt-2">
                <p class="font-medium text-gray-700">Items:</p>
                <p class="text-gray-600">${itemsSummary}</p>
              </div>
              <div class="flex items-center justify-between mt-2">
                <div class="text-xs text-gray-600">${point.customerName}</div>
                <div class="text-xs font-medium ${point.status === 'confirmed' ? 'text-green-600' : 'text-yellow-600'}">
                  ${point.status}
                </div>
              </div>
              <button 
                class="mt-3 w-full px-3 py-1.5 bg-green-500 text-white text-xs rounded hover:bg-green-600 accept-order-btn" 
                data-order-id="${point.orderId}"
                ${acceptingOrderId === point.orderId ? 'disabled' : ''}
              >
                ${acceptingOrderId === point.orderId ? 'Accepting...' : 'Accept Order'}
              </button>
            </div>
          `;
          
          const popup = L.popup({
            closeButton: true,
            className: 'pickup-point-popup',
            maxWidth: 250
          }).setContent(popupContent);
          
          marker.bindPopup(popup);
          marker.bindTooltip(`${point.restaurantName} (${travelTime})`, {
            permanent: false,
            direction: 'top'
          });
          
          // Handle accept order button click
          marker.on('popupopen', () => {
            setTimeout(() => {
              const btn = document.querySelector(`.accept-order-btn[data-order-id="${point.orderId}"]`);
              if (btn) {
                btn.addEventListener('click', () => {
                  if (onAcceptOrder) {
                    onAcceptOrder(point.orderId);
                    marker.closePopup();
                  }
                });
              }
            }, 100);
          });
          
          markersRef.current.push(marker);
          
          // Add delivery location marker if coordinates are available and showDeliveryLocations is enabled
          if (showDeliveryLocations && point.deliveryLatitude && point.deliveryLongitude) {
            const deliveryMarker = L.marker(
              [point.deliveryLatitude, point.deliveryLongitude],
              { icon: createCustomIcon('delivery') }
            ).addTo(mapRef.current);
            
            // Create delivery location popup
            const deliveryPopupContent = `
              <div class="delivery-popup p-3">
                <h3 class="text-sm font-bold mb-1">Delivery Location</h3>
                <p class="text-xs text-gray-600">Order #${point.orderId.slice(-6)}</p>
                <p class="text-xs text-gray-600">${point.deliveryAddress}</p>
                <p class="text-xs mt-1">Customer: ${point.customerName}</p>
                <div class="flex items-center mt-1">
                  <span class="inline-flex items-center text-xs text-purple-600">
                    <svg class="h-3 w-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd"></path>
                    </svg>
                    ${pickupToDeliveryDistance} from restaurant
                  </span>
                </div>
              </div>
            `;
            
            const deliveryPopup = L.popup({
              closeButton: true,
              className: 'delivery-point-popup',
              maxWidth: 250
            }).setContent(deliveryPopupContent);
            
            deliveryMarker.bindPopup(deliveryPopup);
            deliveryMarker.bindTooltip(`Delivery for #${point.orderId.slice(-6)}`, {
              permanent: false,
              direction: 'top'
            });
            
            markersRef.current.push(deliveryMarker);
            
            // Add a route line between pickup and delivery if showRoutes is enabled
            if (showRoutes) {
              const routeLine = L.polyline(
                [
                  [point.latitude, point.longitude],
                  [point.deliveryLatitude, point.deliveryLongitude]
                ],
                {
                  color: '#6366F1', // Indigo color
                  weight: 3,
                  opacity: 0.6,
                  dashArray: '5, 5',
                  lineCap: 'round'
                }
              ).addTo(mapRef.current);
              
              // Add route information tooltip
              routeLine.bindTooltip(
                `${pickupToDeliveryDistance} • ~${Math.round((pickupToDeliveryDistances[point.orderId] / 30) * 60)} min`,
                { permanent: false }
              );
              
              routesRef.current.push(routeLine);
            }
          }
        }
      });
      
      // Fit bounds to show all markers if we have both agent location and pickup points
      if (agentLocation.latitude && agentLocation.longitude && pickupPoints.length > 0) {
        const bounds = L.latLngBounds([
          [agentLocation.latitude, agentLocation.longitude],
        ]);
        
        // Add pickup points to bounds
        pickupPoints.forEach(point => {
          if (point.latitude && point.longitude) {
            bounds.extend([point.latitude, point.longitude]);
          }
        });
        
        // Add delivery points to bounds if showing
        if (showDeliveryLocations) {
          pickupPoints.forEach(point => {
            if (point.deliveryLatitude && point.deliveryLongitude) {
              bounds.extend([point.deliveryLatitude, point.deliveryLongitude]);
            }
          });
        }
        
        // Apply padding to bounds
        mapRef.current.fitBounds(bounds, {
          padding: [50, 50],
          maxZoom: 14
        });
      }
    }
  }, [agentLocation, pickupPoints, distances, estimatedTravelTimes, pickupToDeliveryDistances, 
      mapInitialized, createCustomIcon, onAcceptOrder, showDeliveryLocations, showRoutes, 
      currentLocation.latitude, currentLocation.longitude, acceptingOrderId, formatTime]);
  
  // Add toggle controls for the map
  useEffect(() => {
    if (!mapRef.current || !mapInitialized) return;
    
    // Create custom controls for toggling delivery locations and routes
    const deliveryControlDiv = L.DomUtil.create('div', 'leaflet-control leaflet-bar');
    deliveryControlDiv.style.backgroundColor = 'white';
    deliveryControlDiv.style.padding = '5px';
    deliveryControlDiv.style.cursor = 'pointer';
    deliveryControlDiv.innerHTML = showDeliveryLocations ? 
      renderToString(<MdHome size={20} className="text-purple-600" />) : 
      renderToString(<MdHome size={20} className="text-gray-400" />);
    deliveryControlDiv.title = showDeliveryLocations ? 'Hide delivery locations' : 'Show delivery locations';
    deliveryControlDiv.onclick = (e) => {
      L.DomEvent.stopPropagation(e);
      setShowDeliveryLocations(!showDeliveryLocations);
    };
    
    const routeControlDiv = L.DomUtil.create('div', 'leaflet-control leaflet-bar');
    routeControlDiv.style.backgroundColor = 'white';
    routeControlDiv.style.padding = '5px';
    routeControlDiv.style.cursor = 'pointer';
    routeControlDiv.innerHTML = showRoutes ? 
      renderToString(<MdDirections size={20} className="text-indigo-600" />) : 
      renderToString(<MdDirections size={20} className="text-gray-400" />);
    routeControlDiv.title = showRoutes ? 'Hide routes' : 'Show routes';
    routeControlDiv.onclick = (e) => {
      L.DomEvent.stopPropagation(e);
      setShowRoutes(!showRoutes);
    };
    
    const refreshControlDiv = L.DomUtil.create('div', 'leaflet-control leaflet-bar');
    refreshControlDiv.style.backgroundColor = 'white';
    refreshControlDiv.style.padding = '5px';
    refreshControlDiv.style.cursor = 'pointer';
    refreshControlDiv.innerHTML = renderToString(
      isLoading ? 
      <div className="animate-spin"><MdTimer size={20} className="text-blue-600" /></div> : 
      <MdRefresh size={20} className="text-blue-600" />
    );
    refreshControlDiv.title = 'Refresh orders';
    refreshControlDiv.onclick = (e) => {
      L.DomEvent.stopPropagation(e);
      handleRefreshOrders();
    };
    
    // Create custom control instances
    const deliveryControl = L.control({ position: 'topright' });
    deliveryControl.onAdd = () => deliveryControlDiv;
    
    const routeControl = L.control({ position: 'topright' });
    routeControl.onAdd = () => routeControlDiv;
    
    const refreshControl = L.control({ position: 'topright' });
    refreshControl.onAdd = () => refreshControlDiv;
    
    // Add controls to map
    deliveryControl.addTo(mapRef.current);
    routeControl.addTo(mapRef.current);
    refreshControl.addTo(mapRef.current);
    
    return () => {
      if (mapRef.current) {
        mapRef.current.removeControl(deliveryControl);
        mapRef.current.removeControl(routeControl);
        mapRef.current.removeControl(refreshControl);
      }
    };
  }, [mapInitialized, showDeliveryLocations, showRoutes, isLoading, handleRefreshOrders]);
  
  return (
    <div className="confirmed-orders-map relative" style={{ height, width: '100%' }}>
      {(!agentLocation.latitude || !agentLocation.longitude) && (
        <div className="flex items-center justify-center h-full bg-gray-100 text-gray-600">
          <div className="text-center">
            <MdMyLocation size={32} className="mx-auto mb-2 text-gray-400" />
            <p>Waiting for location data...</p>
          </div>
        </div>
      )}
      <div 
        ref={mapContainerRef} 
        className="h-full w-full rounded-lg overflow-hidden"
        style={{ display: (!agentLocation.latitude || !agentLocation.longitude) ? 'none' : 'block' }}
      ></div>
      
      {/* Info overlay */}
      {mapInitialized && pickupPoints && pickupPoints.length > 0 && (
        <div className="absolute bottom-2 left-2 bg-white bg-opacity-90 p-2 rounded-md shadow-sm text-xs z-[1000]">
          <div className="font-medium text-gray-700 mb-1">{pickupPoints.length} confirmed orders</div>
          <div className="text-gray-600">
            Last updated: {lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : 'Never'}
          </div>
        </div>
      )}
    </div>
  );
};

export default ConfirmedOrdersMap;
