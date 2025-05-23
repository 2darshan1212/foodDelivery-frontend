import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setMessages, incrementUnreadCount, updateMessageReadStatus, clearUnreadCount } from "../redux/chatSlice";
import { onEvent, offEvent, emitEvent } from "../services/socketManager";
import axios from "axios";
import { markNotificationRead } from "../redux/rtnSlice";

const useGetRTM = () => {
  const dispatch = useDispatch();
  const { connected } = useSelector((store) => store.socket);
  const { messages } = useSelector((store) => store.chat);
  const { user, selectedUser } = useSelector((store) => store.auth);
  const { notifications } = useSelector((store) => store.realTimeNotification);

  useEffect(() => {
    if (!connected) return;

    const handleNewMessage = (newMessage) => {
      console.log("New message received:", newMessage);
      
      // Make sure we have a complete message object with all properties
      const messageToAdd = {
        ...newMessage,
        fileUrl: newMessage.fileUrl || null,
        fileType: newMessage.fileType || null,
        fileName: newMessage.fileName || null
      };
      
      // Update messages state with the new message
      dispatch(setMessages(prevMessages => [...(prevMessages || []), messageToAdd]));
      
      // If this message is from someone other than the currently selected user
      // and was sent to the current user, increment unread count
      if (
        newMessage.senderId !== selectedUser?._id && 
        newMessage.receiverId === user?._id
      ) {
        dispatch(incrementUnreadCount({ senderId: newMessage.senderId }));
      }
      
      // If the sender is the currently selected user, mark as read on the server
      if (
        newMessage.senderId === selectedUser?._id && 
        newMessage.receiverId === user?._id
      ) {
        emitEvent("markMessagesRead", { senderId: newMessage.senderId });
        
        // Call API to mark as read in the database
        fetch(`http://localhost:8000/api/v1/message/read/${newMessage.senderId}`, {
          method: 'PUT',
          credentials: 'include'
        });
      }
    };
    
    const handleMessagesRead = (data) => {
      if (data.to === user?._id) {
        dispatch(updateMessageReadStatus({ senderId: data.from }));
      }
    };
    
    // Register the listeners
    onEvent("newMessage", handleNewMessage);
    onEvent("messagesRead", handleMessagesRead);
    
    // Cleanup
    return () => {
      offEvent("newMessage", handleNewMessage);
      offEvent("messagesRead", handleMessagesRead);
    };
  }, [messages, connected, dispatch, selectedUser, user]);

  // Mark messages as read when a user is selected
  useEffect(() => {
    if (!connected || !selectedUser || !user) return;
    
    // Call API to mark messages from this user as read
    fetch(`http://localhost:8000/api/v1/message/read/${selectedUser._id}`, {
      method: 'PUT',
      credentials: 'include'
    });
    
    // Emit event to notify the sender
    emitEvent("markMessagesRead", { senderId: selectedUser._id });
    
    // Clear unread count for this user
    dispatch(clearUnreadCount({ senderId: selectedUser._id }));
    
    // Also mark related message notifications as read
    if (notifications && notifications.length > 0) {
      // Find message notifications from this selected user
      const messageNotifications = notifications.filter(
        n => n.type === 'message' && 
             (n.sender?._id === selectedUser._id || n.sender === selectedUser._id) && 
             !n.read
      );
      
      // Mark each notification as read
      messageNotifications.forEach(notification => {
        if (notification._id) {
          dispatch(markNotificationRead(notification._id));
        }
      });
    }
  }, [selectedUser, connected, user, dispatch, notifications]);
};

export default useGetRTM;
