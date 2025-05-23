import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  addToCart, 
  increaseQuantity, 
  decreaseQuantity,
  removeFromCart,
  setCurrentUser,
  migrateCart
} from '../redux/cartSlice';
import { toast } from 'react-toastify';

/**
 * Custom hook for cart operations
 * 
 * Provides simplified methods for cart operations with built-in
 * error handling and loading states
 */
export const useCart = () => {
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();
  
  // Get user from auth state
  const { user } = useSelector((state) => state.auth);
  const userId = user?._id || null;
  
  // Get cart state with fallbacks for each property
  const {
    cartItems = [], 
    stockErrors = {},
    currentUserId,
    userCarts = {}
  } = useSelector((state) => state.cart || {});
  
  // Get user-specific cart data
  const userCart = userId ? userCarts[userId] || {} : {};
  const userCartItems = userCart.cartItems || cartItems || [];
  const userStockErrors = userCart.stockErrors || stockErrors || {};
  
  // Initialize user cart when component mounts or user changes
  useEffect(() => {
    if (userId) {
      // Set current user ID in cart state
      dispatch(setCurrentUser(userId));
      
      // Migrate any existing cart data
      dispatch(migrateCart(userId));
    }
  }, [userId, dispatch]);
  
  /**
   * Add an item to the cart
   */
  const addItem = (item) => {
    if (!item || !item._id) {
      toast.error("Invalid item");
      return;
    }
    
    // Ensure user is logged in
    if (!userId) {
      toast.error("Please log in to add items to your cart");
      return;
    }
    
    setLoading(true);
    
    try {
      const isInCart = userCartItems.some((cartItem) => cartItem._id === item._id);
      
      if (isInCart) {
        dispatch(increaseQuantity({ _id: item._id, maxStock: 100 }));
        toast.info("Added one more to cart");
      } else {
        const cartItem = {
          ...item,
          quantity: 1,
          maxStock: 100
        };
        dispatch(addToCart(cartItem));
        toast.success("Added to cart");
      }
    } catch (error) {
      console.error("Error adding to cart:", error);
      toast.error("Failed to add item to cart");
    } finally {
      setTimeout(() => setLoading(false), 300);
    }
  };
  
  /**
   * Increase quantity of an item in the cart
   */
  const increaseItem = (itemId) => {
    if (!itemId) return;
    
    // Ensure user is logged in
    if (!userId) {
      toast.error("Please log in to update your cart");
      return;
    }
    
    setLoading(true);
    
    try {
      dispatch(increaseQuantity({ _id: itemId, maxStock: 100 }));
    } catch (error) {
      console.error("Error increasing quantity:", error);
      toast.error("Failed to update cart");
    } finally {
      setTimeout(() => setLoading(false), 300);
    }
  };
  
  /**
   * Decrease quantity of an item in the cart
   */
  const decreaseItem = (itemId) => {
    if (!itemId) return;
    
    // Ensure user is logged in
    if (!userId) {
      toast.error("Please log in to update your cart");
      return;
    }
    
    setLoading(true);
    
    try {
      // Get current item to check quantity
      const currentItem = userCartItems.find(item => item._id === itemId);
      
      if (currentItem) {
        dispatch(decreaseQuantity({ _id: itemId }));
        
        // Show feedback if item was removed (quantity was 1)
        if (currentItem.quantity <= 1) {
          toast.info("Item removed from cart");
        }
      }
    } catch (error) {
      console.error("Error decreasing quantity:", error);
      toast.error("Failed to update cart");
    } finally {
      setTimeout(() => setLoading(false), 300);
    }
  };
  
  /**
   * Remove an item from the cart
   */
  const removeItem = (itemId) => {
    if (!itemId) return;
    
    // Ensure user is logged in
    if (!userId) {
      toast.error("Please log in to remove items from your cart");
      return;
    }
    
    setLoading(true);
    
    try {
      dispatch(removeFromCart(itemId));
      toast.info("Item removed from cart");
    } catch (error) {
      console.error("Error removing item:", error);
      toast.error("Failed to remove item");
    } finally {
      setTimeout(() => setLoading(false), 300);
    }
  };
  
  /**
   * Get quantity of an item in the cart
   */
  const getItemQuantity = (itemId) => {
    if (!itemId || !userCartItems) return 0;
    
    const item = userCartItems.find(item => item._id === itemId);
    return item?.quantity || 0;
  };
  
  /**
   * Check if an item is in the cart
   */
  const isItemInCart = (itemId) => {
    if (!itemId || !userCartItems || !Array.isArray(userCartItems)) return false;
    return userCartItems.some(item => item._id === itemId);
  };
  
  /**
   * Get stock error for an item
   */
  const getStockError = (itemId) => {
    if (!itemId || !userStockErrors) return null;
    return userStockErrors[itemId] || null;
  };
  
  return {
    loading,
    cartItems: userCartItems,
    stockErrors: userStockErrors,
    addItem,
    increaseItem,
    decreaseItem,
    removeItem,
    getItemQuantity,
    isItemInCart,
    getStockError
  };
};

export default useCart; 