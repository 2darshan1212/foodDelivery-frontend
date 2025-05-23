import React, { useEffect } from "react";
import SolanaWalletProvider from "./components/wallet/SolanaWalletProvider";
import StoryProtocolProvider from "./providers/StoryProtocolProvider";
import { SocketProvider } from "./context/SocketContext.jsx";
import Signup from "./components/auth/Signup";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import MainLayout from "./components/mainlayout/MainLayout";
import Login from "./components/auth/Login";
import Feeds from "./components/feeds/Feeds";
import Profile from "./components/profile/Profile";
import EditProfile from "./components/editProfile/EditProfile";
import CategoryPage from "./components/category/CategoryPage";
import Cart from "./components/cart/Cart";
import ChatLayout from "./components/chat/ChatLayout";
import ChatPage from "./components/chat/ChatPage";
import { useDispatch, useSelector } from "react-redux";
import { setOnlineUsers } from "./redux/chatSlice";
import { addNotification, fetchNotifications } from "./redux/rtnSlice";
import { setSocketConnected, resetSocketState, addOrderStatusUpdate } from "./redux/socketSlice";
import { fetchCurrentUserFollowings } from "./redux/userSlice";
import { setCurrentUser, migrateCart, syncOrderStatus, fetchOrders } from "./redux/cartSlice";
import { 
  initSocket, 
  closeSocket, 
  onEvent, 
  offEvent,
  getSocket
} from "./services/socketManager";
import PostDetail from "./components/post/PostDetail";
import FavoritesPage from "./components/favorites/FavoritesPage";
import SharedPost from "./components/share/SharedPost";
import OrdersPage from "./components/orders/OrdersPage";
import AdminLayout from "./components/admin/AdminLayout";
import AdminDashboard from "./components/admin/AdminDashboard";
import OrdersManagement from "./components/admin/OrdersManagement";
import AdminCheck from "./pages/AdminCheck";
import CategoriesManagement from "./components/admin/CategoriesManagement";
import UsersManagement from "./components/admin/UsersManagement";
import { toast } from "react-hot-toast";
import DeliveryLayout from "./components/delivery/DeliveryLayout";
import Dashboard from "./components/delivery/Dashboard";
import Register from "./components/delivery/Register";
import NearbyOrders from "./components/delivery/NearbyOrders";
import MyDeliveries from "./components/delivery/MyDeliveries";
import DeliveryHistory from "./components/delivery/DeliveryHistory";
import DeliveryProfile from "./components/delivery/Profile";
import DeliveryAgentsManagement from "./components/admin/DeliveryAgentsManagement";

const browserRouter = createBrowserRouter([
  {
    path: "/",
    element: <MainLayout />,
    children: [
      {
        path: "/",
        element: <Feeds />,
      },
      {
        path: "/category/:category",
        element: <CategoryPage />,
      },
      {
        path: "/post/:id",
        element: <PostDetail />,
      },
      {
        path: "/favorites",
        element: <FavoritesPage />,
      },
      {
        path: "/orders/*",
        element: <OrdersPage />,
      },
    ],
  },
  {
    path: "/signup",
    element: <Signup />,
  },
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/profile/:id",
    element: <Profile />,
  },
  {
    path: "profile/:id/account/edit",
    element: <EditProfile />,
  },
  {
    path: "/cartPage",
    element: <Cart />,
  },
  {
    path: "/chat",
    element: <ChatLayout />,
    children: [
      {
        path: "/chat/chatpage",
        element: <ChatPage />,
      },
    ],
  },
  {
    path: "/shared/:shareId",
    element: <SharedPost />,
  },
  // Admin Routes
  {
    path: "/admin",
    element: <AdminLayout />,
    children: [
      {
        path: "dashboard",
        element: <AdminDashboard />,
      },
      {
        path: "orders",
        element: <OrdersManagement />,
      },
      {
        path: "categories",
        element: <CategoriesManagement />,
      },
      {
        path: "users",
        element: <UsersManagement />,
      },
      {
        path: "delivery-agents",
        element: <DeliveryAgentsManagement />,
      },
      {
        path: "check",
        element: <AdminCheck />,
      },
    ],
  },
  // Admin debug route
  {
    path: "/admin-check",
    element: <AdminCheck />,
  },
  // Delivery Routes
  {
    path: "/deliver",
    element: <DeliveryLayout />,
    children: [
      {
        path: "dashboard",
        element: <Dashboard />,
      },
      {
        path: "register",
        element: <Register />,
      },
      {
        path: "nearby-orders",
        element: <NearbyOrders />,
      },
      {
        path: "my-deliveries",
        element: <MyDeliveries />,
      },
      {
        path: "history",
        element: <DeliveryHistory />,
      },
      {
        path: "profile",
        element: <DeliveryProfile />,
      },
    ],
  },
]);

