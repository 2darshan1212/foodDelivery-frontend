import React, { useState, useEffect } from 'react';
import { Box, Paper, Typography, Avatar, Skeleton, Fade, Grow, IconButton } from '@mui/material';
import { Twitter, Facebook, MessageSquare, Send, ExternalLink, Check, X, AlertCircle } from 'lucide-react';

const SharePreview = ({ platform, post, message, user, shareLink, onClose }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [animateIn, setAnimateIn] = useState(false);
  const [imageError, setImageError] = useState(false);
  
  // Load preview with animation effect
  useEffect(() => {
    if (platform) {
      setIsLoading(true);
      setImageError(false);
      const timer = setTimeout(() => {
        setIsLoading(false);
        setAnimateIn(true);
      }, 500);
      
      return () => {
        clearTimeout(timer);
        setAnimateIn(false);
      };
    }
  }, [platform]);
  
  // Handle close/clear preview
  const handleClearPreview = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (onClose) {
      onClose();
    }
  };
  
  // Handle image error
  const handleImageError = () => {
    setImageError(true);
  };
  
  // Helper function to truncate text
  const truncateText = (text, length) => {
    if (!text) return '';
    return text.length > length ? text.substring(0, length) + '...' : text;
  };
  
  // Format URL for display
  const formatUrl = (url) => {
    if (!url) return 'foodapp.com';
    try {
      const urlObj = new URL(url);
      return urlObj.hostname || 'foodapp.com';
    } catch (e) {
      return 'foodapp.com';
    }
  };
  
  // Get meta information for the post
  const getMetaInfo = () => {
    if (!post) return 'Food Item';
    
    let categoryInfo = post.category || 'Food';
    const priceInfo = post.price ? `₹${post.price}` : '';
    const ratingInfo = post.rating?.average ? `${post.rating.average.toFixed(1)} ★` : '';
    
    // Format vegetarian status
    if (post.vegetarian) {
      categoryInfo += ' • Vegetarian';
    }
    
    // Format spicy level
    if (post.spicyLevel && post.spicyLevel !== 'none') {
      const spicyEmoji = post.spicyLevel === 'hot' ? '🔥' : 
                         post.spicyLevel === 'medium' ? '🌶️' : '•';
      categoryInfo += ` • ${spicyEmoji} ${post.spicyLevel.charAt(0).toUpperCase() + post.spicyLevel.slice(1)}`;
    }
    
    return [categoryInfo, priceInfo, ratingInfo].filter(Boolean).join(' • ');
  };
  
  // Loading state component
  const renderLoading = () => (
    <Paper className="p-4 rounded-lg border border-gray-200">
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Skeleton variant="circular" width={40} height={40} />
          <Box sx={{ flex: 1 }}>
            <Skeleton variant="text" width="60%" height={24} />
            <Skeleton variant="text" width="40%" height={18} />
          </Box>
        </Box>
        <Skeleton variant="rectangular" height={200} />
        <Box>
          <Skeleton variant="text" width="80%" height={20} />
          <Skeleton variant="text" width="60%" height={20} />
        </Box>
      </Box>
    </Paper>
  );

  // Fallback image component
  const renderFallbackImage = () => (
    <div className="bg-gray-100 h-full w-full flex flex-col justify-center items-center">
      <AlertCircle size={24} className="text-gray-400 mb-2" />
      <Typography variant="caption" className="text-gray-500">
        Image not available
      </Typography>
    </div>
  );

  // Image component with error handling
  const renderPostImage = () => (
    <div className="bg-gray-100 h-full w-full flex justify-center items-center">
      {imageError || !post?.image ? (
        renderFallbackImage()
      ) : (
        <img 
          src={post.image} 
          alt={post?.caption || 'Food post'} 
          className="h-full w-full object-cover"
          onError={handleImageError}
        />
      )}
    </div>
  );

  // Render different preview based on the platform
  const renderPreview = () => {
    if (!platform) {
      return (
        <Paper className="p-8 rounded-lg border border-gray-200 bg-white shadow-sm">
          <Box className="text-center py-4">
            <Typography variant="subtitle1">Select a platform to see preview</Typography>
            <Typography variant="body2" color="textSecondary" className="mt-2">
              Choose a sharing platform from the options to see how your post will look when shared.
            </Typography>
          </Box>
        </Paper>
      );
    }
    
    if (!post) {
      return (
        <Paper className="p-8 rounded-lg border border-gray-200 bg-white shadow-sm">
          <Box className="text-center py-4">
            <AlertCircle size={24} className="text-gray-400 mx-auto mb-2" />
            <Typography variant="subtitle1">Post data not available</Typography>
            <Typography variant="body2" color="textSecondary" className="mt-2">
              The post data is missing or cannot be loaded.
            </Typography>
          </Box>
        </Paper>
      );
    }
    
    switch (platform) {
      case 'twitter':
        return (
          <Grow in={animateIn} timeout={500}>
            <Paper className="p-4 rounded-lg border border-gray-200 bg-white shadow-sm">
              <div className="flex items-start gap-3">
                <Avatar src={user?.profilePicture} alt={user?.username} sx={{ width: 40, height: 40 }}>
                  {user?.username?.charAt(0) || 'U'}
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center">
                    <Typography variant="subtitle2" className="font-bold">{user?.username || 'User'}</Typography>
                    <Typography variant="caption" className="ml-2 text-gray-500">@{user?.username?.toLowerCase().replace(/\s/g, '') || 'user'}</Typography>
                  </div>
                  <Typography variant="body2" className="mt-1 mb-3">
                    {message || `Check out this delicious food post: ${truncateText(post?.caption, 80)}`}
                  </Typography>
                  <Paper className="rounded-lg overflow-hidden border border-gray-200">
                    <div className="h-40 flex justify-center items-center">
                      {renderPostImage()}
                    </div>
                    <Box className="p-3">
                      <Typography variant="caption" className="text-gray-500">{formatUrl(shareLink)}</Typography>
                      <Typography variant="body2" className="font-medium">{truncateText(post?.caption, 60)}</Typography>
                      <Typography variant="caption" className="text-gray-500 block mt-1">
                        {getMetaInfo()}
                      </Typography>
                    </Box>
                  </Paper>
                  <div className="flex items-center gap-6 mt-3 text-gray-500">
                    <div className="flex items-center gap-1">
                      <MessageSquare size={16} />
                      <Typography variant="caption">5</Typography>
                    </div>
                    <div className="flex items-center gap-1">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M7 13l3-3 3 3" />
                        <path d="M10 10v8" />
                        <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <Typography variant="caption">12</Typography>
                    </div>
                    <div className="flex items-center gap-1">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
                      </svg>
                      <Typography variant="caption">24</Typography>
                    </div>
                  </div>
                </div>
              </div>
            </Paper>
          </Grow>
        );
      
      case 'facebook':
        return (
          <Grow in={animateIn} timeout={500}>
            <Paper className="p-4 rounded-lg border border-gray-200 bg-white shadow-sm">
              <div className="flex items-start gap-3">
                <Avatar src={user?.profilePicture} alt={user?.username} sx={{ width: 40, height: 40 }} />
                <div className="flex-1">
                  <Typography variant="subtitle2" className="font-bold">{user?.username}</Typography>
                  <Typography variant="caption" className="text-gray-500">Just now · <span className="text-blue-500">Public</span></Typography>
                  <Typography variant="body2" className="mt-2 mb-3">
                    {message || `Check out this delicious food post!`}
                  </Typography>
                  <Paper className="rounded-lg overflow-hidden border border-gray-200">
                    <div className="bg-gray-100 h-52 flex justify-center items-center">
                      <img 
                        src={post?.image} 
                        alt={post?.caption} 
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <Box className="p-3">
                      <Typography variant="caption" className="text-gray-500 uppercase">
                        {formatUrl(shareLink)}
                      </Typography>
                      <Typography variant="body2" className="font-medium">{truncateText(post?.caption, 80)}</Typography>
                      <Typography variant="caption" className="text-gray-500 block mt-1">
                        {getMetaInfo()}
                      </Typography>
                    </Box>
                  </Paper>
                  <div className="flex justify-between mt-3 text-gray-500">
                    <div className="flex items-center gap-1">
                      <span className="bg-blue-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs">👍</span>
                      <Typography variant="caption">12</Typography>
                    </div>
                    <Typography variant="caption">5 comments</Typography>
                  </div>
                  <div className="flex justify-between mt-2 pt-2 border-t border-gray-100">
                    <div className="flex items-center gap-1 text-gray-500">
                      <span>👍</span>
                      <Typography variant="body2">Like</Typography>
                    </div>
                    <div className="flex items-center gap-1 text-gray-500">
                      <MessageSquare size={16} />
                      <Typography variant="body2">Comment</Typography>
                    </div>
                    <div className="flex items-center gap-1 text-gray-500">
                      <Send size={16} />
                      <Typography variant="body2">Share</Typography>
                    </div>
                  </div>
                </div>
              </div>
            </Paper>
          </Grow>
        );
      
      case 'whatsapp':
        return (
          <Grow in={animateIn} timeout={500}>
            <Paper className="p-4 rounded-lg border border-gray-200 bg-[#e5ddd5] shadow-sm">
              <div className="bg-[#DCF8C6] p-3 rounded-lg max-w-xs ml-auto relative">
                <div className="absolute top-0 right-0 w-0 h-0 transform translate-x-0 -translate-y-0 border-8 border-transparent border-r-[#DCF8C6] border-b-[#DCF8C6] rotate-90"></div>
                <div className="flex flex-col">
                  <Typography variant="body2" className="font-medium text-[#075E54]">You</Typography>
                  <Typography variant="body2" className="mb-2">
                    {message || `Check out this delicious food post!`}
                  </Typography>
                  <div className="rounded-md overflow-hidden">
                    <img 
                      src={post?.image} 
                      alt={post?.caption} 
                      className="h-32 w-full object-cover"
                    />
                  </div>
                  <div className="bg-white p-2 mt-1 rounded-md">
                    <Typography variant="caption" className="text-[#128C7E] block font-medium">{truncateText(post?.caption, 50)}</Typography>
                    <Typography variant="caption" className="text-gray-500 block mt-1">
                      {getMetaInfo()}
                    </Typography>
                    <Typography variant="caption" className="text-blue-500 block mt-1 flex items-center">
                      <ExternalLink size={12} className="mr-1" />
                      {formatUrl(shareLink)}
                    </Typography>
                  </div>
                  <Typography variant="caption" className="text-gray-600 text-right mt-1 flex items-center justify-end">
                    {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} 
                    <Check size={16} className="ml-1 text-[#34B7F1]" />
                    <Check size={16} className="-ml-1 text-[#34B7F1]" />
                  </Typography>
                </div>
              </div>
            </Paper>
          </Grow>
        );
      
      case 'telegram':
        return (
          <Grow in={animateIn} timeout={500}>
            <Paper className="p-4 rounded-lg border border-gray-200 bg-[#efece8] shadow-sm">
              <div className="bg-white p-3 rounded-lg max-w-xs ml-auto">
                <div className="flex flex-col">
                  <Typography variant="body2" className="mb-2">
                    {message || `Check out this delicious food post!`}
                  </Typography>
                  <div className="rounded-md overflow-hidden">
                    <img 
                      src={post?.image} 
                      alt={post?.caption} 
                      className="h-32 w-full object-cover"
                    />
                  </div>
                  <div className="bg-[#f5f5f5] p-2 mt-1 rounded-md">
                    <Typography variant="caption" className="text-[#0088cc] block font-medium">{truncateText(post?.caption, 60)}</Typography>
                    <Typography variant="caption" className="text-gray-500 block mt-1">
                      {getMetaInfo()}
                    </Typography>
                    <Typography variant="caption" className="text-gray-400 block mt-1">
                      {formatUrl(shareLink)}
                    </Typography>
                  </div>
                  <Typography variant="caption" className="text-gray-400 text-right mt-1 flex items-center justify-end">
                    {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} 
                    <Check size={14} className="ml-1 text-[#0088cc]" />
                  </Typography>
                </div>
              </div>
            </Paper>
          </Grow>
        );
        
      case 'email':
        return (
          <Grow in={animateIn} timeout={500}>
            <Paper className="p-4 rounded-lg border border-gray-200 bg-white shadow-sm">
              <div className="border border-gray-200 rounded-lg p-3">
                <div className="flex justify-between mb-3">
                  <div>
                    <Typography variant="body2"><strong>From:</strong> {user?.username} &lt;{user?.username?.toLowerCase().replace(/\s/g, '')}@email.com&gt;</Typography>
                    <Typography variant="body2"><strong>To:</strong> recipient@email.com</Typography>
                    <Typography variant="body2"><strong>Subject:</strong> Shared Food Post: {truncateText(post?.caption, 40)}</Typography>
                  </div>
                </div>
                <div className="border-t border-gray-200 pt-3">
                  <Typography variant="body2" className="mb-3">
                    {message || 'Check out this delicious food post!'}
                  </Typography>
                  <div className="border border-gray-200 rounded-md overflow-hidden">
                    <img 
                      src={post?.image} 
                      alt={post?.caption} 
                      className="h-40 w-full object-cover"
                    />
                    <div className="p-3 bg-gray-50">
                      <Typography variant="body2" className="font-medium">{post?.caption}</Typography>
                      <Typography variant="body2" className="text-gray-500 mt-1">
                        {getMetaInfo()}
                      </Typography>
                      <Typography variant="body2" className="text-blue-500 mt-2">
                        View this post: {shareLink || `https://foodapp.com/posts/${post?._id}`}
                      </Typography>
                    </div>
                  </div>
                  <div className="mt-3 text-xs text-gray-400 pt-2 border-t border-gray-100">
                    <p>This email was sent via Food App.</p>
                  </div>
                </div>
              </div>
            </Paper>
          </Grow>
        );
        
      default:
        return (
          <Paper className="p-8 rounded-lg border border-gray-200 bg-white shadow-sm">
            <Box className="text-center py-4">
              <Typography variant="subtitle1">Select a platform to see preview</Typography>
              <Typography variant="body2" color="textSecondary" className="mt-2">
                Choose a sharing platform from the options to see how your post will look when shared.
              </Typography>
            </Box>
          </Paper>
        );
    }
  };

  return (
    <div className="share-preview relative">
      <div className="flex justify-between items-center mb-2">
        <Typography variant="subtitle2" className="font-medium">
          {platform ? `Preview on ${platform.charAt(0).toUpperCase() + platform.slice(1)}` : 'Preview'}
        </Typography>
        {platform && (
          <IconButton 
            size="small" 
            onClick={handleClearPreview}
            className="text-gray-500 hover:text-gray-700"
            aria-label="Clear preview"
          >
            <X size={16} />
          </IconButton>
        )}
      </div>
      {isLoading && platform ? renderLoading() : renderPreview()}
    </div>
  );
};

export default SharePreview; 