/**
 * Utility functions for distance calculations and location handling
 */

/**
 * Calculate distance between two points in kilometers using the Haversine formula
 * @param {number} lat1 - Latitude of first point
 * @param {number} lon1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lon2 - Longitude of second point
 * @returns {number} Distance in kilometers
 */
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  // Handle invalid or missing coordinates
  if (!lat1 || !lon1 || !lat2 || !lon2 || 
      isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)) {
    return 9999; // Return large distance as fallback
  }
  
  // Convert degrees to radians
  const deg2rad = (deg) => deg * (Math.PI / 180);
  const radLat1 = deg2rad(lat1);
  const radLon1 = deg2rad(lon1);
  const radLat2 = deg2rad(lat2);
  const radLon2 = deg2rad(lon2);
  
  // Haversine formula
  const dLat = radLat2 - radLat1;
  const dLon = radLon2 - radLon1;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(radLat1) * Math.cos(radLat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  // Earth radius in kilometers
  const earthRadius = 6371;
  const distance = earthRadius * c;
  
  return distance;
};

/**
 * Check if a location has changed significantly
 * @param {Object} lastPosition - Previous position with latitude and longitude
 * @param {Object} currentPosition - Current position with latitude and longitude
 * @param {number} threshold - Threshold in kilometers
 * @returns {boolean} True if location has changed significantly
 */
export const hasLocationChangedSignificantly = (lastPosition, currentPosition, threshold = 0.1) => {
  if (!lastPosition?.latitude || !lastPosition?.longitude || 
      !currentPosition?.latitude || !currentPosition?.longitude) {
    return true; // Default to true if coordinates are missing
  }
  
  // Calculate rough distance using coordinate differences
  const latDiff = Math.abs(lastPosition.latitude - currentPosition.latitude);
  const lonDiff = Math.abs(lastPosition.longitude - currentPosition.longitude);
  
  // Approximate check - if coordinates have changed by more than this threshold
  // roughly corresponds to 100 meters at equator
  const changeThreshold = 0.001; // About 100 meters
  
  return (latDiff > changeThreshold || lonDiff > changeThreshold);
};

/**
 * Format coordinates to be more readable
 * @param {number} coord - Coordinate value
 * @returns {string} Formatted coordinate
 */
export const formatCoordinate = (coord) => {
  if (coord === null || coord === undefined || isNaN(coord)) return "N/A";
  return coord.toFixed(6);
};
