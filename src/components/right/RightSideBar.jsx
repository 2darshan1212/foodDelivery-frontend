import React from "react";
import { Link } from "react-router-dom";
import { Avatar } from "@mui/material";
import { useSelector } from "react-redux";
import SuggestedUser from "./SuggestedUsers";
import useGetSuggestedUser from "../../hooks/useGetSuggestedUser";

const RightSidebar = () => {
  const { user } = useSelector((store) => store.auth);
  useGetSuggestedUser();

  return (
    <aside className="hidden lg:block w-full max-w-sm p-4 rounded-xl bg-white shadow-md">
      {/* User Info */}
      <div className="flex items-center gap-4 mb-6">
        <Link to={`/profile/${user?._id}`}>
          <Avatar
            alt={user?.username}
            src={user?.profilePicture}
            className="w-12 h-12"
          />
        </Link>
        <div>
          
          <p
            className="block text-xl font-semibold text-gray-900 hover:text-black no-underline"
          >
            {user?.username}
          </p>
          <p className="text-gray-500 text-xs truncate w-44">
            {user?.bio || "No bio available"}
          </p>
        </div>
      </div>

      {/* Suggested Users */}
      <SuggestedUser />
    </aside>
  );
};

export default RightSidebar;
