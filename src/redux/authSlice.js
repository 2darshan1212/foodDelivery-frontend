import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

// API base URL from environment or default to localhost
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

// Create a thunk to sync bookmarks with the backend
export const syncUserBookmarks = createAsyncThunk(
  "auth/syncUserBookmarks",
  async (_, { getState, rejectWithValue, dispatch }) => {
    try {
      const { user } = getState().auth;
      
      if (!user || !user._id) {
        return rejectWithValue("User not authenticated");
      }
      
      console.log("Fetching bookmarks for user:", user._id);
      
      // First try: dedicated endpoint to get current user profile with bookmarks
      try {
        const response = await axios.get(`${API_BASE_URL}/api/v1/user/profile`, {
          withCredentials: true,
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (response.data.success && response.data.user && response.data.user.bookmarks) {
          console.log("Successfully fetched user bookmarks:", response.data.user.bookmarks);
          return response.data.user.bookmarks;
        }
      } catch (profileError) {
        console.warn("Profile endpoint failed, trying bookmarked posts endpoint:", profileError.message);
      }
      
      // Second try: use bookmarked posts endpoint
      try {
        const postsResponse = await axios.get(`${API_BASE_URL}/api/v1/post/bookmarked`, {
          withCredentials: true,
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (postsResponse.data.success && Array.isArray(postsResponse.data.posts)) {
          // Extract post IDs from the response
          const bookmarkIds = postsResponse.data.posts.map(post => post._id);
          console.log("Successfully fetched bookmarked posts:", bookmarkIds);
          return bookmarkIds;
        }
      } catch (postsError) {
        console.warn("Bookmarked posts endpoint failed:", postsError.message);
      }
      
      // If both attempts fail, return current bookmarks (don't update but don't fail)
      console.warn("All bookmark sync attempts failed, keeping current state");
      return user.bookmarks || [];
    } catch (error) {
      console.error("Error syncing bookmarks:", error);
      return rejectWithValue(error?.response?.data?.message || error.message || "Error syncing bookmarks");
    }
  }
);

const authSlice = createSlice({
  name: "auth",
  initialState: {
    user: null,
    suggestedUsers: [],
    userProfile: null,
    selectedUser: null,
    shorts: null,
    bookmarksLoading: false,
    bookmarksError: null,
    lastBookmarkUpdate: null,
  },
  reducers: {
    setAuthUser: (state, action) => {
      state.user = action.payload;
    },
    setSuggestedUsers: (state, action) => {
      state.suggestedUsers = action.payload;
    },
    setUserProfile: (state, action) => {
      state.userProfile = action.payload;
    },
    setUserShorts: (state, action) => {
      state.shorts = action.payload;
    },
    setSelectedUser: (state, action) => {
      state.selectedUser = action.payload;
    },
    updateBookmarks: (state, action) => {
      if (state.user) {
        const postId = action.payload;
        console.log(`Updating bookmarks for post: ${postId}`);
        
        // Ensure bookmarks is initialized as an array
        if (!state.user.bookmarks || !Array.isArray(state.user.bookmarks)) {
          state.user.bookmarks = [];
        }
        
        const isCurrentlyBookmarked = state.user.bookmarks.includes(postId);
        
        if (isCurrentlyBookmarked) {
          // Remove from bookmarks
          console.log(`Removing bookmark for post: ${postId}`);
          state.user.bookmarks = state.user.bookmarks.filter(id => id !== postId);
        } else {
          // Add to bookmarks
          console.log(`Adding bookmark for post: ${postId}`);
          state.user.bookmarks.push(postId);
        }
        
        // Record the timestamp of the last update
        state.lastBookmarkUpdate = Date.now();
        
        // Log updated bookmarks
        console.log("Updated bookmarks:", state.user.bookmarks);
      } else {
        console.warn("Cannot update bookmarks: No authenticated user");
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(syncUserBookmarks.pending, (state) => {
        state.bookmarksLoading = true;
        state.bookmarksError = null;
      })
      .addCase(syncUserBookmarks.fulfilled, (state, action) => {
        state.bookmarksLoading = false;
        if (state.user) {
          // Only update if we got a valid array
          if (Array.isArray(action.payload)) {
            state.user.bookmarks = action.payload;
            state.lastBookmarkSync = Date.now();
          } else {
            console.warn("Received non-array bookmarks data:", action.payload);
          }
        } else {
          console.warn("Cannot update bookmarks: user state is null");
        }
      })
      .addCase(syncUserBookmarks.rejected, (state, action) => {
        state.bookmarksLoading = false;
        state.bookmarksError = action.payload;
        console.error("Bookmark sync rejected:", action.payload);
      });
  },
});

export default authSlice.reducer;
export const {
  setAuthUser,
  setSuggestedUsers,
  setUserProfile,
  setUserShorts,
  setSelectedUser,
  updateBookmarks,
} = authSlice.actions;
