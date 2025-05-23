import React, { useState, useEffect, useRef } from "react";
import { FiHeart, FiMessageCircle, FiSend, FiBookmark, FiShare, FiMapPin, FiNavigation, FiMap } from "react-icons/fi";
import { FcLike } from "react-icons/fc";
import { Star, StarBorder, StarHalf } from "@mui/icons-material";
import { Avatar, Badge, Menu, MenuItem, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions, Button, Rating, TextField, Box, Typography, CircularProgress, Grid } from "@mui/material";
import CommentDialog from "../comment/CommentDialog";
import ShareDialog from "../share/ShareDialog";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import axios from "axios";
import { setPosts, setSelectedPost } from "../../redux/postSlice";
import {
  addToCart,
  decreaseQuantity,
  increaseQuantity,
  removeFromCart,
} from "../../redux/cartSlice";
import { addNotification } from "../../redux/rtnSlice";
import { updateBookmarks, syncUserBookmarks } from "../../redux/authSlice";
import useCart from "../../hooks/useCart";

// Define a GoogleMap component within the file
const GoogleMapEmbed = ({ lat1, lon1, lat2, lon2, height = 400 }) => {
  // Generate a static map URL with markers for both locations
  const createStaticMapUrl = () => {
    const zoom = 13;
    const size = "600x400";
    const mapType = "roadmap";
    
    // Center point is the midpoint between the two locations
    const centerLat = (lat1 + lat2) / 2;
    const centerLon = (lon1 + lon2) / 2;
    
    // Create marker parameters for user location (red) and vendor location (blue)
    const markers = [
      `color:red|label:U|${lat1},${lon1}`,
      `color:blue|label:V|${lat2},${lon2}`
    ];
    
    // Create a path between the two points
    const path = `color:0x0000ff80|weight:5|${lat1},${lon1}|${lat2},${lon2}`;
    
    // Assemble the URL
    return `https://maps.googleapis.com/maps/api/staticmap?center=${centerLat},${centerLon}&zoom=${zoom}&size=${size}&maptype=${mapType}&markers=${markers.join('&markers=')}&path=${path}`;
  };
  
  // Alternative method using OpenStreetMap for embedded maps without API key
  const createOpenStreetMapUrl = () => {
    // Calculate center point and appropriate zoom
    const centerLat = (lat1 + lat2) / 2;
    const centerLon = (lon1 + lon2) / 2;
    
    // You can adjust the zoom level based on the distance between points
    const zoom = 13;
    
    // Create the iframe URL - this opens the map in a new window when clicked
    return `https://www.openstreetmap.org/export/embed.html?bbox=${centerLon-0.02}%2C${centerLat-0.02}%2C${centerLon+0.02}%2C${centerLat+0.02}&layer=mapnik&marker=${lat1}%2C${lon1}%3B${lat2}%2C${lon2}`;
  };
  
  return (
    <iframe 
      width="100%" 
      height={height} 
      frameBorder="0" 
      scrolling="no" 
      marginHeight="0" 
      marginWidth="0" 
      src={createOpenStreetMapUrl()}
      style={{ border: '1px solid #ddd', borderRadius: '4px' }}
    ></iframe>
  );
};

// API base URL from environment or default to localhost
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

/**
 * Calculate the distance between two points using the Haversine formula with enhanced accuracy
 * @param {Array|Object} coords1 - [longitude, latitude] or {longitude, latitude}
 * @param {Array|Object} coords2 - [longitude, latitude] or {longitude, latitude}
 * @returns {Object} Distance in kilometers and miles with additional metadata
 */
const haversineDistance = (coords1, coords2) => {
  try {
    if (!coords1 || !coords2) return null;
    
    // Extract coordinates handling both array and object formats
    let lon1, lat1, lon2, lat2;
    
    if (Array.isArray(coords1)) {
      [lon1, lat1] = coords1;
    } else if (typeof coords1 === 'object') {
      lon1 = parseFloat(coords1.longitude);
      lat1 = parseFloat(coords1.latitude);
    } else {
      return null;
    }
    
    if (Array.isArray(coords2)) {
      [lon2, lat2] = coords2;
    } else if (typeof coords2 === 'object') {
      lon2 = parseFloat(coords2.longitude);
      lat2 = parseFloat(coords2.latitude);
    } else {
      return null;
    }
    
    // Validate coordinates - must be numbers and within valid ranges
    if (isNaN(lon1) || isNaN(lat1) || isNaN(lon2) || isNaN(lat2)) return null;
    if (Math.abs(lat1) > 90 || Math.abs(lat2) > 90) return null;
    if (Math.abs(lon1) > 180 || Math.abs(lon2) > 180) return null;

    // Convert coordinates from degrees to radians
    const toRad = (value) => (value * Math.PI) / 180;
    const R = 6371; // Earth's radius in km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    
    // Enhanced Haversine formula for better accuracy with small distances
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
        
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distanceKm = R * c;
    const distanceMiles = distanceKm * 0.621371;
    
    // Calculate bearing/direction
    const y = Math.sin(dLon) * Math.cos(toRad(lat2));
    const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
              Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);
    const bearing = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
    
    // Get cardinal direction
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW', 'N'];
    const cardinalDirection = directions[Math.round(bearing / 45)];
    
    // Calculate estimated travel time (rough estimate)
    const walkingTimeMinutes = distanceKm / 0.0833; // Assuming 5km/hour walking speed
    const drivingTimeMinutes = distanceKm / 0.5; // Assuming 30km/hour in city traffic
    
    return {
      kilometers: distanceKm,
      miles: distanceMiles,
      bearing: bearing,
      direction: cardinalDirection,
      estimates: {
        walkingTime: walkingTimeMinutes,
        drivingTime: drivingTimeMinutes
      },
      points: {
        origin: [lat1, lon1],
        destination: [lat2, lon2]
      }
    };
  } catch (error) {
    console.error("Error calculating distance:", error);
    return null;
  }
};

