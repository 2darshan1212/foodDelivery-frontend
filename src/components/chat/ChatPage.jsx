import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { 
  Avatar, 
  Button, 
  CircularProgress, 
  Paper, 
  Drawer,
  IconButton,
  useMediaQuery,
  useTheme,
  Badge,
  Tooltip
} from "@mui/material";
import { MessageCircleCode, Menu, X, Paperclip, ImageIcon, FileIcon } from "lucide-react";
import axios from "axios";

import Messages from "./Messages";
import ConversationList from "./ConversationList";
import { setMessages } from "../../redux/chatSlice";
import { setSelectedUser } from "../../redux/authSlice";

const ChatPage = () => {
  const dispatch = useDispatch();
  const { selectedUser } = useSelector((store) => store.auth);
  const { messages } = useSelector((store) => store.chat);
  const { unreadCounts } = useSelector((store) => store.chat);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [textMessage, setTextMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const fileInputRef = useRef(null);

  // Auto scroll to bottom
  useEffect(() => {
    // Check if we should auto-scroll based on how far the user has scrolled up
    const shouldAutoScroll = () => {
      if (!messagesContainerRef.current) return true;
      
      const container = messagesContainerRef.current;
      const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
      
      // If the user is already near the bottom (within 150px), auto-scroll
      return distanceFromBottom < 150;
    };
    
    // Scroll to bottom if appropriate
    if (messagesEndRef.current && shouldAutoScroll()) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Force scroll to bottom when conversation changes
  useEffect(() => {
    if (messagesEndRef.current) {
      setTimeout(() => {
        messagesEndRef.current.scrollIntoView({ behavior: "auto" });
      }, 100);
    }
  }, [selectedUser]);

  // Listen for messages loaded event
  useEffect(() => {
    const handleMessagesLoaded = () => {
      if (messagesEndRef.current) {
        console.log("Messages loaded event received, scrolling to bottom");
        messagesEndRef.current.scrollIntoView({ behavior: "auto" });
      }
    };
    
    // Add event listener for custom event from Messages component
    window.addEventListener('chat-messages-loaded', handleMessagesLoaded);
    
    return () => {
      window.removeEventListener('chat-messages-loaded', handleMessagesLoaded);
    };
  }, []);

  // Force scroll to bottom on initial load
  useEffect(() => {
    // Wait for messages to be loaded and DOM to be updated
    const initialScrollTimeout = setTimeout(() => {
      if (messagesEndRef.current && messages && messages.length > 0) {
        messagesEndRef.current.scrollIntoView({ behavior: "auto" });
        console.log("Scrolled to latest messages on initial load");
      }
    }, 300);

    return () => clearTimeout(initialScrollTimeout);
  }, []); // Empty dependency array means this runs once on mount

  // Reset selected user on unmount
  useEffect(() => {
    return () => dispatch(setSelectedUser(null));
  }, []);

  // Clean up file preview when component unmounts
  useEffect(() => {
    return () => {
      if (filePreview) {
        URL.revokeObjectURL(filePreview);
      }
    };
  }, [filePreview]);

  // Handle file selection
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Log file details for debugging
    console.log("Selected file:", file);
    
    setSelectedFile(file);
    
    // Create preview for images
    if (file.type.startsWith('image/')) {
      const objectUrl = URL.createObjectURL(file);
      setFilePreview(objectUrl);
    } else {
      setFilePreview(null);
    }
  };

  // Format file size for display
  const formatFileSize = (bytes) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Reset file selection
  const handleCancelFile = () => {
    setSelectedFile(null);
    if (filePreview) {
      URL.revokeObjectURL(filePreview);
      setFilePreview(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const sendMessageHandler = async (receiverId) => {
    if (!textMessage.trim() && !selectedFile) return;

    try {
      setIsSending(true);
      
      // Create form data for file upload
      const formData = new FormData();
      // Always include a text message (empty string if there's no text)
      formData.append('textMessage', textMessage.trim() || '');
      
      if (selectedFile) {
        formData.append('file', selectedFile);
        console.log("Appending file to form data:", selectedFile.name);
      }
      
      console.log("Sending message to:", receiverId);
      
      const res = await axios.post(
        `http://localhost:8000/api/v1/message/send/${receiverId}`,
        formData,
        {
          headers: { 
            'Content-Type': 'multipart/form-data',
          },
          withCredentials: true,
        }
      );

      console.log("Response:", res.data);

      if (res.data.success) {
        // Use a function updater to ensure we're working with the latest state
        dispatch(setMessages(prevMessages => [...(prevMessages || []), res.data.newMessage]));
        setTextMessage("");
        handleCancelFile();
        
        // Force scroll to bottom after sending a message
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
      }
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setIsSending(false);
    }
  };

  const toggleDrawer = () => {
    setDrawerOpen(!drawerOpen);
  };

  // Handle conversation selection
  const handleConversationSelected = () => {
    // Close drawer whenever a conversation is selected, regardless of screen size
    setDrawerOpen(false);
  };

  // Calculate total unread messages
  const totalUnreadCount = unreadCounts ? 
    Object.values(unreadCounts).reduce((sum, count) => sum + count, 0) : 0;

  // Menu button component with badge
  const MenuButton = () => (
    <IconButton 
      onClick={toggleDrawer} 
      color="primary"
      size="large"
      sx={{
        backgroundColor: 'rgba(63, 81, 181, 0.1)',
        '&:hover': {
          backgroundColor: 'rgba(63, 81, 181, 0.2)',
        },
        zIndex: 100
      }}
    >
      <Badge 
        badgeContent={totalUnreadCount > 0 ? totalUnreadCount : null} 
        color="error"
      >
        <Menu size={24} />
      </Badge>
    </IconButton>
  );

  return (
    <div className="h-[calc(100vh-100px)] relative mb-2">
      {/* Always show menu button on small screens */}
      {isMobile && (
        <div className="absolute top-2 right-2 z-50">
          <MenuButton />
        </div>
      )}
      
      {/* Chat Area - Full width */}
      <Paper className="h-full p-0 overflow-hidden flex flex-col">
        {selectedUser ? (
          <section className="flex flex-col h-full">
            {/* Chat Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-300 bg-white sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <Avatar
                  alt={selectedUser.username}
                  src={selectedUser.profilePicture}
                  sx={{ width: 40, height: 40 }}
                />
                <div className="flex flex-col">
                  <span className="font-semibold text-gray-800">
                    {selectedUser.username}
                  </span>
                  <span className="text-xs text-gray-500">Chatting now</span>
                </div>
              </div>
            </div>

            {/* Chat Messages */}
            <div 
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto px-2 py-4 space-y-2 scrollbar-thin scrollbar-thumb-gray-300"
            >
              <Messages selectedUser={selectedUser} />
              <div ref={messagesEndRef} />
            </div>

            {/* File Preview */}
            {selectedFile && (
              <div className="px-4 py-2 border-t border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {filePreview ? (
                      <div className="relative w-16 h-16">
                        <img 
                          src={filePreview} 
                          alt="Upload preview" 
                          className="w-16 h-16 object-cover rounded"
                        />
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 bg-gray-100 p-2 rounded">
                        <FileIcon size={20} />
                        <div className="flex flex-col">
                          <span className="text-sm truncate max-w-[200px]">{selectedFile.name}</span>
                          <span className="text-xs text-gray-500">{formatFileSize(selectedFile.size)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                  <IconButton size="small" onClick={handleCancelFile}>
                    <X size={18} />
                  </IconButton>
                </div>
              </div>
            )}

            {/* Message Input */}
            <div className="flex items-center gap-2 p-3 border-t border-gray-300 bg-white">
              {/* File upload button */}
              <input
                type="file"
                id="file-upload"
                className="hidden"
                onChange={handleFileChange}
                ref={fileInputRef}
              />
              <Tooltip title="Attach file">
                <IconButton 
                  color="primary" 
                  onClick={() => fileInputRef.current.click()}
                  disabled={isSending}
                >
                  <Paperclip size={20} />
                </IconButton>
              </Tooltip>
              
              <input
                value={textMessage}
                onChange={(e) => setTextMessage(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" && !e.shiftKey && sendMessageHandler(selectedUser?._id)
                }
                placeholder="Type a message..."
                className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Button
                variant="contained"
                color="primary"
                disabled={(!textMessage.trim() && !selectedFile) || isSending}
                onClick={() => sendMessageHandler(selectedUser?._id)}
                sx={{ minWidth: "80px" }}
              >
                {isSending ? (
                  <CircularProgress size={22} color="inherit" />
                ) : (
                  "Send"
                )}
              </Button>
            </div>
          </section>
        ) : (
          // No user selected UI
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-600 relative">
            <MessageCircleCode className="w-24 h-24 mb-4 text-blue-500" />
            <h1 className="text-xl font-bold">Your Messages</h1>
            <p className="text-sm">
              {isMobile 
                ? "Tap the menu icon to select a conversation" 
                : "No conversation selected"}
            </p>
          </div>
        )}
      </Paper>

      {/* Conversations Drawer - Only for mobile users */}
      {isMobile && (
        <Drawer
          anchor="bottom"
          open={drawerOpen}
          onClose={toggleDrawer}
          PaperProps={{
            sx: {
              width: '100%',
              height: '80vh',
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
            }
          }}
        >
          <div className="p-3 flex justify-between items-center border-b">
            <h2 className="text-lg font-semibold">Conversations</h2>
            <IconButton onClick={toggleDrawer}>
              <X size={20} />
            </IconButton>
          </div>
          <div className="overflow-auto h-full">
            <ConversationList onSelectConversation={handleConversationSelected} />
          </div>
        </Drawer>
      )}
    </div>
  );
};

export default ChatPage;
