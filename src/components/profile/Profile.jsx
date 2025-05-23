import React, { useState, useEffect } from "react";
import Header from "../header/Header";
import Leftsidebar from "../left/Leftsidebar";
import ProfilePage from "./ProfilePage";
import useGetUserProfile from "./../../hooks/useGetUserProfile";
import { useParams } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import axios from "axios";
import { toast } from "react-toastify";
import { setAuthUser } from "../../redux/authSlice";

const Profile = () => {
  const params = useParams();
  const userId = params.id;
  useGetUserProfile(userId);
  const { userProfile } = useSelector((store) => store.auth);
  const [location, setLocation] = useState({ longitude: 0, latitude: 0 });
  const [nearbyUsers, setNearbyUsers] = useState([]);
  const [nearbyPosts, setNearbyPosts] = useState([]);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const dispatch = useDispatch();
  const { user } = useSelector((store) => store.auth);

  useEffect(() => {
    // Get current location on component mount
    getCurrentLocation();
  }, []);

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      setIsLoadingLocation(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log("Geolocation position:", position);
          setLocation({
            longitude: position.coords.longitude,
            latitude: position.coords.latitude,
          });
          setIsLoadingLocation(false);
        },
        (error) => {
          console.error("Error getting location:", error);
          toast.error("Error getting location: " + error.message);
          setIsLoadingLocation(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      toast.error("Geolocation is not supported by your browser");
    }
  };

  const updateLocation = async () => {
    try {
      setIsLoadingLocation(true);
      
      if (!location.longitude || !location.latitude) {
        toast.error("Invalid location coordinates");
        setIsLoadingLocation(false);
        return;
      }
      
      console.log("Sending location update:", location);
      
      const res = await axios.post(
        "http://localhost:8000/api/v1/user/location",
        location,
        {
          headers: {
            "Content-Type": "application/json",
          },
          withCredentials: true,
        }
      );

      if (res.data.success) {
        console.log("Location update response:", res.data);
        toast.success("Location updated successfully");
        
        // Update user in Redux store with new location
        if (res.data.user) {
          dispatch(setAuthUser(res.data.user));
        } else {
          // If user data not returned, fetch user data
          const userRes = await axios.get("http://localhost:8000/api/v1/user/profile", {
            withCredentials: true
          });
          if (userRes.data.success) {
            dispatch(setAuthUser(userRes.data.user));
          }
        }
      }
      setIsLoadingLocation(false);
    } catch (error) {
      console.error("Update location error:", error);
      toast.error(error?.response?.data?.message || "Error updating location");
      setIsLoadingLocation(false);
    }
  };

  const findNearbyUsers = async () => {
    try {
      const res = await axios.get(
        `http://localhost:8000/api/v1/user/nearby?longitude=${location.longitude}&latitude=${location.latitude}`,
        {
          withCredentials: true,
        }
      );

      if (res.data.success) {
        setNearbyUsers(res.data.users);
      }
    } catch (error) {
      console.error("Find nearby users error:", error);
      toast.error("Error finding nearby users");
    }
  };

  const findNearbyPosts = async () => {
    try {
      const res = await axios.get(
        `http://localhost:8000/api/v1/post/nearby?longitude=${location.longitude}&latitude=${location.latitude}`,
        {
          withCredentials: true,
        }
      );

      if (res.data.success) {
        setNearbyPosts(res.data.posts);
      }
    } catch (error) {
      console.error("Find nearby posts error:", error);
      toast.error("Error finding nearby posts");
    }
  };

  return (
    <div>
      <div className="min-h-screen flex flex-col">
        <Header />
        {/* Main Layout */}
        <div className="flex flex-1 flex-col md:flex-row gap-4 p-4">
          {/* Left Sidebar sticky on md+ */}
          <aside className="hidden md:flex md:flex-col md:w-20 lg:w-64">
            <Leftsidebar />
          </aside>

          {/* Center Content */}
          <div className="flex-1 flex flex-col">
            <ProfilePage userProfile={userProfile} />
            
            {/* Location Update Section */}
            <div className="bg-white p-4 rounded-lg shadow-sm mt-4">
              <h2 className="text-lg font-semibold mb-2">Your Location</h2>
              
              <div className="flex flex-col gap-2 mb-3">
                <p>
                  <span className="font-medium">Current Coordinates:</span>{" "}
                  {user?.location?.coordinates ? 
                    `${user.location.coordinates[0].toFixed(6)}, ${user.location.coordinates[1].toFixed(6)}` : 
                    "No location set"}
                </p>
                
                <p className="text-sm text-gray-500">
                  Setting your location helps show accurate distances to food vendors
                </p>
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={getCurrentLocation}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                  disabled={isLoadingLocation}
                >
                  {isLoadingLocation ? "Getting Location..." : "Get Current Location"}
                </button>
                
                <button
                  onClick={updateLocation}
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                  disabled={isLoadingLocation}
                >
                  {isLoadingLocation ? "Updating..." : "Update My Location"}
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Left Sidebar fixed at bottom on mobile */}
        <div className="fixed bottom-0 left-0 right-0 block md:hidden p-2 shadow-t bg-white border-t">
          <Leftsidebar />
        </div>
      </div>
    </div>
  );
};

export default Profile;
