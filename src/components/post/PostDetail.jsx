import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import axios from 'axios';
import { toast } from 'react-toastify';
import { CircularProgress, Box, IconButton, Button, Divider, Paper, Rating, Typography, LinearProgress, Accordion, AccordionSummary, AccordionDetails, Alert } from '@mui/material';
import { ArrowLeft, MessageCircle, Heart, Star, Shield, ChevronDown } from 'lucide-react';
import PostCard from './PostCard';
import { setSelectedPost } from '../../redux/postSlice';
import CommentDialog from '../comment/CommentDialog';
import RecipeIPRegistration from '../story/RecipeIPRegistration';
import RecipeIPDetails from '../story/RecipeIPDetails';
import { useStoryProtocol } from '../../providers/StoryProtocolProvider';

// API base URL from environment or default to localhost
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const PostDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [commentDialogOpen, setCommentDialogOpen] = useState(false);
  const [ratings, setRatings] = useState(null);
  const [loadingRatings, setLoadingRatings] = useState(false);
  const [registrationComplete, setRegistrationComplete] = useState(false);
  const { user } = useSelector((store) => store.auth);
  const { isInitialized } = useStoryProtocol();
  
  // Check if post exists in Redux store
  const { posts } = useSelector((store) => store.post);
  const postInRedux = posts.find(p => p._id === id);

  console.log(`Post detail - ID: ${id}, Found in Redux: ${!!postInRedux}`);

  // If post is in Redux, use it immediately
  useEffect(() => {
    if (postInRedux) {
      console.log("Using post from Redux:", postInRedux);
      setPost(postInRedux);
      setLoading(false); // Set loading to false immediately
    }
  }, [postInRedux]);

  // Fetch post data from API regardless of Redux state
  useEffect(() => {
    const fetchPost = async () => {
      if (!id || id.trim() === '') {
        setError('Post ID is missing');
        toast.error('Post ID is missing');
        setLoading(false);
        return;
      }
      
      try {
        console.log(`Fetching post data for ID: ${id}`);
        setLoading(!post); // Only show loading if we don't have the post yet
        
        const response = await axios.get(
          `${API_BASE_URL}/api/v1/post/${id}`, 
          { withCredentials: true }
        );
        
        console.log("API response:", response.data);
        
        if (response.data.success) {
          if (response.data.post) {
            console.log('Post data structure:', response.data.post);
            console.log('User data:', user);
            setPost(response.data.post);
            // Update Redux with the latest post data
            dispatch(setSelectedPost(response.data.post));
          } else {
            setError('Post data is missing');
            toast.error('Post data is missing');
          }
        } else {
          setError(response.data.message || 'Post not found');
          toast.error(response.data.message || 'Post not found');
        }
      } catch (err) {
        console.error("Error fetching post:", err);
        // Extract error message from response if available
        let errorMessage = 'Error fetching post';
        
        if (err.response) {
          // The request was made and the server responded with an error status
          errorMessage = err.response.data?.message || errorMessage;
          console.log(`Server returned error status ${err.response.status}: ${errorMessage}`);
          
          // If it's a "Post not found" or "Invalid post ID" error, display a more user-friendly message
          if (err.response.status === 404 || 
             (err.response.status === 400 && errorMessage.includes('ID'))) {
            errorMessage = 'This post does not exist or has been removed';
          }
        } else if (err.request) {
          // The request was made but no response was received
          console.log('No response received from server');
          errorMessage = 'Unable to connect to server';
        }
        
        setError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchPost();
    } else {
      setError('Post ID is required');
      setLoading(false);
    }
    
    // Return cleanup function
    return () => {
      // Cleanup
    };
  }, [id, dispatch]);

  // Fetch ratings data
  useEffect(() => {
    const fetchRatings = async () => {
      if (!post || !id) return;
      
      setLoadingRatings(true);
      try {
        const response = await axios.get(
          `${API_BASE_URL}/api/v1/post/${id}/ratings`,
          { withCredentials: true }
        );
        
        if (response.data.success) {
          setRatings(response.data.ratings);
        }
      } catch (error) {
        console.error("Error fetching ratings:", error);
      } finally {
        setLoadingRatings(false);
      }
    };
    
    fetchRatings();
  }, [id, post]);

  const openComments = () => {
    if (post) {
      dispatch(setSelectedPost(post));
      setCommentDialogOpen(true);
    }
  };

  // Calculate percentage for star rating distribution
  const calculatePercentage = (count) => {
    if (!ratings || !ratings.count || ratings.count === 0) return 0;
    return Math.round((count / ratings.count) * 100);
  };

  // Render Rating Summary
  const renderRatingsSummary = () => {
    if (loadingRatings) {
      return (
        <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
          <CircularProgress size={24} />
        </Box>
      );
    }

    if (!ratings) {
      return (
        <Typography color="text.secondary" variant="body2" sx={{ py: 2, textAlign: "center" }}>
          No ratings information available
        </Typography>
      );
    }

    return (
      <Box>
        <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
          <Box sx={{ textAlign: "center", mr: 3 }}>
            <Typography variant="h3" component="div" sx={{ fontWeight: "bold", color: "primary.main" }}>
              {ratings.average ? ratings.average.toFixed(1) : "0.0"}
            </Typography>
            <Rating value={ratings.average || 0} precision={0.5} readOnly size="medium" />
            <Typography variant="body2" color="text.secondary">
              {ratings.count || 0} {ratings.count === 1 ? "rating" : "ratings"}
            </Typography>
          </Box>
          <Box sx={{ flexGrow: 1 }}>
            {[5, 4, 3, 2, 1].map((star) => (
              <Box key={star} sx={{ display: "flex", alignItems: "center", mb: 0.5 }}>
                <Typography variant="body2" sx={{ minWidth: "20px", mr: 1 }}>
                  {star}
                </Typography>
                <Box sx={{ width: "100%", mr: 1 }}>
                  <LinearProgress
                    variant="determinate"
                    value={calculatePercentage(ratings.distribution?.[star] || 0)}
                    sx={{ 
                      height: 8, 
                      borderRadius: 1,
                      backgroundColor: 'grey.300',
                      '& .MuiLinearProgress-bar': {
                        backgroundColor: star > 3 ? 'success.main' : star > 1 ? 'warning.main' : 'error.main',
                      }
                    }}
                  />
                </Box>
                <Typography variant="body2" sx={{ minWidth: "35px" }}>
                  {calculatePercentage(ratings.distribution?.[star] || 0)}%
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>

        {ratings.userRating && (
          <Box sx={{ mt: 2, p: 2, bgcolor: "primary.50", borderRadius: 1 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Your Rating
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <Rating value={ratings.userRating.value} readOnly size="small" />
              <Typography variant="body2" sx={{ ml: 1 }}>
                {new Date(ratings.userRating.createdAt).toLocaleDateString()}
              </Typography>
            </Box>
            {ratings.userRating.comment && (
              <Typography variant="body2" sx={{ mt: 1, fontStyle: "italic" }}>
                "{ratings.userRating.comment}"
              </Typography>
            )}
          </Box>
        )}
      </Box>
    );
  };

  // Debug render state
  console.log("Render state:", { loading, error, hasPost: !!post });

  return (
    <div className="max-w-4xl mx-auto py-6 px-4">
      <div className="flex items-center mb-6">
        <IconButton onClick={() => navigate(-1)}>
          <ArrowLeft />
        </IconButton>
        <h1 className="text-xl font-semibold ml-2">Post Details</h1>
      </div>
      
      {loading ? (
        <Box className="flex justify-center py-8">
          <CircularProgress />
        </Box>
      ) : error && !post ? (
        <div className="p-4 bg-red-50 text-red-600 rounded-md">
          {error}
          <Button 
            variant="text" 
            color="primary" 
            onClick={() => navigate(-1)}
            className="mt-2"
          >
            Go Back
          </Button>
        </div>
      ) : post ? (
        <>
          <PostCard post={post} />
          
          {/* Ratings Summary Section */}
          <Paper elevation={1} sx={{ p: 3, mt: 3, borderRadius: 2 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
              <Typography variant="h6" component="h2" sx={{ display: "flex", alignItems: "center" }}>
                <Star size={20} className="mr-2" /> Ratings & Reviews
              </Typography>
              <Button 
                variant="contained" 
                color="primary" 
                size="small"
                onClick={() => document.querySelector(`button[data-post-id="${post._id}"]`)?.click()}
              >
                {ratings?.userRating ? "Update Your Rating" : "Rate This Food"}
              </Button>
            </Box>
            <Divider sx={{ mb: 2 }} />
            {renderRatingsSummary()}
          </Paper>
          
          {/* Intellectual Property (IP) Section */}
          {user && (
            <Paper elevation={1} sx={{ p: 3, mt: 3, borderRadius: 2 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                <Typography variant="h6" component="h2" sx={{ display: "flex", alignItems: "center" }}>
                  <Shield size={20} className="mr-2" /> Intellectual Property Rights
                </Typography>
                
                {/* Show registration button for post owners */}
                {post.author?._id === user?._id && !registrationComplete && !post.ipRegistered && (
                  <RecipeIPRegistration 
                    recipeData={{
                      id: post._id,
                      title: post.caption,
                      description: post.caption,
                      image: post.image,
                      category: post.category || 'Recipe',
                      chef: post.author?.username,
                      prepTime: post.preparationTime || '30 mins',
                      cuisine: post.cuisine || 'International'
                    }}
                    onRegistrationComplete={() => setRegistrationComplete(true)}
                  />
                )}
              </Box>
              
              <Divider sx={{ mb: 2 }} />
              
              {post.ipRegistered || registrationComplete ? (
                <Accordion defaultExpanded>
                  <AccordionSummary expandIcon={<ChevronDown />}>
                    <Typography variant="subtitle1">
                      Recipe IP Information
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <RecipeIPDetails recipeId={post._id} />
                  </AccordionDetails>
                </Accordion>
              ) : (
                <Box>
                  {post.author?._id === user?._id ? (
                    <Alert severity="info" sx={{ mb: 2 }}>
                      You can register this recipe as intellectual property to protect your creation.
                      Complete the registration to establish ownership and set licensing terms.
                    </Alert>
                  ) : (
                    <Alert severity="info" sx={{ mb: 2 }}>
                      This recipe has not been registered for intellectual property protection yet.
                    </Alert>
                  )}
                  
                  <Box sx={{ mt: 3 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      What is IP protection for recipes?
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Registering a recipe with Story Protocol establishes ownership rights and allows
                      creators to set licensing terms for commercial use, derivatives, and attribution
                      requirements. This can help protect unique recipe creations and potentially earn
                      royalties when others use them commercially.
                    </Typography>
                  </Box>
                </Box>
              )}
            </Paper>
          )}

          {/* Extra interaction section */}
          <div className="bg-white rounded-xl shadow-lg p-4 mt-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Engagement</h2>
              <div className="flex gap-2">
                <Button 
                  variant="outlined" 
                  startIcon={<Heart size={16} />}
                  color="error"
                >
                  {post.likes?.length || 0} Likes
                </Button>
                <Button 
                  variant="outlined" 
                  startIcon={<MessageCircle size={16} />}
                  onClick={openComments}
                  color="primary"
                >
                  {post.comments?.length || 0} Comments
                </Button>
              </div>
            </div>
            
            <Divider className="my-3" />
            
            <div className="mt-4">
              <h3 className="font-medium mb-2">Recent Activity</h3>
              {post.likes && post.likes.length > 0 ? (
                <p>
                  Liked by {post.likes.length} {post.likes.length === 1 ? 'person' : 'people'}
                </p>
              ) : (
                <p className="text-gray-500">No likes yet</p>
              )}
              
              {post.comments && post.comments.length > 0 ? (
                <div className="mt-2">
                  <p className="cursor-pointer text-blue-500 hover:underline" onClick={openComments}>
                    View all {post.comments.length} comments
                  </p>
                </div>
              ) : (
                <p className="text-gray-500 mt-2">No comments yet</p>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="p-4 bg-gray-100 rounded-md">
          Post not found
        </div>
      )}

      <CommentDialog
        open={commentDialogOpen}
        setOpen={setCommentDialogOpen}
        post={post}
      />
    </div>
  );
};

export default PostDetail; 