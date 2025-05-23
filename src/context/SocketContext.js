import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useSelector } from 'react-redux';

// Create a context for the socket
const SocketContext = createContext();

// Socket provider component
export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const { isAuthenticated, token, user } = useSelector(state => state.auth);
  
  useEffect(() => {
    // Only connect if the user is authenticated
    if (isAuthenticated && token && user) {
      // Create socket connection
      const newSocket = io('http://localhost:8000', {
        auth: {
          token
        },
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });
      
      // Set up event handlers
      newSocket.on('connect', () => {
        console.log('Socket connected');
        
        // Join user-specific room
        if (user._id) {
          newSocket.emit('join', { userId: user._id });
          
          // If user is a delivery agent, join delivery room
          if (user.isDeliveryAgent) {
            newSocket.emit('join', { room: 'delivery-agents' });
          }
        }
      });
      
      newSocket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
      });
      
      newSocket.on('disconnect', (reason) => {
        console.log('Socket disconnected:', reason);
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
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};

// Custom hook to use the socket
export const useSocket = () => {
  return useContext(SocketContext);
};

export default SocketContext;
