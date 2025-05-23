import React from "react";
import { Avatar } from "@mui/material";

const Comment = ({ comment }) => {
  return (
    <div className="flex gap-2 items-start py-1">
      <Avatar
        alt={comment?.author?.username}
        src={comment?.author?.profilePicture}
        sx={{ width: 32, height: 32 }}
      />
      <div className="flex flex-col">
        <span className="text-sm font-semibold">
          {comment?.author?.username}
        </span>
        <span className="text-sm text-gray-700">{comment?.text}</span>
        <span className="text-xs text-gray-500">
          {new Date(comment?.createdAt).toLocaleString()}
        </span>
      </div>
    </div>
  );
};

export default Comment;
