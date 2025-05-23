import React, { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";
import { useSelector, useDispatch } from "react-redux";
import { fetchConfirmedOrders } from "../redux/confirmedOrdersSlice";
import { toast } from "react-toastify";

// Create a context for the socket
const SocketContext = createContext();

// Socket provider component
export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const { isAuthenticated, token, user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();

  useEffect(() => {
    // Only connect if the user is authenticated
    if (isAuthenticated && token && user) {
      // Create socket connection
      const newSocket = io(
        "https://food-delivery-backend-gray.vercel.app",
        {
          auth: {
            token,
          },
          transports: ["websocket"],
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
        }
      );

      // Set up event handlers
      newSocket.on("connect", () => {
        console.log("Socket connected");

        // Join user-specific room
        if (user._id) {
          newSocket.emit("join", { userId: user._id });

          // If user is a delivery agent, join delivery room
          if (user.isDeliveryAgent) {
            newSocket.emit("join", { room: "delivery-agents" });

            // Fetch confirmed orders immediately upon connection
            dispatch(fetchConfirmedOrders());
          }
        }
      });

      // Handle new confirmed order events
      newSocket.on("order-confirmed", (data) => {
        console.log("New confirmed order received:", data);

        // Update the Redux store with the new confirmed order
        dispatch(fetchConfirmedOrders());

        // Show notification if user is a delivery agent
        if (user?.isDeliveryAgent) {
          toast.info(`New order confirmed! Order #${data.orderId.slice(-6)}`);
        }
      });

      // Handle order status update events
      newSocket.on("order-status-updated", (data) => {
        console.log("Order status updated:", data);

        // Refresh confirmed orders if the user is a delivery agent
        if (user?.isDeliveryAgent) {
          dispatch(fetchConfirmedOrders());
        }
      });

      newSocket.on("connect_error", (error) => {
        console.error("Socket connection error:", error);
      });

      newSocket.on("disconnect", (reason) => {
        console.log("Socket disconnected:", reason);
      });

      setSocket(newSocket);

      // Clean up on unmount
      return () => {
        if (newSocket) {
          newSocket.disconnect();
        }
      };
    }

    return () => {}; // Empty cleanup function when not authenticated
  }, [isAuthenticated, token, user]);

  return (
    <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>
  );
};

// Custom hook to use the socket
export const useSocket = () => {
  return useContext(SocketContext);
};

// Custom hook to manually refresh confirmed orders using the socket
export const useSocketRefresh = () => {
  const socket = useContext(SocketContext);
  const dispatch = useDispatch();

  const refreshConfirmedOrders = () => {
    if (socket) {
      console.log("Manually refreshing confirmed orders via socket");
      socket.emit("refresh-confirmed-orders");
      dispatch(fetchConfirmedOrders());
    } else {
      console.warn("Socket not connected, using direct API call instead");
      dispatch(fetchConfirmedOrders());
    }
  };

  return { refreshConfirmedOrders };
};

export default SocketContext;
