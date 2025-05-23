import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  Button,
  Avatar,
  Menu,
  MenuItem,
} from "@mui/material";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import Comment from "./Comment";
import axios from "axios";
import { setPosts } from "../../redux/postSlice";

const CommentDialog = ({ open, setOpen, post }) => {
  const [text, setText] = useState("");
  const [parentId, setParentId] = useState(null);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { selectedPost, posts } = useSelector((store) => store.post);
  const [comments, setComments] = useState([]);

  const [anchorEl, setAnchorEl] = useState(null);
  const openMenu = Boolean(anchorEl);

  // Load comments on open
  useEffect(() => {
    if (selectedPost?.comments) {
      setComments(selectedPost.comments);
    }
  }, [selectedPost]);

  const changeEventHandler = (e) => {
    setText(e.target.value);
  };

  const handleCloseDialog = () => {
    setText("");
    setParentId(null);
    setOpen(false);
  };

  const handleMenuClick = (event) => setAnchorEl(event.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);

  const sendMessageHandler = async () => {
    if (!text.trim()) return;
    try {
      const res = await axios.post(
        `http://localhost:8000/api/v1/post/${selectedPost?._id}/comment`,
        { text, parentId },
        {
          headers: {
            "Content-Type": "application/json",
          },
          withCredentials: true,
        }
      );

      if (res.data.success) {
        const newComment = res.data.comment;
        const updatedComments = [...comments, newComment];

        setComments(updatedComments); // ✅ update local UI
        setText("");
        setParentId(null);

        // Update Redux state
        const updatedPostData = posts.map((p) =>
          p._id === selectedPost._id ? { ...p, comments: updatedComments } : p
        );
        dispatch(setPosts(updatedPostData));
      }
    } catch (error) {
      console.error("Comment send failed:", error);
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleCloseDialog} 
      fullWidth 
      maxWidth="md"
      closeAfterTransition
      disableRestoreFocus
    >
      <DialogContent className="p-0">
        <div className="flex h-[500px]">
          {/* Left side - media */}
          <div className="w-1/2 bg-gray-100 flex items-center justify-center">
            {post?.mediaType === "video" ? (
              <video
                src={post?.video}
                controls
                autoPlay
                loop
                className="w-full h-full object-cover"
              />
            ) : (
              <img
                src={post?.image}
                alt="Post"
                className="w-full h-full object-cover"
              />
            )}
          </div>

          {/* Right side - content */}
          <div className="w-1/2 flex flex-col">
            <div className="flex justify-between items-center p-3">
              <div className="flex items-center gap-2">
                <Link to="/profile">
                  <Avatar
                    src={selectedPost?.author?.profilePicture}
                    alt={selectedPost?.author?.username}
                  />
                </Link>
                <span
                  onClick={() => navigate("/profile")}
                  className="cursor-pointer font-semibold"
                >
                  {selectedPost?.author?.username}
                </span>
              </div>
              <div>
                <button onClick={handleMenuClick} className="text-xl">
                  ⋮
                </button>
                <Menu
                  anchorEl={anchorEl}
                  open={openMenu}
                  onClose={handleMenuClose}
                >
                  <MenuItem onClick={handleMenuClose}>Unfollow</MenuItem>
                  <MenuItem onClick={handleMenuClose}>
                    Add to Favorites
                  </MenuItem>
                </Menu>
              </div>
            </div>

            <hr />

            {/* Comments */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin">
              {comments?.length > 0 ? (
                comments.map((comment) => (
                  <Comment key={comment._id} comment={comment} />
                ))
              ) : (
                <p className="text-sm text-gray-500">No comments yet.</p>
              )}
            </div>

            {/* Input box */}
            <div className="flex items-center p-3 border-t gap-2">
              <input
                value={text}
                onChange={changeEventHandler}
                placeholder="Add a comment..."
                className="flex-1 border border-gray-300 rounded px-3 py-1 focus:outline-none"
              />
              <Button
                variant="contained"
                disabled={!text.trim()}
                onClick={sendMessageHandler}
              >
                Send
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CommentDialog;