// Add this reverse geocoding function
/**
 * Get address from coordinates using reverse geocoding
 * @param {Array} coords - [latitude, longitude] 
 * @returns {Promise<Object>} Address information
 */
const getAddressFromCoords = async (coords) => {
  try {
    if (!coords || !Array.isArray(coords) || coords.length !== 2) {
      return null;
    }
    
    const [lat, lng] = coords;
    
    // Use Nominatim API for reverse geocoding (OpenStreetMap)
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      {
        headers: {
          'Accept-Language': 'en',
          'User-Agent': 'FoodDeliveryApp/1.0'
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`Error: ${response.status}`);
    }
    
    const data = await response.json();
    
    return {
      fullAddress: data.display_name,
      city: data.address.city || data.address.town || data.address.village || 'Unknown',
      state: data.address.state || 'Unknown',
      country: data.address.country || 'Unknown',
      road: data.address.road || 'Unknown',
      postalCode: data.address.postcode || 'Unknown',
      raw: data
    };
  } catch (error) {
    console.error("Error fetching address:", error);
    return null;
  }
};

// Rating Stars Component
const RatingStars = ({ value, readOnly = true, precision = 0.5, size = "small", onChange, highlightSelectedOnly = false }) => {
  return (
    <Rating
      name="rating"
      value={value}
      readOnly={readOnly}
      precision={precision}
      size={size}
      onChange={onChange}
      highlightSelectedOnly={highlightSelectedOnly}
    />
  );
};

