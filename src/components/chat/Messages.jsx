import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { Avatar, Button } from "@mui/material";
import { Check, CheckCheck, FileText, Download } from "lucide-react";

import useGetAllMessage from "../../hooks/useGetAllMessage";
import useGetRTM from "../../hooks/useGetRTM";

const Messages = ({ selectedUser }) => {
  useGetRTM();
  const { messagesLoaded } = useGetAllMessage();
  const { messages } = useSelector((store) => store.chat);
  const { user } = useSelector((store) => store.auth);
  
  // Log when messages are loaded or changed
  useEffect(() => {
    if (messages && messages.length > 0) {
      console.log(`${messages.length} messages loaded for conversation`);
      
      // Force scrolling to the latest message after messages load
      const scrollEvent = new CustomEvent('chat-messages-loaded');
      window.dispatchEvent(scrollEvent);
    }
  }, [messages, messagesLoaded]);
  
  const formatTimestamp = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  // Function to render file attachments
  const renderFileAttachment = (msg) => {
    if (!msg.fileUrl) return null;
    
    if (msg.fileType === 'image') {
      return (
        <div className="mb-2">
          <img 
            src={msg.fileUrl} 
            alt="Image attachment" 
            className="max-w-full rounded-lg max-h-60 object-contain cursor-pointer"
            onClick={() => window.open(msg.fileUrl, '_blank')}
          />
        </div>
      );
    } else {
      return (
        <div className="flex items-center gap-2 mb-2 bg-gray-100 p-2 rounded">
          <FileText size={20} />
          <span className="text-sm truncate max-w-[150px]">{msg.fileName || 'File'}</span>
          <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer" className="ml-auto">
            <Download size={18} className="text-blue-600" />
          </a>
        </div>
      );
    }
  };
  
  return (
    <div className="overflow-y-auto h-[70vh] flex-1 p-4 ">
      <div className="flex justify-center mb-4">
        <div className="flex flex-col items-center justify-center">
          <span>{selectedUser?.username}</span>
          <Link to={`/profile/${selectedUser?._id}`}>
            <Button className="h-8 my-2" variant="secondary">
              View Profile
            </Button>
          </Link>
        </div>
      </div>
      
      <div className="flex flex-col gap-3">
        {messages && messages.length > 0 ? (
          messages.map((msg, index) => {
            const isCurrentUser = msg.senderId === user?._id;
            return (
              <div
                key={msg._id || index}
                className={`flex ${
                  isCurrentUser ? "justify-end" : "justify-start"
                }`}
              >
                <div className="flex flex-col">
                  <div
                    className={`flex flex-col ${
                      isCurrentUser
                        ? "bg-blue-500 text-white"
                        : "bg-gray-200 text-black"
                    } p-2 rounded-lg max-w-xs break-words`}
                  >
                    {renderFileAttachment(msg)}
                    {msg.message && <div>{msg.message}</div>}
                  </div>
                  
                  <div className="flex items-center mt-1 text-xs text-gray-500">
                    {msg.createdAt && (
                      <span className="mr-1">
                        {formatTimestamp(msg.createdAt)}
                      </span>
                    )}
                    
                    {isCurrentUser && (
                      <span className="flex items-center">
                        {msg.isRead ? (
                          <CheckCheck size={12} className="text-blue-500" />
                        ) : (
                          <Check size={12} />
                        )}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <p className="text-center text-gray-500">No messages yet. Start a conversation!</p>
        )}
      </div>
    </div>
  );
};

export default Messages;