const App = () => {
  const { user } = useSelector((store) => store.auth);
  const { connected } = useSelector((store) => store.socket);
  const { unreadCounts } = useSelector((store) => store.chat); 
  const dispatch = useDispatch();
  
  // Initialize user-specific cart when user logs in or out
  useEffect(() => {
    // Set current user ID for cart (or null if logged out)
    const userId = user?._id || null;
    console.log("Setting current user ID in cart state:", userId);
    dispatch(setCurrentUser(userId));
    
    // If user is logged in, migrate any existing cart items to their user-specific cart
    if (userId) {
      dispatch(migrateCart(userId));
      
      // Force fetch orders when user changes (clear any previous user's orders)
      dispatch({ type: 'cart/orders/reset' });
      dispatch(fetchOrders());
    } else {
      // Clear orders when user logs out
      dispatch({ type: 'cart/orders/reset' });
    }
  }, [user?._id, dispatch]);
  
  // Detect and fix corrupted chat state
  useEffect(() => {
    // Check if unreadCounts is undefined, which indicates a corrupted state
    if (unreadCounts === undefined) {
      console.warn('Found corrupted chat state, attempting to fix...');
      
      // Try to repair the localStorage data
      try {
        // Get the current persisted state
        const persistedState = JSON.parse(localStorage.getItem('persist:chat'));
        if (persistedState) {
          // Ensure unreadCounts exists in the state
          const chatState = JSON.parse(persistedState);
          if (!chatState.unreadCounts) {
            chatState.unreadCounts = {};
            persistedState.chat = JSON.stringify(chatState);
            localStorage.setItem('persist:chat', JSON.stringify(persistedState));
            console.log('Fixed corrupted chat state');
            
            // Force a page reload to apply the fixed state
            window.location.reload();
          }
        }
      } catch (error) {
        console.error('Error fixing corrupted state, clearing chat state:', error);
        // If unable to repair, clear the chat state completely
        localStorage.removeItem('persist:chat');
        window.location.reload();
      }
    }
  }, [unreadCounts]);
  
  // Fetch notifications when user is logged in
  useEffect(() => {
    if (user) {
      dispatch(fetchNotifications());
    }
  }, [user, dispatch]);
  
  // Fetch user followings when logged in
  useEffect(() => {
    if (user) {
      dispatch(fetchCurrentUserFollowings());
    }
  }, [user, dispatch]);
  
  // Setup socket connection
  useEffect(() => {
    if (user) {
      try {
        const socket = initSocket(user._id);
        
        if (socket) {
          // Set socket connection status in Redux
          dispatch(setSocketConnected({
            connected: socket.connected,
            socketId: socket.id
          }));
          
          // Update connection status when it changes
          onEvent('connect', () => {
            console.log('Socket connected');
            dispatch(setSocketConnected({
              connected: true,
              socketId: socket.id
            }));
            
            // When reconnected, refresh notifications
            dispatch(fetchNotifications());
          });
          
          onEvent('disconnect', () => {
            console.log('Socket disconnected');
            dispatch(setSocketConnected({
              connected: false,
              socketId: null
            }));
          });
          
          // Handle connection errors
          onEvent('connect_error', (err) => {
            console.error("Socket connection error:", err.message);
            dispatch(setSocketConnected({
              connected: false,
              socketId: null
            }));
          });
          
          // Listening for all events
          onEvent('getOnlineUsers', (onlineUsers) => {
            console.log('Online users updated:', onlineUsers.length);
            dispatch(setOnlineUsers(onlineUsers));
          });

          // Handle all notification types with the same function
          const handleNotification = (notification) => {
            console.log('Received notification:', notification);
            dispatch(addNotification(notification));
          };
          
          // Register notification handlers
          onEvent('notification', handleNotification);
          onEvent('newNotification', handleNotification);

          // Register order status update handler
          onEvent('order_status_update', (data) => {
            console.log('Order status update received:', data);
            
            // Make sure data has the required fields
            if (!data || !data.orderId) {
              console.error('Invalid order status update received:', data);
              return;
            }
            
            // Add timestamp if not present
            const orderUpdate = {
              ...data,
              timestamp: data.timestamp || new Date().toISOString()
            };
            
            // Add to order status updates in socket slice
            dispatch(addOrderStatusUpdate(orderUpdate));
            
            // Synchronize order status in user's order history
            if (orderUpdate.orderId && orderUpdate.status) {
              console.log('Dispatching syncOrderStatus with:', orderUpdate);
              
              dispatch(syncOrderStatus({
                orderId: orderUpdate.orderId,
                status: orderUpdate.status,
                paymentStatus: orderUpdate.paymentStatus
              }));
              
              // Show notification for order updates with better formatting
              const formattedStatus = orderUpdate.status.replace(/_/g, ' ').toUpperCase();
              const orderId = orderUpdate.orderId.substring(0, 8);
              
              toast.info(
                `Order #${orderId}... status updated to ${formattedStatus}`,
                {
                  position: "bottom-right",
                  autoClose: 5000
                }
              );
            }
          });
        }

        return () => {
          // Clean up all event listeners
          offEvent('connect');
          offEvent('disconnect');
          offEvent('connect_error');
          offEvent('getOnlineUsers');
          offEvent('notification');
          offEvent('newNotification');
          offEvent('order_status_update');
          
          closeSocket();
          dispatch(resetSocketState());
          dispatch(setOnlineUsers([]));
        };
      } catch (error) {
        console.error("Socket setup error:", error);
      }
    } else {
      closeSocket();
      dispatch(resetSocketState());
      dispatch(setOnlineUsers([]));
    }
  }, [user, dispatch]);
  
  return (
    <StoryProtocolProvider>
      <SolanaWalletProvider>
        <SocketProvider>
          <RouterProvider router={browserRouter} />
        </SocketProvider>
      </SolanaWalletProvider>
    </StoryProtocolProvider>
  );
};

export default App;
