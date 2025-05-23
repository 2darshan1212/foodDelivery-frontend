import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Box, CircularProgress, Paper, Typography, Button, Avatar, Divider } from '@mui/material';
import { ArrowLeft, Share2 } from 'lucide-react';
import PostCard from '../post/PostCard';

// API base URL from environment or default to localhost
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const SharedPost = () => {
  const { shareId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [share, setShare] = useState(null);
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useSelector((state) => state.auth);
  
  useEffect(() => {
    const fetchSharedPost = async () => {
      if (!shareId) {
        setError('Share ID is missing');
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        
        // Fetch share data
        const response = await axios.get(
          `${API_BASE_URL}/api/v1/share/${shareId}`,
          { withCredentials: true }
        );
        
        if (response.data.success) {
          setShare(response.data.share);
          setPost(response.data.share.post);
          
          // Update meta tags for better sharing experience
          if (response.data.share.post) {
            const postData = response.data.share.post;
            const title = `${postData.caption} | Food App`;
            const description = `${postData.category} dish${postData.vegetarian ? ' (Vegetarian)' : ''} shared by ${postData.author?.username || 'a user'}${postData.price ? ` - ₹${postData.price}` : ''}`;
            const image = postData.image;
            const url = window.location.href;
            
            // Use the global function defined in index.html
            if (window.updateMetaTags) {
              window.updateMetaTags(title, description, image, url);
            }
            
            // Also update document title
            document.title = title;
          }
          
          // Mark share as viewed if user is logged in
          if (user) {
            try {
              await axios.put(
                `${API_BASE_URL}/api/v1/share/${shareId}/view`,
                {},
                { withCredentials: true }
              );
            } catch (viewError) {
              console.error('Error marking share as viewed:', viewError);
              // Continue even if marking viewed fails
            }
          }
        } else {
          setError(response.data.message || 'Error fetching shared post');
        }
      } catch (err) {
        console.error('Error fetching shared post:', err);
        
        // Extract error message from response if available
        let errorMessage = 'Error fetching shared post';
        
        if (err.response) {
          errorMessage = err.response.data?.message || errorMessage;
          
          // If it's an expired share
          if (err.response.status === 410) {
            errorMessage = 'This shared post has expired';
          } 
          // If share not found
          else if (err.response.status === 404) {
            errorMessage = 'This shared post does not exist or has been removed';
          }
        } else if (err.request) {
          errorMessage = 'Unable to connect to server';
        }
        
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };
    
    fetchSharedPost();
    
    // Cleanup function to reset meta tags and title
    return () => {
      if (window.updateMetaTags) {
        window.updateMetaTags(
          'Social Food Delivery System', 
          'Discover and share delicious food from local vendors. Order, rate and connect with food lovers in your area!',
          '/og-image.jpg',
          window.location.origin
        );
      }
      document.title = 'Social Food Delivery System';
    };
  }, [shareId, user, dispatch]);
  
  // Handle user not logged in
  const handleLoginRedirect = () => {
    navigate('/login', { state: { from: location.pathname } });
  };
  
  return (
    <div className="max-w-4xl mx-auto py-6 px-4">
      <div className="flex items-center mb-6">
        <Button 
          startIcon={<ArrowLeft size={18} />}
          onClick={() => navigate(-1)}
          variant="text"
        >
          Go Back
        </Button>
        <h1 className="text-xl font-semibold ml-2">Shared Post</h1>
      </div>
      
      {loading ? (
        <Box className="flex justify-center py-8">
          <CircularProgress />
        </Box>
      ) : error ? (
        <Paper elevation={2} className="p-6 bg-red-50 text-red-600 rounded-md">
          <Typography variant="h6" gutterBottom>
            {error}
          </Typography>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={() => navigate('/')}
            className="mt-4"
          >
            Go to Homepage
          </Button>
        </Paper>
      ) : post ? (
        <>
          {/* Share information */}
          {share && (
            <Paper elevation={1} className="p-4 mb-4 rounded-lg">
              <div className="flex items-center gap-3">
                <Avatar 
                  src={share.sharedBy?.profilePicture} 
                  alt={share.sharedBy?.username} 
                />
                <div>
                  <Typography variant="subtitle1">
                    Shared by {share.sharedBy?.username}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    {new Date(share.createdAt).toLocaleDateString()} at {new Date(share.createdAt).toLocaleTimeString()}
                  </Typography>
                </div>
              </div>
              
              {share.message && (
                <Typography variant="body2" className="mt-3 p-3 bg-gray-50 rounded-lg">
                  {share.message}
                </Typography>
              )}
            </Paper>
          )}
          
          {/* Post content */}
          <PostCard post={post} />
          
          {/* Call to action for not logged in users */}
          {!user && (
            <Paper elevation={1} className="p-4 mt-4 bg-blue-50 rounded-lg">
              <Typography variant="subtitle1" gutterBottom>
                Like what you see?
              </Typography>
              <Typography variant="body2" className="mb-3">
                Log in to interact with this post and discover more delicious food!
              </Typography>
              <Button 
                variant="contained" 
                color="primary"
                onClick={handleLoginRedirect}
                startIcon={<Share2 size={16} />}
              >
                Log in to interact
              </Button>
            </Paper>
          )}
        </>
      ) : (
        <Paper elevation={2} className="p-6 rounded-md">
          <Typography variant="h6" gutterBottom>
            No post found
          </Typography>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={() => navigate('/')}
            className="mt-4"
          >
            Go to Homepage
          </Button>
        </Paper>
      )}
    </div>
  );
};

export default SharedPost; 