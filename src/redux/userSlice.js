// src/redux/features/userSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

export const fetchCurrentUserFollowings = createAsyncThunk(
  "user/fetchCurrentUserFollowings",
  async (_, { rejectWithValue }) => {
    try {
      const res = await axios.get(
        "http://localhost:8000/api/v1/user/followings",
        {
          withCredentials: true,
        }
      );
      return res.data.followings;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to fetch followings"
      );
    }
  }
);

export const followOrUnfollow = createAsyncThunk(
  "user/followOrUnfollow",
  async (targetUserId, { rejectWithValue }) => {
    try {
      const res = await axios.post(
        `http://localhost:8000/api/v1/user/followorunfollow/${targetUserId}`,
        {},
        { withCredentials: true }
      );
      
      // Return complete response data for more flexible state updates
      return { 
        userId: targetUserId, 
        message: res.data.message,
        isFollowing: res.data.isFollowing,
        follower: res.data.follower,
        targetUser: res.data.targetUser
      };
    } catch (err) {
      // Enhanced error handling
      console.error("Follow/unfollow error:", err);
      return rejectWithValue({
        message: err.response?.data?.message || "Failed to follow/unfollow user",
        status: err.response?.status || 500
      });
    }
  }
);

// Get profile statistics for a user (followers/followings count)
export const getUserStats = createAsyncThunk(
  "user/getUserStats",
  async (userId, { rejectWithValue }) => {
    try {
      const res = await axios.get(
        `http://localhost:8000/api/v1/user/stats/${userId}`,
        { withCredentials: true }
      );
      return res.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to fetch user statistics"
      );
    }
  }
);

const userSlice = createSlice({
  name: "user",
  initialState: {
    followings: [], // stores user IDs
    loading: false,
    error: null,
    message: null,
    lastAction: null,
    userStats: {}, // Will store counts for different users
  },
  reducers: {
    setFollowing: (state, action) => {
      state.followings = action.payload;
    },
    clearMessage: (state) => {
      state.message = null;
    },
    clearError: (state) => {
      state.error = null;
    },
    setLastAction: (state, action) => {
      state.lastAction = action.payload;
    }
  },
  extraReducers: (builder) => {
    builder
      // fetchCurrentUserFollowings cases
      .addCase(fetchCurrentUserFollowings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCurrentUserFollowings.fulfilled, (state, action) => {
        state.followings = action.payload;
        state.loading = false;
      })
      .addCase(fetchCurrentUserFollowings.rejected, (state, action) => {
        state.error = action.payload;
        state.loading = false;
      })
      
      // followOrUnfollow cases
      .addCase(followOrUnfollow.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(followOrUnfollow.fulfilled, (state, action) => {
        const { userId, message, isFollowing } = action.payload;
        
        // Update followings list based on the isFollowing status
        if (isFollowing) {
          // Add to followings if not already there
          if (!state.followings.includes(userId)) {
            state.followings.push(userId);
          }
        } else {
          // Remove from followings
          state.followings = state.followings.filter(id => id !== userId);
        }
        
        state.message = message;
        state.loading = false;
        state.lastAction = {
          type: isFollowing ? 'follow' : 'unfollow',
          userId,
          timestamp: Date.now()
        };
      })
      .addCase(followOrUnfollow.rejected, (state, action) => {
        state.error = action.payload.message;
        state.loading = false;
      })
      
      // getUserStats cases
      .addCase(getUserStats.pending, (state) => {
        state.loading = true;
      })
      .addCase(getUserStats.fulfilled, (state, action) => {
        const { userId, followerCount, followingCount } = action.payload;
        // Make sure userStats is initialized
        if (!state.userStats) {
          state.userStats = {};
        }
        // Only update if we have valid data
        if (userId) {
          state.userStats[userId] = { 
            followerCount: followerCount || 0, 
            followingCount: followingCount || 0 
          };
        }
        state.loading = false;
      })
      .addCase(getUserStats.rejected, (state) => {
        state.loading = false;
      });
  },
});

export const { setFollowing, clearMessage, clearError, setLastAction } = userSlice.actions;
export default userSlice.reducer;
