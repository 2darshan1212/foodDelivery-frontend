import React from "react";
import { useDispatch, useSelector } from "react-redux";


import { Link } from "react-router-dom";
import { Avatar } from "@mui/material";
import { setSelectedUser } from "../../redux/authSlice";

const ChatRightSideBar = () => {
  const { user, suggestedUsers, selectedUser } = useSelector(
    (store) => store.auth
  );
  const dispatch = useDispatch();
  const { onlineUsers } = useSelector((store) => store.chat);
  return (
    <div className=" hidden lg:block w-full  h-[78vh] max-w-sm p-4 rounded-xl bg-white shadow-md">
      <section>
        <div className="flex gap-2">
          <div className="   hover:bg-gray-100 cursor-pointer rounded-full p-2  ">
            <Link to={`/profile/${user?._id}`}>
              <Avatar
                alt="Remy Sharp"
                src={user?.profilePicture}
                className="w-2 h-3 cursor-pointer"
              />
            </Link>
          </div>
          <div className="my-2">
            <h1 className="font-bold mb-4 px-3 text-xl cursor-pointer">
              {user?.username}
            </h1>
          </div>
        </div>

        <hr className="mb-4 border-gray-500" />
        <div className="overflow-y-auto h-[52vh]">
          {suggestedUsers.map((suggestedUser) => {
            const isOnline = onlineUsers?.some(
              (onlineUser) =>
                onlineUser === suggestedUser?._id ||
                onlineUser?.userId === suggestedUser?._id
            );

            return (
              <div
                key={suggestedUser?._id}
                onClick={() => dispatch(setSelectedUser(suggestedUser))}
                className="flex gap-3 items-center ml-3 p-3 hover:bg-gray-100 cursor-pointer rounded-lg "
              >
                <Avatar
                  alt={suggestedUser?.username}
                  src={suggestedUser?.profilePicture}
                  className="w-2 h-3 cursor-pointer"
                />
                <div className="flex flex-col">
                  <span className="font-medium ">
                    {suggestedUser?.username}
                  </span>
                  <span
                    className={`text-xs font-bold ${
                      isOnline ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {isOnline ? "online" : "offline"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};

export default ChatRightSideBar;
