import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Avatar, Badge, CircularProgress, Tooltip } from "@mui/material";
import axios from "axios";
import { setSelectedUser } from "../../redux/authSlice";
import { clearUnreadCount } from "../../redux/chatSlice";
import moment from "moment";
import { MessageCircle } from "lucide-react";

const ConversationList = ({ onSelectConversation }) => {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const dispatch = useDispatch();
  const { user } = useSelector(state => state.auth);
  const { onlineUsers, unreadCounts } = useSelector(state => state.chat);
  const { notifications, realtimeNotifications } = useSelector(state => state.realTimeNotification);

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        setLoading(true);
        const res = await axios.get(
          "http://localhost:8000/api/v1/message/conversations",
          { withCredentials: true }
        );
        
        if (res.data.success) {
          setConversations(res.data.conversations);
        }
      } catch (error) {
        console.log("Error fetching conversations:", error);
      } finally {
        setLoading(false);
      }
    };

    // Also fetch users who don't have conversations yet
    const fetchAllUsers = async () => {
      try {
        const res = await axios.get(
          "http://localhost:8000/api/v1/user/all",
          { withCredentials: true }
        );
        
        if (res.data.success) {
          // Filter out the current user
          const allUsers = res.data.users.filter(u => u._id !== user?._id);
          
          // Merge with existing conversations
          const existingParticipantIds = conversations.map(c => c.participant._id);
          const usersWithoutConversations = allUsers.filter(
            u => !existingParticipantIds.includes(u._id)
          ).map(u => ({
            _id: null, // No conversation ID yet
            participant: u,
            lastMessage: null,
            unreadCount: 0
          }));
          
          setConversations(prev => [...prev, ...usersWithoutConversations]);
        }
      } catch (error) {
        console.log("Error fetching all users:", error);
      }
    };

    if (user) {
      fetchConversations().then(() => fetchAllUsers());
    }
  }, [user, conversations.length]);

  const handleSelectConversation = (conversationData) => {
    dispatch(setSelectedUser(conversationData.participant));
    
    // Clear unread count when selecting a conversation
    if (conversationData.unreadCount > 0) {
      // Dispatch action to clear unread count in Redux store
      dispatch(clearUnreadCount({ senderId: conversationData.participant._id }));
      
      // Call the API to mark messages as read
      axios.put(
        `http://localhost:8000/api/v1/message/read/${conversationData.participant._id}`,
        {},
        { withCredentials: true }
      );
    }
    
    // Notify parent component that a conversation was selected
    if (onSelectConversation) {
      onSelectConversation(conversationData);
    }
  };

  const isUserOnline = (userId) => {
    return onlineUsers.includes(userId);
  };

  // Get latest message notifications for a user
  const getNotificationsForUser = (userId) => {
    const allNotifications = [
      ...(Array.isArray(notifications) ? notifications : []),
      ...(Array.isArray(realtimeNotifications) ? realtimeNotifications : [])
    ];
    
    // Filter message notifications for this user and sort by date (newest first)
    return allNotifications
      .filter(n => 
        n.type === 'message' && 
        (n.sender?._id === userId || n.sender === userId) &&
        !n.read
      )
      .sort((a, b) => 
        new Date(b.createdAt || Date.now()) - new Date(a.createdAt || Date.now())
      );
  };

  // Format the message preview for display
  const formatMessagePreview = (message) => {
    if (!message) return "";
    return message.length > 25 ? message.substring(0, 25) + "..." : message;
  };

  // Get the latest notification message or use the last message
  const getMessagePreview = (conv) => {
    const userNotifications = getNotificationsForUser(conv.participant._id);
    const latestNotification = userNotifications[0];
    
    // If there's a new unread notification, show it
    if (latestNotification && latestNotification.message) {
      const message = latestNotification.message;
      
      // Clean up the notification message format
      if (message.includes('sent you a message:')) {
        const match = message.match(/sent you a message: "(.+?)"/);
        return match ? match[1] : formatMessagePreview(message);
      } else if (message.includes('sent you an image')) {
        return '📷 Image';
      } else if (message.includes('sent you a file:')) {
        return '📎 File attachment';
      }
      
      return formatMessagePreview(message);
    }
    
    // Otherwise show the last message content
    if (conv.lastMessage) {
      // Check if it's a file
      if (conv.lastMessage.fileType === 'image') {
        return '📷 Image';
      } else if (conv.lastMessage.fileType === 'document') {
        return '📎 ' + (conv.lastMessage.fileName || 'File');
      }
      return formatMessagePreview(conv.lastMessage.message);
    }
    
    return "Start a conversation";
  };

  // Get the timestamp for the conversation
  const getMessageTimestamp = (conv) => {
    const userNotifications = getNotificationsForUser(conv.participant._id);
    const latestNotification = userNotifications[0];
    
    if (latestNotification && latestNotification.createdAt) {
      return moment(latestNotification.createdAt).fromNow();
    }
    
    if (conv.lastMessage && conv.lastMessage.createdAt) {
      return moment(conv.lastMessage.createdAt).fromNow();
    }
    
    return "";
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-40">
        <CircularProgress size={30} />
      </div>
    );
  }

  return (
    <div className="overflow-y-auto h-full">
      {conversations.length === 0 ? (
        <p className="text-gray-500 text-sm p-3">No conversations yet</p>
      ) : (
        <div>
          {conversations.map(conv => {
            const { participant, unreadCount } = conv;
            const messagePreview = getMessagePreview(conv);
            const timestamp = getMessageTimestamp(conv);
            
            return (
              <div
                key={conv._id || participant._id}
                onClick={() => handleSelectConversation(conv)}
                className={`flex items-center p-3 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors ${
                  unreadCount > 0 ? 'bg-blue-50' : ''
                }`}
              >
                <div className="relative">
                  <Avatar 
                    src={participant.profilePicture} 
                    alt={participant.username} 
                    sx={{ width: 40, height: 40 }}
                  />
                  <div 
                    className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${
                      isUserOnline(participant._id) ? 'bg-green-500' : 'bg-gray-400'
                    }`}
                  />
                </div>
                
                <div className="ml-3 flex-1">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{participant.username}</span>
                    <div className="flex items-center gap-2">
                      {timestamp && (
                        <span className="text-xs text-gray-500">{timestamp}</span>
                      )}
                      {unreadCount > 0 && (
                        <Badge 
                          badgeContent={unreadCount} 
                          color="primary" 
                          sx={{ '.MuiBadge-badge': { fontSize: '0.7rem' } }}
                        />
                      )}
                    </div>
                  </div>
                  <p className={`text-sm ${unreadCount > 0 ? 'font-semibold text-gray-800' : 'text-gray-500'} truncate flex items-center gap-1`}>
                    {unreadCount > 0 && (
                      <span className="text-blue-500"><MessageCircle size={14} /></span>
                    )}
                    {messagePreview}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ConversationList; 