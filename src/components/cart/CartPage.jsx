import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Box,
  Typography,
  Button,
  Divider,
  TextField,
  RadioGroup,
  Radio,
  FormControlLabel,
  FormControl,
  FormLabel,
  Stepper,
  Step,
  StepLabel,
  Card,
  CardContent,
  CardMedia,
  IconButton,
  Alert,
  Snackbar,
  Grid,
  CircularProgress,
  Tabs,
  Tab,
  Chip,
  Badge,
} from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import { 
  decreaseQuantity, 
  increaseQuantity, 
  removeFromCart,
  saveForLater,
  moveToCart,
  removeSavedItem,
  updateDeliveryAddress,
  updateDeliveryMethod,
  updatePaymentMethod,
  updateDeliveryInstructions,
  updateContactNumber,
  applyPromoCode,
  removePromoCode,
  clearCart,
  placeOrder,
  resetOrderStatus,
  resetOrderStatusAction,
  fetchOrders,
  syncOrderStatus,
  setDeliveryPoint
} from "../../redux/cartSlice";
import { Delete, Favorite, ShoppingCart, LocalShipping, Payment, Refresh, Check, History, AccessTime, KeyboardArrowRight } from "@mui/icons-material";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import SolanaPayment from "../wallet/SolanaPayment";
import { resetPaymentStatus } from "../../redux/walletSlice";
import store from "../../redux/store";
import { updateOrderStatus } from "../../services/orderService";
import axios from "axios";
import { fetchConfirmedOrders, addOrderToConfirmed } from "../../redux/confirmedOrdersSlice";

