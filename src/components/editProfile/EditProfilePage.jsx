import { Avatar, Button, MenuItem, Select, TextField } from "@mui/material";
import { Loader2 } from "lucide-react";
import React, { useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-hot-toast";
import { setAuthUser } from "../../redux/authSlice";
 // update the path as per your project

const EditProfilePage = ({ userProfile }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((store) => store.auth);

  const [input, setInput] = useState({
    profilePhoto: null,
    previewPhoto: user?.profilePicture || "/default-avatar.png",
    bio: user?.bio || "",
    gender: user?.gender || "",
  });

  const imageRef = useRef();
  const [loading, setLoading] = useState(false);

  const editProfileHandler = async () => {
    const formData = new FormData();
    formData.append("bio", input.bio);
    formData.append("gender", input.gender);
    if (input.profilePhoto) {
      formData.append("profilePhoto", input.profilePhoto);
    }

    try {
      setLoading(true);
      const res = await axios.post(
        "http://localhost:8000/api/v1/user/profile/edit",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
          withCredentials: true,
        }
      );

      if (res.data.success) {
        const updatedUserData = {
          ...user,
          bio: res.data.user.bio,
          profilePicture: res.data.user.profilePicture,
          gender: res.data.user.gender,
        };
        dispatch(setAuthUser(updatedUserData));
        toast.success(res.data.message || "Profile updated successfully!");
        navigate(`/profile/${user?._id}`);
      }
    } catch (error) {
      toast.error("Failed to update profile");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fileChangeHandler = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setInput((prev) => ({
        ...prev,
        profilePhoto: file,
        previewPhoto: URL.createObjectURL(file),
      }));
    }
  };

  const selectChangeHandler = (e) => {
    setInput((prev) => ({ ...prev, gender: e.target.value }));
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <section className="flex flex-col gap-6 w-full my-8">
        <h1 className="font-bold text-2xl text-center sm:text-left">
          Edit Profile
        </h1>

        {/* Profile Info */}
        <div className="flex flex-col sm:flex-row justify-between items-center bg-gray-100 rounded-xl p-4 gap-4">
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <img
              alt={userProfile?.username || "default"}
              src={input.previewPhoto}
              className="w-20 h-20 rounded-full object-cover border"
            />
            <div>
              <h2 className="font-bold text-lg">{user?.username}</h2>
              <p className="text-sm text-gray-600">
                {input.bio || "No bio available"}
              </p>
            </div>
          </div>

          <div className="w-full sm:w-auto text-center sm:text-right">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              ref={imageRef}
              onChange={fileChangeHandler}
            />
            <button
              className="bg-gray-200 hover:bg-gray-300 transition px-4 py-2 rounded mt-2 sm:mt-0"
              onClick={() => imageRef?.current.click()}
            >
              Change Photo
            </button>
          </div>
        </div>

        {/* Bio Section */}
        <div className="w-full">
          <h2 className="font-bold text-lg mb-2">Bio</h2>
          <textarea
            value={input.bio}
            onChange={(e) =>
              setInput((prev) => ({ ...prev, bio: e.target.value }))
            }
            rows="4"
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
            placeholder="Write something about yourself..."
          />
        </div>

        {/* Gender Selection */}
        <div className="w-full">
          <h2 className="font-bold text-lg mb-2">Gender</h2>
          <Select
            value={input.gender}
            onChange={selectChangeHandler}
            fullWidth
            displayEmpty
            className="bg-white"
          >
            <MenuItem value="" disabled>
              Select Gender
            </MenuItem>
            <MenuItem value="male">Male</MenuItem>
            <MenuItem value="female">Female</MenuItem>
            <MenuItem value="other">Other</MenuItem>
          </Select>
        </div>

        {/* Submit Button */}
        <div className="text-center sm:text-left">
          <Button
            onClick={editProfileHandler}
            variant="contained"
            color="primary"
            className="w-full sm:w-auto mb-3"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Please wait...
              </>
            ) : (
              "Submit"
            )}
          </Button>
        </div>
      </section>
    </div>
  );
};

export default EditProfilePage;
