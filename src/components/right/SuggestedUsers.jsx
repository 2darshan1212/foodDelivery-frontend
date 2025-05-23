import React, { useState, useEffect } from "react";
import { Avatar, Tooltip, CircularProgress } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { followOrUnfollow, getUserStats } from "../../redux/userSlice";
import { toast } from "react-toastify";

const SuggestedUsers = () => {
  const { suggestedUsers } = useSelector((store) => store.auth);
  const { followings, loading, error, lastAction, userStats = {} } = useSelector((state) => state.user);
  const dispatch = useDispatch();
  const navigate=useNavigate();
  const [processingUserId, setProcessingUserId] = useState(null);
  const [showAll, setShowAll] = useState(false);

  // Fetch stats for all users when component mounts
  useEffect(() => {
    if (suggestedUsers && suggestedUsers.length > 0) {
      suggestedUsers.forEach(user => {
        if (user && user._id) {
          dispatch(getUserStats(user._id));
        }
      });
    }
  }, [suggestedUsers, dispatch]);

  // Handle error message 
  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  // Success feedback after follow/unfollow action
  useEffect(() => {
    if (lastAction && lastAction.timestamp) {
      // Check if this is a recent action (within the last 2 seconds)
      const isRecent = Date.now() - lastAction.timestamp < 2000;
      
      if (isRecent && lastAction.userId) {
        const targetUserId = lastAction.userId;
        const targetUser = suggestedUsers?.find(user => user?._id === targetUserId);
        
        if (targetUser) {
          // Re-fetch user stats after follow/unfollow
          dispatch(getUserStats(targetUserId));
        }
      }
    }
  }, [lastAction, suggestedUsers, dispatch]);

  const handleFollowClick = async (userId) => {
    if (!userId) return;
    
    try {
      setProcessingUserId(userId);
      await dispatch(followOrUnfollow(userId)).unwrap();
      
      // Success handling is done in the effect above
    } catch (error) {
      console.error("Follow action failed:", error);
      // Error handling is done in the effect above
    } finally {
      setProcessingUserId(null);
    }
  };

  // Safety check in case suggestedUsers is undefined
  const usersToShow = suggestedUsers ? 
    (showAll ? suggestedUsers : suggestedUsers.slice(0, 4)) : 
    [];

  return (
    <div>
      <div className="flex items-center justify-between mb-3 ">
        <h2 className="font-semibold text-sm text-gray-700">
          Suggested for you
        </h2>
        {suggestedUsers && !showAll && suggestedUsers.length > 4 && (
          <button
            onClick={() => setShowAll(true)}
            className="text-blue-500 text-xs font-medium hover:underline"
          >
            View All
          </button>
        )}
      </div>

      <div className="space-y-2">
        {usersToShow.map((user) => {
          if (!user || !user._id) return null;
          
          const isFollowing = followings?.includes(user._id);
          const isProcessing = processingUserId === user._id;
          const stats = userStats && userStats[user._id];

          return (
            <div
              key={user._id}
              
              className="flex items-center justify-between p-1 hover:bg-gray-50 rounded-md transition"
            >
              <div className="flex items-center gap-3" >
                <Link to={`/profile/${user._id}`}>
                  <Avatar
                    alt={user.username}
                    src={user.profilePicture}
                    className="w-9 h-9"
                  />
                </Link>
                <div className="text-sm">
                  <>
                    <p className="font-medium text-gray-800">{user.username}</p>
                  </>
                  <p className="text-xs text-gray-500 truncate w-36">
                    {user.bio || "No bio"}
                  </p>
                  
                  {stats && (
                    <p className="text-xs text-gray-500 mt-1">
                      <span className="font-medium">{stats.followerCount}</span> followers
                    </p>
                  )}
                </div>
              </div>
              
              <Tooltip title={isFollowing ? "Unfollow" : "Follow"}>
                <p
                  onClick={() => handleFollowClick(user._id)}
                  disabled={isProcessing || loading}
                  className={`px-4 py-2 cursor-pointer mr-1 rounded-sm mx-[-2rem] text-sm font-medium transition duration-200 ${
                    isProcessing 
                      ? "bg-gray-200 text-gray-500"
                      : isFollowing
                      ? "bg-gray-300 text-black hover:bg-gray-400"
                      : "bg-blue-600 text-white hover:bg-blue-700"
                  }`}
                >
                  {isProcessing ? (
                    <CircularProgress size={16} color="inherit" />
                  ) : isFollowing ? (
                    "Unfollow"
                  ) : (
                    "Follow"
                  )}
                </p>
              </Tooltip>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SuggestedUsers;