const CartPage = () => {
  const { 
    cartItems = [], 
    savedItems = [], 
    checkout = {
      deliveryAddress: "",
      deliveryMethod: "standard",
      paymentMethod: "cash",
      deliveryInstructions: "",
      contactNumber: "",
      appliedPromoCode: null,
      discount: 0,
      deliveryFee: 0,
      deliveryPoint: null
    },
    orderStatus = "idle",
    orderError = null,
    stockErrors = {},
    orders = []
  } = useSelector((store) => store.cart || {});
  const { user } = useSelector((store) => store.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Local state for UI
  const [activeTab, setActiveTab] = useState(0);
  const [activeStep, setActiveStep] = useState(0);
  

  const [promoCode, setPromoCode] = useState("");
  const [promoError, setPromoError] = useState("");
  const [promoSuccess, setPromoSuccess] = useState(false);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Calculate totals
  const subtotal = cartItems.reduce((total, item) => {
    return total + item.quantity * item.price;
  }, 0);

  const taxRate = 0.07;
  const tax = subtotal * taxRate;
  const deliveryFee = checkout?.deliveryFee || 0;
  const discount = checkout?.discount || 0;
  const total = subtotal + tax + deliveryFee - discount;

  // Steps for checkout
  const steps = ['Cart', 'Delivery', 'Payment', 'Review'];

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  // Navigate to next step
  const handleNext = () => {
    // Reset any previous order errors
    if (orderStatus === 'failed') {
      dispatch(resetOrderStatusAction());
    }
    
    // Validate current step
    if (activeStep === 0 && cartItems.length === 0) {
      toast.error("Your cart is empty");
      return;
    }

    if (activeStep === 1) {
      if (!checkout.deliveryAddress) {
        toast.error("Please enter a delivery address");
        return;
      }
      if (!checkout.contactNumber) {
        toast.error("Please enter a contact number");
        return;
      }
    }

    setActiveStep((prevStep) => prevStep + 1);
  };

  // Navigate to previous step
  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  // Apply promo code
  const handleApplyPromoCode = () => {
    if (!promoCode) {
      setPromoError("Please enter a promo code");
      return;
    }

    // Mock promo codes
    const promoCodes = {
      "WELCOME10": { discount: subtotal * 0.1, maxDiscount: 100 },
      "FREEDEL": { discount: deliveryFee, maxDiscount: deliveryFee },
      "SPECIAL20": { discount: subtotal * 0.2, maxDiscount: 200 }
    };

    if (promoCodes[promoCode]) {
      const { discount, maxDiscount } = promoCodes[promoCode];
      const finalDiscount = Math.min(discount, maxDiscount);
      
      dispatch(applyPromoCode({ code: promoCode, discount: finalDiscount }));
      setPromoSuccess(true);
      setPromoError("");
    } else {
      setPromoError("Invalid promo code");
      setPromoSuccess(false);
    }
  };

  // Remove promo code
  const handleRemovePromoCode = () => {
    dispatch(removePromoCode());
    setPromoCode("");
    setPromoSuccess(false);
  };

  // Validate geographic coordinates
  const validateCoordinates = (coords) => {
    if (!coords || !Array.isArray(coords) || coords.length !== 2) return false;
    const [longitude, latitude] = coords;
    
    // Check if coordinates are valid numbers within range
    return !isNaN(longitude) && !isNaN(latitude) && 
           longitude >= -180 && longitude <= 180 && 
           latitude >= -90 && latitude <= 90;
  };
  
  // Convert address to coordinates using Nominatim (OpenStreetMap)
  const geocodeAddress = async (address) => {
    try {
      // Format address for URL
      const formattedAddress = encodeURIComponent(address);
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${formattedAddress}&limit=1`);
      const data = await response.json();
      
      if (data && data.length > 0) {
        // Nominatim returns [lat, lon] but we need [lon, lat] for GeoJSON
        return [parseFloat(data[0].lon), parseFloat(data[0].lat)];
      }
      return null;
    } catch (error) {
      console.error('Geocoding error:', error);
      return null;
    }
  };
  
  // Get user's current location and store in Redux
  const getUserLocationForDelivery = () => {
    return new Promise((resolve) => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            // Format as [longitude, latitude] for GeoJSON
            const coordinates = [position.coords.longitude, position.coords.latitude];
            console.log("Got user location for delivery:", coordinates);
            
            // Store in Redux
            dispatch(setDeliveryPoint(coordinates));
            resolve(coordinates);
          },
          (error) => {
            console.warn("Geolocation error:", error);
            resolve(null);
          },
          { timeout: 5000, maximumAge: 60000 }
        );
      } else {
        console.warn("Geolocation not supported by this browser");
        resolve(null);
      }
    });
  };

  // Handle place order
  const handlePlaceOrder = async () => {
    // Check if user is logged in
    if (!user || !user._id) {
      toast.error("You need to be logged in to place an order");
      dispatch({ type: 'cart/placeOrder/rejected', payload: { message: "Authentication required" } });
      return;
    }
    
    // If payment method is Solana, verify wallet payment status
    if (checkout.paymentMethod === 'solana') {
      const walletState = store.getState().wallet;
      if (walletState.paymentStatus !== 'success') {
        toast.error("Please complete Solana payment before placing order");
        dispatch({ type: 'cart/placeOrder/rejected', payload: { message: "Solana payment required" } });
        return;
      }
    }
    
    // Set loading state manually
    dispatch({ type: 'cart/placeOrder/pending' });
    
    if (cartItems.length === 0) {
      toast.error("Your cart is empty");
      dispatch({ type: 'cart/placeOrder/rejected', payload: { message: "Cart is empty" } });
      return;
    }

    // Additional validation
    if (!checkout.deliveryAddress) {
      toast.error("Please enter a delivery address");
      setActiveStep(1); // Go back to delivery step
      dispatch({ type: 'cart/placeOrder/rejected', payload: { message: "Missing delivery address" } });
      return;
    }

    if (!checkout.contactNumber) {
      toast.error("Please enter a contact number");
      setActiveStep(1); // Go back to delivery step
      dispatch({ type: 'cart/placeOrder/rejected', payload: { message: "Missing contact number" } });
      return;
    }
    
    // Show loading state during processing
    toast.info("Getting your location for delivery...");
    dispatch({ type: 'cart/placeOrder/pending' });
    
    // Get and store the user's current location for delivery
    await getUserLocationForDelivery();
    
    try {
      // Get pickup and delivery points from Redux
      const { pickupPoint, deliveryPoint } = store.getState().cart;
      console.log("Redux state - pickup point:", pickupPoint, "delivery point:", deliveryPoint);
      
      // For debugging - log cart items structure
      console.log("Cart items for debugging:", JSON.stringify(cartItems.slice(0, 1)));
      
      // PICKUP COORDINATES: First try to get from Redux, then from the cart item
      let pickupCoordinates = pickupPoint;
      
      // If no pickup point in Redux, try to get from the first item's seller
      if (!validateCoordinates(pickupCoordinates) && cartItems.length > 0) {
        // Try to extract seller coordinates from item
        if (cartItems[0].sellerLocation?.coordinates) {
          pickupCoordinates = cartItems[0].sellerLocation.coordinates;
          console.log("Using seller coordinates from item:", pickupCoordinates);
        } else if (cartItems[0].location?.coordinates) {
          pickupCoordinates = cartItems[0].location.coordinates;
          console.log("Using item location coordinates:", pickupCoordinates);
        } else if (cartItems[0].sellerId && cartItems[0].sellerCoordinates) {
          pickupCoordinates = cartItems[0].sellerCoordinates;
          console.log("Using seller coordinates from item property:", pickupCoordinates);
        }
      }
      
      // If still no valid pickup point, get from food author's location or geocode
      if (!validateCoordinates(pickupCoordinates) && cartItems.length > 0) {
        if (cartItems[0].author && typeof cartItems[0].author === 'string') {
          try {
            // Try to fetch the author's location
            console.log("Fetching location for author ID:", cartItems[0].author);
            const response = await fetch(`/api/v1/users/${cartItems[0].author}/location`);
            if (response.ok) {
              const data = await response.json();
              if (data.location?.coordinates) {
                pickupCoordinates = data.location.coordinates;
                console.log("Got author coordinates from API:", pickupCoordinates);
              }
            }
          } catch (error) {
            console.error("Error fetching author location:", error);
          }
        }
      }
      
      // If we still don't have pickup coordinates, try geocoding
      if (!validateCoordinates(pickupCoordinates)) {
        // Try to get a location to geocode
        let locationToGeocode = null;
        
        if (cartItems[0]?.sellerAddress) {
          locationToGeocode = cartItems[0].sellerAddress;
        } else if (cartItems[0]?.address) {
          locationToGeocode = cartItems[0].address;
        } else if (cartItems[0]?.city) {
          locationToGeocode = cartItems[0].city;
        }
        
        if (locationToGeocode) {
          console.log("Geocoding location:", locationToGeocode);
          pickupCoordinates = await geocodeAddress(locationToGeocode);
        }
      }
      
      // GUARANTEED FALLBACK: If all else fails, use hardcoded coordinates or offset from delivery
      if (!validateCoordinates(pickupCoordinates)) {
        if (validateCoordinates(deliveryPoint)) {
          // Create pickup point as offset from delivery point
          const [deliveryLong, deliveryLat] = deliveryPoint;
          pickupCoordinates = [deliveryLong - 0.015, deliveryLat - 0.01];
          console.log("Created pickup coordinates as offset from delivery point:", pickupCoordinates);
        } else {
          // Use Mumbai coordinates as absolute fallback
          pickupCoordinates = [72.8777, 19.0760];
          console.log("Using Mumbai fallback coordinates for pickup:", pickupCoordinates);
        }
      }
      
      // DELIVERY COORDINATES: Use from Redux (set earlier by getUserLocationForDelivery)
      let deliveryCoordinates = deliveryPoint;
      
      // If no delivery point in Redux, try to get from browser geolocation again
      if (!validateCoordinates(deliveryCoordinates)) {
        console.log("No delivery coordinates in Redux, trying browser geolocation");
        
        // Try to get current position
        deliveryCoordinates = await new Promise((resolve) => {
          if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
              (position) => {
                const coords = [position.coords.longitude, position.coords.latitude];
                console.log("Got browser geolocation:", coords);
                resolve(coords);
              },
              (error) => {
                console.warn("Geolocation error:", error);
                resolve(null);
              },
              { timeout: 5000, maximumAge: 60000 }
            );
          } else {
            console.warn("Geolocation not supported");
            resolve(null);
          }
        });
      }
      
      // If still no delivery coordinates, try geocoding the delivery address
      if (!validateCoordinates(deliveryCoordinates) && checkout.deliveryAddress) {
        console.log("Geocoding delivery address:", checkout.deliveryAddress);
        deliveryCoordinates = await geocodeAddress(checkout.deliveryAddress);
      }
      
      // GUARANTEED FALLBACK: If all else fails, create delivery coordinates
      if (!validateCoordinates(deliveryCoordinates)) {
        if (validateCoordinates(pickupCoordinates)) {
          // Create delivery point as offset from pickup
          const [pickupLong, pickupLat] = pickupCoordinates;
          deliveryCoordinates = [pickupLong + 0.02, pickupLat + 0.01];
          console.log("Created delivery coordinates as offset from pickup:", deliveryCoordinates);
        } else {
          // Use Mumbai with offset as absolute fallback
          deliveryCoordinates = [72.8677, 19.0860];
          console.log("Using Mumbai fallback coordinates for delivery:", deliveryCoordinates);
        }
      }
      
      // Format coordinates properly and ensure they are numbers
      if (pickupCoordinates) {
        pickupCoordinates = pickupCoordinates.map(coord => parseFloat(coord));
      }
      
      if (deliveryCoordinates) {
        deliveryCoordinates = deliveryCoordinates.map(coord => parseFloat(coord));
      }
      
      // Store the final coordinates in variables accessible outside the try-catch block
      let finalPickupCoordinates = pickupCoordinates;
      let finalDeliveryCoordinates = deliveryCoordinates;
      
      // Store final coordinates in Redux for future reference
      if (validateCoordinates(pickupCoordinates)) {
        dispatch({ type: 'cart/setPickupPoint', payload: pickupCoordinates });
      }
      
      if (validateCoordinates(deliveryCoordinates)) {
        dispatch({ type: 'cart/setDeliveryPoint', payload: deliveryCoordinates });
      }
    } catch (error) {
      console.error("Error processing location data:", error);
      toast.error("Error processing location data. Using fallback locations.");
      
      // Set fallback coordinates if there was an error
      const finalPickupCoordinates = [72.8777, 19.0760]; // Mumbai
      const finalDeliveryCoordinates = [72.8677, 19.0860]; // Mumbai with offset
    }
    
    // Get the coordinates from Redux store as a final safety measure
    // This ensures we always have the most up-to-date values
    const { pickupPoint, deliveryPoint } = store.getState().cart;
    
    // Create the order data object with proper coordinates
    const orderData = {
      items: cartItems.map(item => ({
        productId: item._id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        sellerId: item.sellerId || item.userId || null,
        sellerName: item.sellerName || item.userName || null
      })),
      deliveryAddress: checkout.deliveryAddress,
      deliveryMethod: checkout.deliveryMethod,
      paymentMethod: checkout.paymentMethod,
      deliveryInstructions: checkout.deliveryInstructions,
      contactNumber: checkout.contactNumber,
      subtotal,
      tax,
      deliveryFee,
      discount,
      total,
      promoCodeApplied: checkout.appliedPromoCode,
      // Include coordinates in the proper format for MongoDB
      pickupLocation: {
        type: "Point",
        coordinates: pickupPoint || [72.8777, 19.0760] // Use Redux value or fallback
      },
      deliveryLocation: {
        type: "Point",
        coordinates: deliveryPoint || [72.8677, 19.0860] // Use Redux value or fallback
      },
      // Set initial status to confirmed to make sure it shows in delivery section
      status: 'confirmed'
    };
    
    // Log the final order data being sent
    console.log("Final order data:", orderData);

    console.log("Placing order with data:", orderData);

    try {
      dispatch(placeOrder(orderData))
        .unwrap()
        .then((response) => {
          console.log("Order placed successfully:", response);
          toast.success("Order placed successfully!");
          
          // Show success step
          setActiveStep(4);
          
          // Store the orderId for navigation after showing success
          if (response.order && response.order._id) {
            localStorage.setItem('lastOrderId', response.order._id);
            
            // Update order status to confirmed
            updateOrderStatusToConfirmed(response.order._id)
              .then(() => {
                console.log('Order confirmed in the system successfully');
                
                // Directly add this order to the confirmed orders in Redux
                // This ensures immediate availability in the delivery dashboard
                dispatch(addOrderToConfirmed(response.order._id))
                  .unwrap()
                  .then(result => {
                    console.log('Successfully added order to confirmed orders:', result);
                    // Also force a refresh to ensure we have all confirmed orders
                    dispatch(fetchConfirmedOrders());
                  })
                  .catch(err => {
                    console.error('Failed to add order to confirmed orders, falling back to refresh:', err);
                    // If direct addition fails, fall back to just refreshing the list
                    dispatch(fetchConfirmedOrders());
                  });
              })
              .catch(err => {
                console.error('Error confirming order:', err);
                // Even if status update fails, try to add to confirmed orders
                dispatch(addOrderToConfirmed(response.order._id));
              });
            
            // Also update the Redux state directly to ensure immediate UI updates
            dispatch(syncOrderStatus({
              orderId: response.order._id,
              status: 'confirmed'
            }));
            
            // Clear the cart after successful order placement
            setTimeout(() => {
              dispatch(clearCart());
            }, 1000);
            
            // Dispatch multiple refreshes of confirmed orders to ensure they appear
            // First immediate refresh
            dispatch(fetchConfirmedOrders());
            
            // Then staggered refreshes to ensure backend has processed the order
            setTimeout(() => dispatch(fetchConfirmedOrders()), 3000);
            setTimeout(() => dispatch(fetchConfirmedOrders()), 6000);
          }
          
          // Refresh orders list to ensure the new order appears in the history
          setTimeout(() => {
            dispatch(fetchOrders());
            
            // Also refresh confirmed orders in the delivery system
            dispatch(fetchConfirmedOrders());
            
            // Update localStorage to trigger refresh in other open tabs
            localStorage.setItem('confirmedOrdersUpdated', Date.now().toString());
            
            // Trigger a custom event for real-time update
            window.dispatchEvent(new CustomEvent('new-confirmed-order', { 
              detail: { orderId: response.order?._id }
            }));
          }, 2000);
          
          // Set up polling for real-time updates - fetch confirmed orders every 10 seconds
          const pollingInterval = setInterval(() => {
            if (document.visibilityState === 'visible') {
              dispatch(fetchConfirmedOrders());
            }
          }, 10000);
          
          // Clear the interval after 2 minutes (12 polls) or when the page is unloaded
          setTimeout(() => {
            clearInterval(pollingInterval);
          }, 120000);
          
          // Also clear on page unload
          window.addEventListener('beforeunload', () => {
            clearInterval(pollingInterval);
          });
          
          // Store the polling interval ID in localStorage to potentially clear it on page reloads
          localStorage.setItem('confirmedOrdersPollingId', Date.now().toString());
        })
        .catch((error) => {
          console.error("Order placement error:", error);
          toast.error(error?.message || "Failed to place order");
          
          // Reset order status to idle
          dispatch({ type: 'cart/placeOrder/rejected', payload: error || { message: "Unknown error" } });
          
          // If there's an authentication error, we could redirect to login
          if (error?.message?.toLowerCase().includes('logged in')) {
            // Could redirect to login page
            toast.error("Please log in to place an order");
          }
        });
    } catch (err) {
      console.error("Exception in order placement:", err);
      toast.error("An unexpected error occurred");
      dispatch({ type: 'cart/placeOrder/rejected', payload: { message: err.message || "Exception occurred" } });
    }
  };

  // Handle increase quantity
  const handleIncreaseQuantity = (item) => {
    try {
      console.log("Increasing quantity for item:", item._id);
      dispatch(increaseQuantity({ _id: item._id, maxStock: 100 }));
    } catch (error) {
      console.error("Error increasing quantity:", error);
      toast.error("Failed to update quantity. Please try again.");
    }
  };

  // Handle decrease quantity
  const handleDecreaseQuantity = (item) => {
    try {
      console.log("Decreasing quantity for item:", item._id);
      dispatch(decreaseQuantity({ _id: item._id }));
    } catch (error) {
      console.error("Error decreasing quantity:", error);
      toast.error("Failed to update quantity. Please try again.");
    }
  };

  // Handle remove from cart
  const handleRemoveFromCart = (item) => {
    try {
      dispatch(removeFromCart(item));
      toast.info("Item removed from cart");
    } catch (error) {
      console.error("Error removing item from cart:", error);
      toast.error("Failed to remove item. Please try again.");
    }
  };

  // Handle save for later
  const handleSaveForLater = (item) => {
    try {
      dispatch(saveForLater(item));
      toast.info("Item saved for later");
    } catch (error) {
      console.error("Error saving item for later:", error);
      toast.error("Failed to save item for later. Please try again.");
    }
  };

  // Render cart items
  const renderCartItems = () => (
    <TableContainer component={Paper} sx={{ overflowX: "auto", mb: 3 }}>
      <Table sx={{ minWidth: 600 }} aria-label="cart table">
        <TableHead>
          <TableRow>
            <TableCell>Item</TableCell>
            <TableCell align="right">Quantity</TableCell>
            <TableCell align="right">Unit Price</TableCell>
            <TableCell align="right">Total</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {cartItems && cartItems.length > 0 ? (
            cartItems.map((item) => (
              <TableRow key={item._id}>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    {item.image && (
                      <CardMedia
                        component="img"
                        sx={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 1, mr: 2 }}
                        image={item.image}
                        alt={item.name}
                      />
                    )}
                    <Typography variant="body1">{item.name}</Typography>
                  </Box>
                </TableCell>
                <TableCell align="right">
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                    <Button
                      onClick={() => handleDecreaseQuantity(item)}
                      variant="outlined"
                      color="error"
                      size="small"
                      sx={{ minWidth: 30, width: 30, height: 30, p: 0 }}
                    >
                      -
                    </Button>
                    <Typography sx={{ mx: 1 }}>{item.quantity}</Typography>
                    <Button
                      onClick={() => handleIncreaseQuantity(item)}
                      variant="outlined"
                      color="success"
                      size="small"
                      sx={{ minWidth: 30, width: 30, height: 30, p: 0 }}
                    >
                      +
                    </Button>
                  </Box>
                  {stockErrors && stockErrors[item._id] && (
                    <Typography color="error" variant="caption" sx={{ display: 'block', textAlign: 'center', mt: 1 }}>
                      {stockErrors[item._id]}
                    </Typography>
                  )}
                </TableCell>
                <TableCell align="right">₹{item.price}</TableCell>
                <TableCell align="right">₹{(item.quantity * item.price).toFixed(2)}</TableCell>
                <TableCell align="right">
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <IconButton 
                      color="primary" 
                      size="small" 
                      onClick={() => handleSaveForLater(item)}
                      title="Save for later"
                    >
                      <Favorite fontSize="small" />
                    </IconButton>
                    <IconButton 
                      color="error" 
                      size="small" 
                      onClick={() => handleRemoveFromCart(item)}
                      title="Remove from cart"
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                  </Box>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={5} align="center">
                <Box sx={{ py: 3, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <ShoppingCart sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    Your cart is empty
                  </Typography>
                  <Button 
                    variant="contained" 
                    color="primary" 
                    onClick={() => navigate('/')}
                    sx={{ mt: 1 }}
                  >
                    Continue Shopping
                  </Button>
                </Box>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );

  // Render saved items
  const renderSavedItems = () => (
    <Box sx={{ mt: 4 }}>
      <Typography variant="h6" gutterBottom>
        Saved For Later ({savedItems.length})
      </Typography>
      
      {savedItems.length > 0 ? (
        <Grid container spacing={2}>
          {savedItems.map(item => (
            <Grid item xs={12} sm={6} md={4} key={item._id}>
              <Card sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                {item.image && (
                  <CardMedia
                    component="img"
                    height="140"
                    image={item.image}
                    alt={item.name}
                  />
                )}
                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography variant="h6" component="div" gutterBottom>
                    {item.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    ₹{item.price}
                  </Typography>
                  <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between' }}>
                    <Button 
                      size="small" 
                      variant="outlined" 
                      startIcon={<ShoppingCart />}
                      onClick={() => dispatch(moveToCart(item))}
                    >
                      Move to Cart
                    </Button>
                    <IconButton 
                      color="error" 
                      size="small" 
                      onClick={() => dispatch(removeSavedItem(item))}
                    >
                      <Delete />
                    </IconButton>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary">
            No items saved for later
          </Typography>
        </Paper>
      )}
    </Box>
  );

  // Render delivery form
  const renderDeliveryForm = () => (
    <Box sx={{ mt: 2 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Delivery Information
        </Typography>
        
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Delivery Address"
              variant="outlined"
              value={checkout.deliveryAddress}
              onChange={(e) => dispatch(updateDeliveryAddress(e.target.value))}
              required
            />
          </Grid>
          
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Contact Number"
              variant="outlined"
              value={checkout.contactNumber}
              onChange={(e) => dispatch(updateContactNumber(e.target.value))}
              required
            />
          </Grid>
          
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Delivery Instructions (optional)"
              variant="outlined"
              multiline
              rows={3}
              value={checkout.deliveryInstructions}
              onChange={(e) => dispatch(updateDeliveryInstructions(e.target.value))}
              placeholder="E.g., Leave at the door, Call when arriving, etc."
            />
          </Grid>
          
          <Grid item xs={12}>
            <FormControl component="fieldset">
              <FormLabel component="legend">Delivery Method</FormLabel>
              <RadioGroup
                value={checkout.deliveryMethod}
                onChange={(e) => dispatch(updateDeliveryMethod(e.target.value))}
              >
                <FormControlLabel 
                  value="standard" 
                  control={<Radio />} 
                  label={
                    <Box>
                      <Typography variant="body1">Standard Delivery (₹49)</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Estimated delivery: 45-60 minutes
                      </Typography>
                    </Box>
                  } 
                />
                <FormControlLabel 
                  value="express" 
                  control={<Radio />} 
                  label={
                    <Box>
                      <Typography variant="body1">Express Delivery (₹99)</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Estimated delivery: 25-30 minutes
                      </Typography>
                    </Box>
                  } 
                />
                <FormControlLabel 
                  value="pickup" 
                  control={<Radio />} 
                  label={
                    <Box>
                      <Typography variant="body1">Pickup (Free)</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Ready for pickup in 15-20 minutes
                      </Typography>
                    </Box>
                  } 
                />
              </RadioGroup>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );

  // Render payment form
  const renderPaymentForm = () => (
    <Box sx={{ mt: 2 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Payment Method
        </Typography>
        
        <FormControl component="fieldset">
          <RadioGroup
            value={checkout.paymentMethod}
            onChange={(e) => {
              dispatch(updatePaymentMethod(e.target.value));
              // Reset payment status when changing payment method
              if (e.target.value !== 'solana') {
                dispatch(resetPaymentStatus());
              }
            }}
          >
            <FormControlLabel 
              value="cash" 
              control={<Radio />} 
              label="Cash on Delivery" 
            />
            <FormControlLabel 
              value="card" 
              control={<Radio />} 
              label="Credit/Debit Card" 
            />
            <FormControlLabel 
              value="wallet" 
              control={<Radio />} 
              label="Digital Wallet" 
            />
            <FormControlLabel 
              value="solana" 
              control={<Radio />} 
              label="Solana Wallet" 
            />
          </RadioGroup>
        </FormControl>

        {checkout.paymentMethod === 'card' && (
          <Alert severity="info" sx={{ mt: 2 }}>
            Card payment will be collected at the time of delivery for your security.
          </Alert>
        )}
        
        {checkout.paymentMethod === 'solana' && (
          <Box sx={{ mt: 3 }}>
            <SolanaPayment
             
              amount={ Number(total/(170*85))} 
              onSuccess={(txId) => {
                toast.success("Payment successful!");
              }}
              onError={(error) => {
                toast.error(error || "Payment failed");
              }}
            />
          </Box>
        )}
      </Paper>
    </Box>
  );

  // Render order summary
  const renderOrderSummary = () => (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Order Summary
      </Typography>
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="body1">Subtotal</Typography>
        <Typography variant="body1">₹{subtotal.toFixed(2)}</Typography>
      </Box>
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="body1">Tax (7%)</Typography>
        <Typography variant="body1">₹{tax.toFixed(2)}</Typography>
      </Box>
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="body1">Delivery Fee</Typography>
        <Typography variant="body1">₹{deliveryFee.toFixed(2)}</Typography>
      </Box>
      
      {discount > 0 && (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="body1" color="success.main">
            Discount ({checkout.appliedPromoCode})
          </Typography>
          <Typography variant="body1" color="success.main">
            -₹{discount.toFixed(2)}
          </Typography>
        </Box>
      )}
      
      <Divider sx={{ my: 2 }} />
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="h6">Total</Typography>
        <Typography variant="h6">₹{total.toFixed(2)}</Typography>
      </Box>
      
      {/* Promo Code Section */}
      {activeStep >= 2 && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            Have a promo code?
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 1 }}>
            <TextField
              size="small"
              label="Promo Code"
              variant="outlined"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value)}
              disabled={checkout.appliedPromoCode !== null}
              error={!!promoError}
              helperText={promoError}
              sx={{ mr: 1, flexGrow: 1 }}
            />
            
            {checkout.appliedPromoCode ? (
              <Button
                variant="outlined"
                color="error"
                onClick={handleRemovePromoCode}
                startIcon={<Refresh />}
              >
                Remove
              </Button>
            ) : (
              <Button
                variant="contained"
                onClick={handleApplyPromoCode}
                disabled={!promoCode}
              >
                Apply
              </Button>
            )}
          </Box>
          
          {promoSuccess && (
            <Alert severity="success" sx={{ mt: 1 }}>
              Promo code applied successfully!
            </Alert>
          )}
        </Box>
      )}
    </Paper>
  );

  // Render order review
  const renderOrderReview = () => (
    <Box sx={{ mt: 2 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Review Your Order
        </Typography>
        
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            Delivery Details
          </Typography>
          <Typography variant="body1">
            <strong>Address:</strong> {checkout.deliveryAddress}
          </Typography>
          <Typography variant="body1">
            <strong>Contact:</strong> {checkout.contactNumber}
          </Typography>
          <Typography variant="body1">
            <strong>Method:</strong> {checkout.deliveryMethod.charAt(0).toUpperCase() + checkout.deliveryMethod.slice(1)} Delivery
          </Typography>
          {checkout.deliveryInstructions && (
            <Typography variant="body1">
              <strong>Instructions:</strong> {checkout.deliveryInstructions}
            </Typography>
          )}
        </Box>
        
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            Payment Method
          </Typography>
          <Typography variant="body1">
            {checkout.paymentMethod === 'cash' ? 'Cash on Delivery' : 
             checkout.paymentMethod === 'card' ? 'Credit/Debit Card' : 'Digital Wallet'}
          </Typography>
        </Box>
        
        <Typography variant="subtitle1" gutterBottom>
          Order Items
        </Typography>
        
        <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Item</TableCell>
                <TableCell align="right">Qty</TableCell>
                <TableCell align="right">Price</TableCell>
                <TableCell align="right">Total</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {cartItems.map((item) => (
                <TableRow key={item._id}>
                  <TableCell>{item.name}</TableCell>
                  <TableCell align="right">{item.quantity}</TableCell>
                  <TableCell align="right">₹{item.price}</TableCell>
                  <TableCell align="right">₹{(item.quantity * item.price).toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );

  // Render success message
  const renderSuccessMessage = () => (
    <Box sx={{ mt: 2, textAlign: 'center' }}>
      <Paper sx={{ p: 4 }}>
        <Check sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
        
        <Typography variant="h5" gutterBottom>
          Order Placed Successfully!
        </Typography>
        
        <Typography variant="body1" paragraph>
          Thank you for your order. Your order has been placed and is being processed.
        </Typography>
        
        <Typography variant="body2" color="text.secondary" paragraph>
          You will receive an email confirmation shortly.
        </Typography>
        
        <Box sx={{ mt: 3 }}>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={() => navigate('/')}
            sx={{ mr: 2 }}
          >
            Continue Shopping
          </Button>
          <Button 
            variant="outlined" 
            onClick={() => {
              const orderId = localStorage.getItem('lastOrderId');
              if (orderId) {
                navigate(`/orders/${orderId}`);
              } else {
                navigate('/orders');
              }
            }}
          >
            View Order Details
          </Button>
        </Box>
      </Paper>
    </Box>
  );

  // For debugging cart data
  const renderDebugInfo = () => {
    if (process.env.NODE_ENV !== 'production') {
      return (
        <Box sx={{ mt: 4, p: 2, border: '1px dashed grey', display: 'none' }}>
          <Typography variant="h6">Debug Cart Data</Typography>
          {cartItems.map(item => (
            <Box key={item._id} sx={{ mb: 1 }}>
              <Typography variant="body2">
                <strong>ID:</strong> {item._id}<br />
                <strong>Name:</strong> {item.name}<br />
                <strong>Quantity:</strong> {item.quantity}<br />
                <strong>Price:</strong> {item.price}<br />
                <strong>Max Stock:</strong> {item.maxStock}<br />
              </Typography>
              <Divider sx={{ my: 1 }} />
            </Box>
          ))}
        </Box>
      );
    }
    return null;
  };

  // Make local component state match global state
  useEffect(() => {
    if (orderStatus === 'loading') {
      setLoadingOrders(true);
    } else {
      setLoadingOrders(false);
    }
  }, [orderStatus]);

  // Set up a timeout to reset order status if it gets stuck when placing an order
  useEffect(() => {
    let orderStatusTimeout;
    
    // Only set up timeout for the order placement loading state (not fetching orders)
    if (orderStatus === 'loading' && activeStep === 3) {
      // If the order is in loading state for more than 15 seconds, reset it
      orderStatusTimeout = setTimeout(() => {
        console.log('Order processing timeout reached, resetting status');
        dispatch(resetOrderStatusAction());
        toast.error('Order processing took too long. Please try again.');
      }, 15000);
    }
    
    return () => {
      if (orderStatusTimeout) {
        clearTimeout(orderStatusTimeout);
      }
    };
  }, [orderStatus, activeStep, dispatch]);

  // Track when the user changes and refresh orders
  useEffect(() => {
    if (user && activeTab === 2) {
      // When user logs in or changes, refresh their orders
      dispatch(fetchOrders())
        .unwrap()
        .then((response) => {
          console.log(`Fetched ${response?.orders?.length || 0} orders for user ${user.username || user._id}`);
        })
        .catch((error) => {
          console.error("Error fetching orders:", error);
        });
    }
  }, [user?._id, activeTab, dispatch]);

  // Fetch orders if switching to Order History tab
  useEffect(() => {
    if (activeTab === 2 && user) {
      dispatch(fetchOrders())
        .unwrap()
        .then((response) => {
          console.log("Orders fetched successfully:", response);
        })
        .catch((error) => {
          console.error("Error fetching orders:", error);
          toast.error(error?.message || "Failed to load order history");
        });
    }
  }, [activeTab, user, dispatch]);

  // Handle refreshing order history
  const handleRefreshOrders = useCallback(() => {
    if (user) {
      dispatch(fetchOrders())
        .unwrap()
        .then((response) => {
          console.log("Orders refreshed successfully:", response);
          toast.success("Order history refreshed");
        })
        .catch((error) => {
          console.error("Error refreshing orders:", error);
          toast.error(error?.message || "Failed to refresh orders");
        });
    }
  }, [user, dispatch]);

  // Handle view order details 
  const handleViewOrderDetails = (orderId) => {
    if (orderId) {
      navigate(`/orders/${orderId}`);
    } else {
      toast.error("Invalid order ID");
    }
  };

  // Add the getStatusColor function from OrderHistory
  const getStatusColor = (status) => {
    switch (status) {
      case 'processing':
        return 'warning';
      case 'confirmed':
        return 'info';
      case 'preparing':
        return 'secondary';
      case 'out_for_delivery':
        return 'primary';
      case 'delivered':
        return 'success';
      case 'cancelled':
        return 'error';
      default:
        return 'default';
    }
  };

  // Format date helper
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Format price to currency
  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(price);
  };

  // Function to update order status to confirmed
  const updateOrderStatusToConfirmed = async (orderId) => {
    try {
      console.log('Automatically updating order status to confirmed:', orderId);
      const response = await updateOrderStatus(orderId, 'confirmed', 'Order confirmed automatically after placement');
      console.log('Order status updated successfully:', response);
      
      // Update the order status in Redux state
      if (response && response.success) {
        // Update order status in cart slice
        dispatch(syncOrderStatus({
          orderId: orderId,
          status: 'confirmed'
        }));
        
        // Update confirmed orders in confirmed orders slice
        dispatch(fetchConfirmedOrders()).unwrap()
          .then(confirmedOrders => {
            console.log('Confirmed orders refreshed successfully:', confirmedOrders);
            
            // Broadcast the update to other components/tabs
            const event = new CustomEvent('order-confirmed', {
              detail: { orderId, status: 'confirmed' }
            });
            window.dispatchEvent(event);
            
            // Also store in localStorage to notify other tabs
            localStorage.setItem('lastConfirmedOrder', JSON.stringify({
              orderId,
              timestamp: Date.now()
            }));
          })
          .catch(err => {
            console.error('Failed to refresh confirmed orders:', err);
            // Try again after a short delay
            setTimeout(() => dispatch(fetchConfirmedOrders()), 2000);
          });
        
        // Refresh all orders to ensure we have the latest data
        dispatch(fetchOrders());
      }
    } catch (error) {
      console.error('Failed to update order status to confirmed:', error);
      // Don't show toast error to user since this is happening in the background
      // But we should try again after a short delay
      setTimeout(() => {
        console.log('Retrying order confirmation after failure');
        updateOrderStatusToConfirmed(orderId);
      }, 3000);
    }
    
    // Regardless of success/failure, schedule additional refreshes to ensure data consistency
    setTimeout(() => dispatch(fetchConfirmedOrders()), 5000);
    setTimeout(() => dispatch(fetchConfirmedOrders()), 10000);
  };

  // Filter orders to ensure they belong to current user
  const userOrders = useMemo(() => {
    if (!user || !user._id) return [];
    const userId = user._id;
    
    // Filter orders that have user ID and ensure it matches the current user
    return orders.filter(order => {
      // Skip orders without user ID or that don't match current user
      if (order.user && order.user.toString() !== userId) {
        console.warn(`Filtering out order ${order._id} that belongs to another user`);
        return false;
      }
      return true;
    });
  }, [orders, user]);

  // Main render
  return (
    <div className="container mx-auto px-4 py-8">
      <Typography variant="h4" gutterBottom>Your Cart</Typography>

      {/* Tabs */}
      <Tabs 
        value={activeTab} 
        onChange={handleTabChange} 
        aria-label="cart tabs"
        sx={{ mb: 3 }}
        variant="scrollable"
        scrollButtons="auto"
      >
        <Tab icon={<ShoppingCart />} label="Shopping Cart" />
        <Tab icon={<Favorite />} label="Saved Items" />
        <Tab icon={<History />} label="Order History" />
      </Tabs>

      {/* Shopping Cart Tab with Checkout Flow */}
      {activeTab === 0 && (
        <>
          {/* Show stepper only during checkout process */}
          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {steps.map((label, index) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {activeStep === 0 ? (
            <div>
              {renderCartItems()}
              {cartItems.length > 0 && renderOrderSummary()}
            </div>
          ) : activeStep === 1 ? (
            <div>
              {renderDeliveryForm()}
              {renderOrderSummary()}
            </div>
          ) : activeStep === 2 ? (
            <div>
              {renderPaymentForm()}
              {renderOrderSummary()}
            </div>
          ) : activeStep === 3 ? (
            <div>
              {renderOrderReview()}
              {renderOrderSummary()}
            </div>
          ) : (
            <div>
              {renderSuccessMessage()}
            </div>
          )}

          {/* Navigation buttons for checkout process */}
          <Box sx={{ display: 'flex', flexDirection: 'row', pt: 2 }}>
            <Button
              color="inherit"
              disabled={activeStep === 0 || activeStep === steps.length}
              onClick={handleBack}
              sx={{ mr: 1 }}
            >
              Back
            </Button>
            <Box sx={{ flex: '1 1 auto' }} />
            {activeStep === steps.length ? (
              <Button onClick={() => navigate('/')}>
                Continue Shopping
              </Button>
            ) : (
              <Button 
                onClick={activeStep === steps.length - 1 ? handlePlaceOrder : handleNext}
                variant="contained"
                disabled={cartItems.length === 0 && activeStep === 0}
              >
                {activeStep === steps.length - 1 ? 'Place Order' : 'Next'}
              </Button>
            )}
          </Box>

          {/* Debug info - hidden by default */}
          {renderDebugInfo && renderDebugInfo()}
        </>
      )}

      {/* Saved Items Tab */}
      {activeTab === 1 && (
        <div>
          {renderSavedItems()}
        </div>
      )}
      
      {/* Order History Tab */}
      {activeTab === 2 && (
        <div>
          {!user ? (
            <Box sx={{ 
              p: 4, 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center',
              textAlign: 'center',
              bgcolor: 'background.paper',
              borderRadius: 2,
              boxShadow: 1
            }}>
              <Typography variant="h6" gutterBottom>
                Sign in to view your order history
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Your order history will be available once you sign in to your account.
              </Typography>
              <Button 
                variant="contained" 
                color="primary"
                onClick={() => navigate('/login')}
              >
                Sign In
              </Button>
            </Box>
          ) : loadingOrders ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 4, flexDirection: 'column', alignItems: 'center' }}>
              <CircularProgress sx={{ mb: 2 }} />
              <Typography variant="body2" color="text.secondary">
                Loading your order history...
              </Typography>
            </Box>
          ) : userOrders.length === 0 ? (
            <Box sx={{ 
              p: 4, 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center',
              textAlign: 'center',
              bgcolor: 'background.paper',
              borderRadius: 2,
              boxShadow: 1
            }}>
              <Typography variant="h6" gutterBottom>
                No orders yet
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                You haven't placed any orders yet. Start shopping to see your orders here.
              </Typography>
              <Button 
                variant="contained" 
                color="primary" 
                onClick={() => navigate('/')}
              >
                Browse Products
              </Button>
            </Box>
          ) : (
            <Box>
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                mb: 3 
              }}>
                <Box>
                  <Typography variant="h6" gutterBottom>
                    {user.username ? `${user.username}'s Orders` : 'Your Orders'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Showing {userOrders.length} orders from your account
                  </Typography>
                </Box>
                <Button 
                  startIcon={<Refresh />}
                  variant="outlined"
                  onClick={handleRefreshOrders}
                  disabled={loadingOrders}
                >
                  Refresh
                </Button>
              </Box>

              {userOrders.map((order) => (
                <Card 
                  key={order._id} 
                  sx={{ 
                    mb: 3,
                    boxShadow: 'rgb(0 0 0 / 10%) 0px 2px 8px',
                    transition: 'transform 0.2s',
                    '&:hover': {
                      transform: 'translateY(-4px)'
                    },
                    cursor: 'pointer',
                    position: 'relative',
                    overflow: 'visible'
                  }}
                  onClick={() => handleViewOrderDetails(order._id)}
                >
                  {/* Personal order badge */}
                  <Box
                    sx={{
                      position: 'absolute',
                      top: -10,
                      right: 15,
                      backgroundColor: 'primary.main',
                      color: 'white',
                      fontWeight: 'bold',
                      fontSize: '0.75rem',
                      py: 0.5,
                      px: 1.5,
                      borderRadius: 5,
                      zIndex: 1,
                      boxShadow: 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5
                    }}
                  >
                    <Typography variant="caption" sx={{ fontWeight: 'bold' }}>Your Order</Typography>
                  </Box>
                  
                  <CardContent sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap' }}>
                      <Typography variant="subtitle1">
                        Order #{order._id.substring(order._id.length - 6)}
                      </Typography>
                      <Chip 
                        label={order.status.replace(/_/g, ' ').toUpperCase()}
                        color={getStatusColor(order.status)}
                        size="small"
                      />
                    </Box>
                    
                    <Typography variant="body2" color="text.secondary">
                      Placed on {formatDate(order.createdAt)}
                    </Typography>
                    
                    <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box>
                        <Typography variant="body2">
                          {order.items.length} {order.items.length === 1 ? 'item' : 'items'}
                        </Typography>
                        <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                          Total: ₹{(order.total || order.totalAmount || 0).toFixed(2)}
                        </Typography>
                      </Box>
                      <Button 
                        variant="outlined"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewOrderDetails(order._id);
                        }}
                        endIcon={<KeyboardArrowRight />}
                      >
                        View Details
                      </Button>
                    </Box>

                    {order.items.length > 0 && (
                      <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid #eee' }}>
                        <Grid container spacing={1}>
                          {order.items.slice(0, 3).map((item, index) => (
                            <Grid item key={index}>
                              {item.image ? (
                                <Box
                                  component="img"
                                  src={item.image}
                                  alt={item.name}
                                  sx={{ 
                                    width: 40, 
                                    height: 40, 
                                    objectFit: 'cover', 
                                    borderRadius: 1,
                                    mr: 0.5 
                                  }}
                                />
                              ) : (
                                <Box 
                                  sx={{ 
                                    width: 40, 
                                    height: 40, 
                                    bgcolor: 'grey.200',
                                    borderRadius: 1,
                                    mr: 0.5,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                  }}
                                >
                                  <ShoppingCart color="action" fontSize="small" />
                                </Box>
                              )}
                            </Grid>
                          ))}
                          {order.items.length > 3 && (
                            <Grid item>
                              <Box 
                                sx={{ 
                                  width: 40, 
                                  height: 40, 
                                  bgcolor: 'grey.100',
                                  color: 'text.secondary',
                                  borderRadius: 1,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontWeight: 'bold'
                                }}
                              >
                                +{order.items.length - 3}
                              </Box>
                            </Grid>
                          )}
                        </Grid>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              ))}
              
              <Box sx={{ mt: 3, textAlign: 'center' }}>
                <Button 
                  variant="contained"
                  onClick={() => navigate('/orders')}
                >
                  View All Orders
                </Button>
              </Box>
            </Box>
          )}
        </div>
      )}
    </div>
  );
};

export default CartPage;
