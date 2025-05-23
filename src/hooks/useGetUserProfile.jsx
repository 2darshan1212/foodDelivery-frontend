import { setSuggestedUsers, setUserProfile } from "@/redux/authSlice";

import axios from "axios";
import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { toast } from "react-hot-toast";

const useGetUserProfile = (userId) => {
  const dispatch = useDispatch();
  
  useEffect(() => {
    const fetchUserProfile = async () => {
      // Check if userId is valid before making the request
      if (!userId || userId === 'undefined' || userId === 'null') {
        console.error("Invalid user ID provided:", userId);
        toast.error("Unable to fetch user profile: Invalid user ID");
        return;
      }
      
      try {
        const res = await axios.get(
          `http://localhost:8000/api/v1/user/${userId}/profile`,
          {
            withCredentials: true,
          }
        );
        
        if (res.data.success) {
          console.log(res.data);
          dispatch(setUserProfile(res.data.user));
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
        toast.error(error.response?.data?.message || "Failed to load user profile");
      }
    };
    
    fetchUserProfile();
  }, [userId, dispatch]);
};

export default useGetUserProfile;