// Rating Dialog Component
const RatingDialog = ({ open, onClose, postId, existingRating, onRatingSubmitted }) => {
  const [rating, setRating] = useState(existingRating?.value || 0);
  const [comment, setComment] = useState(existingRating?.comment || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (rating < 1) {
      setError("Please select a rating");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/v1/post/${postId}/rate`,
        { rating, comment },
        { withCredentials: true }
      );

      if (response.data.success) {
        toast.success(response.data.message);
        if (onRatingSubmitted) {
          onRatingSubmitted(response.data.rating);
        }
        onClose();
      }
    } catch (error) {
      setError(error.response?.data?.message || "Failed to submit rating");
      toast.error(error.response?.data?.message || "Failed to submit rating");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {existingRating ? "Update Your Rating" : "Rate This Food Item"}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, my: 2 }}>
          <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
            <Rating
              size="large"
              value={rating}
              onChange={(e, newValue) => {
                setRating(newValue);
                setError("");
              }}
              precision={1}
            />
          </Box>
          {error && (
            <Typography color="error" variant="body2">
              {error}
            </Typography>
          )}
          <TextField
            label="Share your experience (optional)"
            multiline
            rows={4}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            fullWidth
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          color="primary"
          variant="contained"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <CircularProgress size={24} color="inherit" />
          ) : existingRating ? (
            "Update Rating"
          ) : (
            "Submit Rating"
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// Rating Summary Component
const RatingSummary = ({ postId, initialRating, onClose }) => {
  const [ratings, setRatings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchRatings = async () => {
      try {
        const response = await axios.get(
          `${API_BASE_URL}/api/v1/post/${postId}/ratings`,
          { withCredentials: true }
        );
        if (response.data.success) {
          setRatings(response.data.ratings);
        }
      } catch (error) {
        setError("Failed to load ratings");
        console.error("Error fetching ratings:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRatings();
  }, [postId]);

  // Calculate percentage for each star rating
  const calculatePercentage = (count) => {
    if (!ratings || ratings.count === 0) return 0;
    return Math.round((count / ratings.count) * 100);
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3, color: "error.main" }}>
        <Typography>{error}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
        <Box sx={{ mr: 2 }}>
          <Typography variant="h4" component="div" sx={{ fontWeight: "bold" }}>
            {ratings?.average?.toFixed(1) || 0}
          </Typography>
          <RatingStars value={ratings?.average || 0} readOnly />
          <Typography variant="body2" color="text.secondary">
            {ratings?.count || 0} {ratings?.count === 1 ? "rating" : "ratings"}
          </Typography>
        </Box>
        <Box sx={{ flexGrow: 1 }}>
          {[5, 4, 3, 2, 1].map((star) => (
            <Box key={star} sx={{ display: "flex", alignItems: "center", mb: 0.5 }}>
              <Typography variant="body2" sx={{ minWidth: "30px" }}>
                {star}
              </Typography>
              <Box
                sx={{
                  flexGrow: 1,
                  mx: 1,
                  height: 8,
                  bgcolor: "grey.300",
                  borderRadius: 1,
                  overflow: "hidden",
                }}
              >
                <Box
                  sx={{
                    width: `${calculatePercentage(ratings?.distribution[star] || 0)}%`,
                    height: "100%",
                    bgcolor: star > 3 ? "success.main" : star > 1 ? "warning.main" : "error.main",
                  }}
                />
              </Box>
              <Typography variant="body2" sx={{ minWidth: "40px" }}>
                {calculatePercentage(ratings?.distribution[star] || 0)}%
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>
      
      {/* Recent ratings section */}
      {ratings?.recentRatings?.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: "bold" }}>
            Recent Reviews
          </Typography>
          {ratings.recentRatings.map((rating, index) => (
            <Box key={index} sx={{ mb: 2, pb: 2, borderBottom: index !== ratings.recentRatings.length - 1 ? "1px solid #eee" : "none" }}>
              <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                <Avatar 
                  src={rating.user?.profilePicture} 
                  alt={rating.user?.username} 
                  sx={{ width: 32, height: 32, mr: 1 }} 
                />
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: "bold" }}>
                    {rating.user?.username}
                  </Typography>
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    <RatingStars value={rating.value} size="small" readOnly />
                    <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                      {new Date(rating.createdAt).toLocaleDateString()}
                    </Typography>
                  </Box>
                </Box>
              </Box>
              {rating.comment && (
                <Typography variant="body2" sx={{ ml: 5 }}>
                  {rating.comment}
                </Typography>
              )}
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
};

const PostCard = ({ post }) => {
  const { user } = useSelector((store) => store.auth);
  const [liked, setLiked] = useState(post?.likes && user?._id ? post.likes.includes(user._id) : false);
  const [likeCount, setLikeCount] = useState(post?.likes?.length || 0);
  const [shareCount, setShareCount] = useState(post?.shareCount || 0);
  const [commentText, setCommentText] = useState("");
  const [comments, setComments] = useState(post?.comments || []);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [commentDialogOpen, setCommentDialogOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [bookmarked, setBookmarked] = useState(
    user?.bookmarks && post?._id ? user.bookmarks.includes(post._id) : false
  );
  const [distance, setDistance] = useState(null);
  const [locationStatus, setLocationStatus] = useState('loading'); // 'loading', 'ready', 'missing', 'error'
  const [locationErrorMsg, setLocationErrorMsg] = useState('');
  
  // Rating states
  const [postRating, setPostRating] = useState({
    average: post?.rating?.average || 0,
    count: post?.rating?.count || 0,
    userRating: null
  });
  const [ratingDialogOpen, setRatingDialogOpen] = useState(false);
  const [ratingDetailsOpen, setRatingDetailsOpen] = useState(false);
  const [loadingRating, setLoadingRating] = useState(false);

  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  // Use the cart hook
  const { 
    loading: cartLoading, 
    cartItems, 
    stockErrors,
    addItem, 
    increaseItem, 
    decreaseItem, 
    isItemInCart,
    getItemQuantity,
    getStockError
  } = useCart();

  const { posts } = useSelector((store) => store.post);
  
  // Monitor stock errors to show toast notifications
  useEffect(() => {
    if (!post || !post._id) return;
    
    const postStockError = getStockError(post._id);
    if (postStockError) {
      toast.warning(postStockError);
    }
  }, [stockErrors, post?._id, getStockError]);

  // Check if post is in user's bookmarks when component mounts
  useEffect(() => {
    if (!user || !user.bookmarks || !Array.isArray(user.bookmarks) || !post || !post._id) return;
    
    setBookmarked(user.bookmarks.includes(post._id));
  }, [user, post?._id]);

  // Fetch user's rating for this post
  useEffect(() => {
    const fetchUserRating = async () => {
      if (!user || !post || !post._id) return;
      
      setLoadingRating(true);
      try {
        const response = await axios.get(
          `${API_BASE_URL}/api/v1/post/${post._id}/ratings`,
          { withCredentials: true }
        );
        if (response.data.success) {
          setPostRating({
            average: response.data.ratings.average,
            count: response.data.ratings.count,
            userRating: response.data.ratings.userRating
          });
        }
      } catch (error) {
        console.error("Error fetching user rating:", error);
      } finally {
        setLoadingRating(false);
      }
    };

    fetchUserRating();
  }, [post?._id, user]);

  // Add these new state variables
  const [showMap, setShowMap] = useState(false);
  const [addressInfo, setAddressInfo] = useState({
    user: null,
    vendor: null
  });
  const [locationAccuracy, setLocationAccuracy] = useState(null);
  const [distanceDetails, setDistanceDetails] = useState(null);

  // Update the calculateDistance function inside the useEffect (around line 403)
  // Replace the existing calculateDistance function with this:
  const calculateDistance = async () => {
    try {
      // Reset status
      setLocationStatus('loading');
      setLocationErrorMsg('');
      setDistanceDetails(null);
      
      // Debug logging
      console.log("User location data:", user?.location);
      console.log("Post author location data:", post?.author?.location);
      
      // Check if we have both user and post location data
      if (!user?.location) {
        console.log("Missing user location data");
        setLocationStatus('missing');
        setLocationErrorMsg('Your location is not set');
        setDistance(null);
        return;
      }
      
      if (!post?.author?.location) {
        console.log("Missing post author location data");
        setLocationStatus('missing');
        setLocationErrorMsg("Vendor's location is not available");
        setDistance(null);
        return;
      }
      
      // Get coordinates from both locations
      const userCoords = user.location.coordinates;
      const postAuthorCoords = post.author.location.coordinates;
      
      console.log("User coordinates:", userCoords);
      console.log("Post author coordinates:", postAuthorCoords);
      
      // Validate coordinates
      if (!userCoords || !Array.isArray(userCoords) || userCoords.length !== 2) {
        console.warn("Invalid user coordinates format:", userCoords);
        setLocationStatus('error');
        setLocationErrorMsg('Your location data is invalid');
        setDistance(null);
        return;
      }
      
      if (!postAuthorCoords || !Array.isArray(postAuthorCoords) || postAuthorCoords.length !== 2) {
        console.warn("Invalid post author coordinates format:", postAuthorCoords);
        setLocationStatus('error');
        setLocationErrorMsg('Vendor location data is invalid');
        setDistance(null);
        return;
      }
      
      // Calculate the detailed distance
      const distData = haversineDistance(userCoords, postAuthorCoords);
      console.log("Calculated distance details:", distData);
      
      if (!distData) {
        setLocationStatus('error');
        setLocationErrorMsg('Could not calculate distance');
        setDistance(null);
      } else {
        setLocationStatus('ready');
        setDistance(distData.kilometers);
        setDistanceDetails(distData);
        
        // Fetch address information
        try {
          // Need to reverse coordinates for Nominatim API [lat, lon] instead of [lon, lat]
          const userAddrCoords = [userCoords[1], userCoords[0]];
          const vendorAddrCoords = [postAuthorCoords[1], postAuthorCoords[0]];
          
          const [userAddr, vendorAddr] = await Promise.all([
            getAddressFromCoords(userAddrCoords),
            getAddressFromCoords(vendorAddrCoords)
          ]);
          
          setAddressInfo({
            user: userAddr,
            vendor: vendorAddr
          });
        } catch (addrError) {
          console.error("Error fetching address info:", addrError);
          // We don't fail the whole operation just because address fetch failed
        }
      }
    } catch (error) {
      console.error("Error in distance calculation:", error);
      setLocationStatus('error');
      setLocationErrorMsg('An error occurred calculating distance');
      setDistance(null);
    }
  };

  useEffect(() => {
    calculateDistance();
  }, [user?.location, post?.author?.location]);

  // Update the updateUserLocation function
  // Replace the existing updateUserLocation function with this enhanced version:
  const updateUserLocation = async () => {
    try {
      setLocationStatus('updating');
      setLocationErrorMsg('');
      
      if (navigator.geolocation) {
        // Use high accuracy for better precision
        const options = {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        };
        
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const userLocation = {
              longitude: position.coords.longitude,
              latitude: position.coords.latitude,
            };
            
            // Store accuracy for display
            setLocationAccuracy(position.coords.accuracy);
            
            console.log("Got position with accuracy:", position.coords.accuracy, "meters");
            
            try {
              const res = await axios.post(
                `${API_BASE_URL}/api/v1/user/location`,
                userLocation,
                {
                  headers: { "Content-Type": "application/json" },
                  withCredentials: true,
                }
              );
              
              if (res.data.success) {
                toast.success("Location updated successfully");
                // Instead of reloading, update the user location in state
                const updatedUser = {...user, location: {
                  type: "Point",
                  coordinates: [userLocation.longitude, userLocation.latitude]
                }};
                
                // Here we would update the user in redux, but for now we'll reload the page
                window.location.reload();
              }
            } catch (error) {
              console.error("Error updating location:", error);
              setLocationStatus('error');
              setLocationErrorMsg('Failed to save your location');
              toast.error("Failed to update your location");
            }
          },
          (error) => {
            console.error("Geolocation error:", error);
            setLocationStatus('error');
            
            switch (error.code) {
              case error.PERMISSION_DENIED:
                setLocationErrorMsg('Location permission denied');
                toast.error("You denied the location permission");
                break;
              case error.POSITION_UNAVAILABLE:
                setLocationErrorMsg('Location information unavailable');
                toast.error("Location information is unavailable");
                break;
              case error.TIMEOUT:
                setLocationErrorMsg('Location request timed out');
                toast.error("Location request timed out");
                break;
              default:
                setLocationErrorMsg('Unknown location error');
                toast.error("An unknown error occurred");
            }
          },
          options
        );
      } else {
        setLocationStatus('error');
        setLocationErrorMsg('Geolocation not supported');
        toast.error("Geolocation is not supported by your browser");
      }
    } catch (error) {
      console.error("Location update error:", error);
      setLocationStatus('error');
      setLocationErrorMsg('Failed to update location');
      toast.error("Failed to update location");
    }
  };

  // Add this function to handle opening the map
  const handleShowMap = () => {
    setShowMap(true);
  };

  // Replace the renderDistance function with this improved version 
  const renderDistance = () => {
    if (locationStatus === 'updating') {
      return (
        <p className="text-xs text-blue-500 flex items-center gap-1 animate-pulse">
          <FiNavigation size={12} className="animate-spin" />
          Updating location...
        </p>
      );
    } else if (locationStatus === 'ready' && distance !== null) {
      return (
        <div className="flex flex-col">
          <p 
            className="text-xs text-green-600 flex items-center gap-1 cursor-pointer"
            onClick={handleShowMap}
          >
            <FiMapPin size={12} />
            {distance < 1 
              ? `${(distance * 1000).toFixed(0)}m ${distanceDetails?.direction || ''}`
              : `${distance.toFixed(1)}km ${distanceDetails?.direction || ''}`}
            <FiMap size={12} className="ml-1 text-blue-500" />
          </p>
          {distanceDetails && (
            <p className="text-xs text-gray-500">
              ~{Math.ceil(distanceDetails.estimates.drivingTime)} min delivery
            </p>
          )}
        </div>
      );
    } else if (locationStatus === 'missing' || locationStatus === 'error') {
      return (
        <Tooltip title={locationErrorMsg || 'Location data unavailable'}>
          <p 
            className="text-xs text-orange-500 flex items-center gap-1 cursor-pointer"
            onClick={updateUserLocation}
          >
            <FiNavigation size={12} />
            Update location
          </p>
        </Tooltip>
      );
    } else {
      return (
        <p className="text-xs text-gray-400 flex items-center gap-1">
          <FiMapPin size={12} className="animate-pulse" />
          Calculating...
        </p>
      );
    }
  };

  const handleLike = async () => {
    try {
      if (!post || !post._id || !user || !user._id) {
        toast.error("Cannot like post: missing post or user information");
        return;
      }
      
      const action = liked ? "dislike" : "like";
      const res = await axios.get(
        `http://localhost:8000/api/v1/post/${post._id}/${action}`,
        { withCredentials: true }
      );

      if (res.data.success) {
        const updatedLikes = liked
          ? post.likes.filter((id) => id !== user._id)
          : [...post.likes, user._id];

        const updatedPosts = posts.map((p) =>
          p._id === post._id ? { ...p, likes: updatedLikes } : p
        );

        dispatch(setPosts(updatedPosts));

        setLiked(!liked);
        
        setLikeCount(updatedLikes.length);
        // Server will handle notifications via socket
        
        toast.success(res.data.message);
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "Error updating like.");
    }
  };

  const handleComment = async () => {
    if (!commentText.trim()) return;
    
    if (!post || !post._id) {
      toast.error("Cannot comment: missing post information");
      return;
    }

    try {
      const res = await axios.post(
        `http://localhost:8000/api/v1/post/${post._id}/comment`,
        { text: commentText },
        {
          headers: { "Content-Type": "application/json" },
          withCredentials: true,
        }
      );

      if (res.data.success) {
        const updatedComments = [...comments, res.data.comment];
        setComments(updatedComments);
        setCommentText("");

        const updatedPosts = posts.map((p) =>
          p._id === post._id ? { ...p, comments: updatedComments } : p
        );
        dispatch(setPosts(updatedPosts));
        toast.success(res.data.message);
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "Comment failed.");
    }
  };

  const handleDeletePost = async () => {
    try {
      const res = await axios.delete(
        `http://localhost:8000/api/v1/post/delete/${post._id}`,
        { withCredentials: true }
      );

      if (res.data.success) {
        const updatedPosts = posts.filter((p) => p._id !== post._id);
        dispatch(setPosts(updatedPosts));

        // Remove from cart if present
        dispatch(removeFromCart(post._id));

        toast.success(res.data.message);
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "Deletion failed.");
    }
  };

  const handleBookmark = async () => {
    try {
      if (!post || !post._id) {
        toast.error("Cannot bookmark: missing post information");
        return;
      }
      
      if (!user || !user._id) {
        toast.error("Please login to bookmark posts");
        return;
      }
      
      console.log(`Attempting to toggle bookmark for post: ${post._id}`);
      
      // Optimistically update UI state for better UX
      const newBookmarkState = !bookmarked;
      setBookmarked(newBookmarkState);
      
      // Use API_BASE_URL constant for consistency
      const res = await axios.get(
        `${API_BASE_URL}/api/v1/post/${post._id}/bookmark`,
        { 
          withCredentials: true,
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (res.data.success) {
        console.log(`Bookmark ${res.data.type} for post ${post._id} success`);
        
        // Update bookmarks in the auth store
        dispatch(updateBookmarks(post._id));
        toast.success(res.data.message);
        
        // Sync bookmarks from server to ensure consistency
        setTimeout(() => {
          dispatch(syncUserBookmarks())
            .unwrap()
            .then(bookmarks => {
              console.log("Bookmarks synced after bookmark action:", bookmarks);
              
              // Ensure UI state matches backend state
              if (bookmarks) {
                const isBookmarked = bookmarks.includes(post._id);
                if (isBookmarked !== newBookmarkState) {
                  console.log("UI state mismatch, correcting...");
                  setBookmarked(isBookmarked);
                }
              }
            })
            .catch(err => {
              console.error("Failed to sync bookmarks after action:", err);
            });
        }, 500); // Small delay to allow backend to complete its operation
      } else {
        // Revert UI state if request failed
        setBookmarked(!newBookmarkState);
        toast.error("Error updating bookmark status");
      }
    } catch (error) {
      console.error("Bookmark error:", error);
      // Revert UI state on error
      setBookmarked(!bookmarked);
      toast.error(error?.response?.data?.message || "Error updating bookmark.");
    }
  };

  const handleShare = () => {
    setShareDialogOpen(true);
    handleMenuClose();
  };

  const handleShareSuccess = () => {
    setShareCount(prevCount => prevCount + 1);
    
    // Update share count in posts state
    const updatedPosts = posts.map((p) =>
      p._id === post._id ? { ...p, shareCount: (p.shareCount || 0) + 1 } : p
    );
    dispatch(setPosts(updatedPosts));
  };

  // Handle add to cart
  const addToCartHandler = () => {
    // Check if post is properly defined
    if (!post || !post._id) {
      toast.error("Cannot add to cart: missing post information");
      return;
    }
    
    // Create the cart item with all necessary details
    const cartItem = {
      _id: post._id,
      name: post.caption || "Unnamed Item",
      image: post.image || "",
      price: parseFloat(post.price) || 0,
      author: post.author?._id || "",
      vegetarian: Boolean(post.vegetarian),
      spicyLevel: post.spicyLevel || "medium",
      category: post.category || "Other",
    };
    
    // Add to cart using the hook
    addItem(cartItem);
    
    // Animate the cart icon
    animateCartAddition();
  };
  
  // Animation function
  const animateCartAddition = () => {
    try {
      const cartIcon = document.querySelector(".cart-icon") || document.querySelector("[data-testid='ShoppingCartIcon']");
      if (cartIcon) {
        cartIcon.classList.add("cart-icon-pulse");
        setTimeout(() => {
          cartIcon.classList.remove("cart-icon-pulse");
        }, 1000);
        
        // Create a floating animation from the product to the cart icon
        const productElement = document.getElementById(`post-${post._id}`);
        
        if (productElement && cartIcon) {
          // Create a flying image element
          const flyingImg = document.createElement("img");
          flyingImg.src = post.image || "/default-food-image.jpg";
          flyingImg.className = "flying-cart-item";
          flyingImg.style.position = "fixed";
          
          // Get positions
          const productRect = productElement.getBoundingClientRect();
          const cartRect = cartIcon.getBoundingClientRect();
          
          // Set starting position
          flyingImg.style.width = "50px";
          flyingImg.style.height = "50px";
          flyingImg.style.borderRadius = "50%";
          flyingImg.style.objectFit = "cover";
          flyingImg.style.zIndex = "9999";
          flyingImg.style.transition = "all 0.8s ease-in-out";
          flyingImg.style.left = `${productRect.left + productRect.width / 2 - 25}px`;
          flyingImg.style.top = `${productRect.top + productRect.height / 2 - 25}px`;
          
          // Add to DOM
          document.body.appendChild(flyingImg);
          
          // Trigger animation
          setTimeout(() => {
            flyingImg.style.left = `${cartRect.left + cartRect.width / 2 - 25}px`;
            flyingImg.style.top = `${cartRect.top + cartRect.height / 2 - 25}px`;
            flyingImg.style.opacity = "0.5";
            flyingImg.style.transform = "scale(0.3)";
          }, 10);
          
          // Remove from DOM after animation
          setTimeout(() => {
            if (flyingImg && flyingImg.parentNode) {
              flyingImg.remove();
            }
          }, 800);
        }
      }
    } catch (error) {
      console.error("Animation error:", error);
      // Animation failure shouldn't affect cart functionality
    }
  };

  const handleMenuOpen = (e) => setMenuAnchor(e.currentTarget);
  const handleMenuClose = () => setMenuAnchor(null);

  const handleAddToFavorites = () => {
    handleBookmark();
    handleMenuClose();
  };

  const handleRatingClick = () => {
    setRatingDialogOpen(true);
  };
  
  // Navigate to post detail page
  const handleViewPostDetail = () => {
    if (post && post._id) {
      navigate(`/post/${post._id}`);
    }
  };

  const handleRatingSubmitted = (newRating) => {
    setPostRating({
      average: newRating.average,
      count: newRating.count,
      userRating: newRating.userRating
    });
    
    // Update post in global state to reflect new rating
    const updatedPosts = posts.map(p => 
      p._id === post._id 
        ? { ...p, rating: { average: newRating.average, count: newRating.count } } 
        : p
    );
    dispatch(setPosts(updatedPosts));
  };

  const handleViewRatings = () => {
    setRatingDetailsOpen(true);
  };

  // Render rating section
  const renderRating = () => {
    return (
      <Box sx={{ display: "flex", alignItems: "center", mt: 1, mb: 1 }}>
        <Box 
          sx={{ 
            display: "flex", 
            alignItems: "center", 
            cursor: "pointer" 
          }}
          onClick={handleViewRatings}
        >
          <RatingStars value={postRating.average} readOnly size="small" />
          <Typography variant="body2" color="text.secondary" sx={{ ml: 0.5 }}>
            ({postRating.count})
          </Typography>
        </Box>
        <Button 
          size="small" 
          variant="outlined" 
          sx={{ ml: 'auto', borderRadius: '20px', fontSize: '0.7rem' }}
          onClick={handleRatingClick}
          color={postRating.userRating ? "success" : "primary"}
        >
          {postRating.userRating ? "Update Rating" : "Rate"}
        </Button>
      </Box>
    );
  };

  return (
    <div id={`post-${post._id}`} className="relative bg-white rounded-lg shadow-sm overflow-hidden mb-4 w-full mx-auto max-w-full">
      <div className="flex items-center justify-between p-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Link to={`/profile/${post.author?._id}`} className="rounded-full overflow-hidden border border-gray-100">
            {post.author?._id === user?._id ? (
              <Badge color="primary" variant="dot">
                <Avatar
                  alt="User"
                  src={post?.author?.profilePicture}
                  sx={{ width: 36, height: 36 }}
                />
              </Badge>
            ) : (
              <Avatar
                alt="User"
                src={post?.author?.profilePicture}
                sx={{ width: 36, height: 36 }}
              />
            )}
          </Link>

          <div className="min-w-0">
            <h4
              onClick={() => navigate(`/profile/${post.author._id}`)}
              className="font-medium text-sm text-gray-800 cursor-pointer hover:text-orange-500 transition-colors truncate"
            >
              {post.author.username}
            </h4>
            {renderDistance()}
          </div>
        </div>
        <div>
          <button
            onClick={handleMenuOpen}
            className="text-gray-500 hover:text-gray-700 transition text-xl"
          >
            ⋮
          </button>
          <Menu
            anchorEl={menuAnchor}
            open={Boolean(menuAnchor)}
            onClose={handleMenuClose}
          >
            <MenuItem onClick={handleShare}>Share</MenuItem>
            <MenuItem onClick={handleAddToFavorites}>
              {bookmarked ? "Remove from Favorites" : "Add to Favorites"}
            </MenuItem>
            {user?._id === post.author._id && (
              <MenuItem onClick={handleDeletePost}>Delete</MenuItem>
            )}
          </Menu>
        </div>
      </div>

      <div 
        className="w-full h-64 sm:h-72 md:h-80 lg:h-96 bg-gray-100 flex items-center justify-center overflow-hidden cursor-pointer"
        onClick={handleViewPostDetail}
      >
        {post.mediaType === "video" ? (
          <video
            src={post.video}
            controls
            autoPlay
            loop
            className="w-full h-full object-cover"
          />
        ) : (
          <img
            src={post.image}
            alt="Post"
            className="w-full h-full object-cover"
          />
        )}
      </div>

      <div className="p-4">
        <p 
          className="text-gray-800 mb-3 text-sm sm:text-base cursor-pointer hover:text-orange-500"
          onClick={handleViewPostDetail}
        >
          {post.caption}
        </p>

        <div className="flex items-center justify-between mb-3">
          <p className="text-yellow-500 font-bold">
            {"⭐".repeat(post.ratings)}
          </p>

          {isItemInCart(post._id) ? (
            <div className="flex items-center gap-2 bg-gray-50 px-2 py-1 rounded-lg">
              <button
                onClick={() => decreaseItem(post._id)}
                className="bg-red-100 hover:bg-red-200 w-7 h-7 flex items-center justify-center rounded-md text-lg transition-colors"
                disabled={cartLoading}
              >
                -
              </button>
              <span className="text-sm font-medium w-5 text-center">
                {getItemQuantity(post._id)}
              </span>
              <button
                onClick={() => increaseItem(post._id)}
                className="bg-green-100 hover:bg-green-200 w-7 h-7 flex items-center justify-center rounded-md text-lg transition-colors"
                disabled={cartLoading}
              >
                +
              </button>
            </div>
          ) : (
            <button
              onClick={addToCartHandler}
              className="px-3 py-1.5 text-sm bg-orange-50 text-orange-500 font-medium rounded-md hover:bg-orange-100 transition-colors"
              disabled={cartLoading}
            >
              Add ₹{parseFloat(post.price || 0).toFixed(2)}
            </button>
          )}
        </div>

        <div className="flex items-center gap-6 text-gray-600 text-xl">
          <button onClick={handleLike} className="transition cursor-pointer">
            {liked ? <FcLike className="text-2xl" /> : <FiHeart />}
          </button>

          <button
            onClick={() => {
              dispatch(setSelectedPost(post));
              setCommentDialogOpen(true);
            }}
            className="hover:text-blue-500 transition cursor-pointer"
          >
            <FiMessageCircle />
          </button>

          <button 
            onClick={handleShare}
            className="hover:text-green-500 transition cursor-pointer"
          >
            <FiShare />
          </button>
          
          <button 
            onClick={handleBookmark} 
            className={`transition cursor-pointer ${bookmarked ? "text-blue-500" : ""}`}
          >
            <FiBookmark />
          </button>
        </div>

        <div className="flex items-center gap-4 my-2 text-sm">
          <span className="font-medium">{likeCount} likes</span>
          <span className="font-medium">{shareCount} shares</span>
        </div>

        {comments.length > 0 && (
          <span
            onClick={() => {
              dispatch(setSelectedPost(post));
              setCommentDialogOpen(true);
            }}
            className="hover:text-blue-300 cursor-pointer"
          >
            View all {comments.length} comments
          </span>
        )}

        <CommentDialog
          open={commentDialogOpen}
          setOpen={setCommentDialogOpen}
          post={post}
        />
        
        <ShareDialog
          open={shareDialogOpen}
          onClose={() => setShareDialogOpen(false)}
          post={post}
          onShareSuccess={handleShareSuccess}
        />

        <div className="flex item-center justify-between mt-2">
          <input
            type="text"
            placeholder="Add a comment..."
            className="outline-none text-sm w-full"
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
          />
          {commentText.trim() && (
            <span
              onClick={handleComment}
              className="text-[#3BADF8] cursor-pointer"
            >
              Post
            </span>
          )}
        </div>

        {/* Rating section */}
        {renderRating()}
      </div>

      {/* Dialogs */}
      <CommentDialog
        open={commentDialogOpen}
        setOpen={setCommentDialogOpen}
        post={post}
        comments={comments}
        setComments={setComments}
      />
      <ShareDialog
        open={shareDialogOpen}
        handleClose={() => setShareDialogOpen(false)}
        post={post}
        onShareSuccess={handleShareSuccess}
      />
      <RatingDialog
        open={ratingDialogOpen}
        onClose={() => setRatingDialogOpen(false)}
        postId={post._id}
        existingRating={postRating.userRating}
        onRatingSubmitted={handleRatingSubmitted}
      />
      <Dialog
        open={ratingDetailsOpen}
        onClose={() => setRatingDetailsOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Ratings & Reviews</DialogTitle>
        <DialogContent dividers>
          <RatingSummary 
            postId={post._id} 
            initialRating={postRating}
            onClose={() => setRatingDetailsOpen(false)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRatingDetailsOpen(false)}>Close</Button>
          <Button 
            color="primary" 
            variant="contained"
            onClick={() => {
              setRatingDetailsOpen(false);
              setRatingDialogOpen(true);
            }}
          >
            {postRating.userRating ? "Update Your Rating" : "Add Your Rating"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Location Map Dialog */}
      <Dialog
        open={showMap}
        onClose={() => setShowMap(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Delivery Distance Map
          {locationAccuracy && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
              Location accuracy: ±{Math.round(locationAccuracy)} meters
            </Typography>
          )}
        </DialogTitle>
        <DialogContent>
          {distanceDetails && distanceDetails.points.origin && distanceDetails.points.destination && (
            <Box sx={{ height: 400, width: '100%' }}>
              <GoogleMapEmbed
                lat1={distanceDetails.points.origin[0]}
                lon1={distanceDetails.points.origin[1]}
                lat2={distanceDetails.points.destination[0]}
                lon2={distanceDetails.points.destination[1]}
                height={400}
              />
            </Box>
          )}
          
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle1" gutterBottom>Distance Details</Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={6} md={3}>
                <Typography variant="body2" component="div">
                  <strong>Distance:</strong> {distanceDetails?.kilometers.toFixed(2)} km ({distanceDetails?.miles.toFixed(2)} miles)
                </Typography>
              </Grid>
              
              <Grid item xs={6} md={3}>
                <Typography variant="body2" component="div">
                  <strong>Direction:</strong> {distanceDetails?.direction} ({Math.round(distanceDetails?.bearing)}°)
                </Typography>
              </Grid>
              
              <Grid item xs={6} md={3}>
                <Typography variant="body2" component="div">
                  <strong>Est. driving time:</strong> {Math.ceil(distanceDetails?.estimates.drivingTime)} mins
                </Typography>
              </Grid>
              
              <Grid item xs={6} md={3}>
                <Typography variant="body2" component="div">
                  <strong>Est. walking time:</strong> {Math.ceil(distanceDetails?.estimates.walkingTime)} mins
                </Typography>
              </Grid>
            </Grid>
            
            {addressInfo?.user && addressInfo?.vendor && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle1" gutterBottom>Address Information</Typography>
                
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" component="div" sx={{ mb: 1 }}>
                      <strong>Your location:</strong>
                    </Typography>
                    <Typography variant="body2" component="div">
                      {addressInfo.user.road}, {addressInfo.user.city}, {addressInfo.user.state}
                    </Typography>
                    {addressInfo.user.postalCode && (
                      <Typography variant="body2" component="div">
                        Postal code: {addressInfo.user.postalCode}
                      </Typography>
                    )}
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" component="div" sx={{ mb: 1 }}>
                      <strong>Vendor location:</strong>
                    </Typography>
                    <Typography variant="body2" component="div">
                      {addressInfo.vendor.road}, {addressInfo.vendor.city}, {addressInfo.vendor.state}
                    </Typography>
                    {addressInfo.vendor.postalCode && (
                      <Typography variant="body2" component="div">
                        Postal code: {addressInfo.vendor.postalCode}
                      </Typography>
                    )}
                  </Grid>
                </Grid>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowMap(false)}>Close</Button>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={updateUserLocation}
          >
            Update My Location
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default PostCard;
