import React, { use, useEffect, useRef, useState } from "react";
import { Dialog, DialogTitle, DialogContent, Button, FormControlLabel, Checkbox, FormControl, FormLabel, RadioGroup, Radio, Switch, Tooltip, Box } from "@mui/material";
import { readFileAsDataURL } from "../../lib/utils";
import { Loader2 } from "lucide-react";
import axios from "axios";
import { toast } from 'react-toastify';
import useGetAllPost from "../../hooks/useGetAllPost";
import { useDispatch, useSelector } from "react-redux";
import store from './../../redux/store';
import { setPosts } from "../../redux/postSlice";
import { useStoryProtocol } from "../../providers/StoryProtocolProvider";

// API base URL from environment or default to localhost
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const CreatePost = ({ open, setOpen, refreshPosts }) => {
  const postRef = useRef();
  const [file, setFile] = useState("");
  const [caption, setCaption] = useState("");
  const [price, setPrice] = useState("");
  const [loading, setLoading] = useState(false);
  const [postPreview, setPostPreview] = useState("");
  const [category, setCategory] = useState("");
  const [vegetarian, setVegetarian] = useState(false);
  const [spicyLevel, setSpicyLevel] = useState("none");
  const [enableIpProtection, setEnableIpProtection] = useState(false);
  const [preparationTime, setPreparationTime] = useState("");
  const [ingredients, setIngredients] = useState("");
  const [cuisine, setCuisine] = useState("");
  const [onBlockchain, setOnBlockchain] = useState(false);
  const dispatch = useDispatch();
  
  // Get Story Protocol context
  const { isInitialized } = useStoryProtocol();
  
  const {posts} = useSelector(store => store.post)

  const handleCloseDialog = () => {
    setOpen(false);
    // Reset state on close
    setCaption("");
    setPrice("");
    setFile("");
    setPostPreview("");
    setCategory("");
    setVegetarian(false);
    setSpicyLevel("none");
    setEnableIpProtection(false);
    setPreparationTime("");
    setIngredients("");
    setCuisine("");
    setOnBlockchain(false);
    setLoading(false);
  };

  const createPostHandler = async (e) => {
    e.preventDefault();
    if (!caption || !file) return;

    setLoading(true);
    const formData = new FormData();
    formData.append("media", file);
    formData.append("caption", caption);
    formData.append("price", price);
    formData.append("category", category);
    formData.append("vegetarian", vegetarian);
    formData.append("spicyLevel", spicyLevel);
    formData.append("preparationTime", preparationTime);
    formData.append("ingredients", ingredients);
    formData.append("cuisine", cuisine);
    formData.append("ipProtected", enableIpProtection);

    try {
      const res = await axios.post(
        `${API_BASE_URL}/api/v1/post/addpost`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
          withCredentials: true,
        }
      );
      if (res.data.success) {
        // useGetAllPost();
        dispatch(setPosts([res.data.post,...posts]))
        
        toast.success(res.data.message, {
          position: "top-right",
          autoClose: 2000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
        });
        
        // Register with Story Protocol if enabled
        if (enableIpProtection && isInitialized) {
          try {
            // Navigate to the post detail page where IP registration will be handled
            // We'll handle the actual registration in the post detail page
            toast.info("Your recipe has been submitted for IP protection. Complete the process in the post details.", {
              position: "top-right",
              autoClose: 5000,
            });
          } catch (error) {
            console.error("Error registering IP:", error);
            toast.warning("Post created but IP registration failed. You can try again later.", {
              position: "top-right",
              autoClose: 5000,
            });
          }
        }
      }
      // After successful post

      handleCloseDialog();
    } catch (error) {
      console.error("Error posting:", error);
      toast.error(error.response?.data?.message || "Failed to create post");
      setLoading(false);
    }
  };

  const fileChangeHandler = async (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      const dataUrl = await readFileAsDataURL(selectedFile);
      setPostPreview(dataUrl);
    }
  };

  return (
    <Dialog open={open} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
      <DialogTitle className="text-center font-semibold">
        Create New Post
      </DialogTitle>
      <DialogContent dividers>
        <form className="flex flex-col gap-4" onSubmit={createPostHandler}>
          <input
            type="text"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            maxLength={200}
            placeholder="Caption..."
            className="border border-gray-300 p-2 rounded-md"
          />
          <select
            name="category"
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="border border-gray-300 p-2 rounded-md"
            required
          >
            <option value="" disabled>
              Select Category
            </option>
            <option value="Breakfast">Breakfast</option>
            <option value="Lunch">Lunch</option>
            <option value="Dinner">Dinner</option>
            <option value="Snacks">Snacks</option>
            <option value="Dessert">Dessert</option>
            <option value="Drinks">Drinks</option>
            <option value="FastFood">FastFood</option>
            <option value="Other">Other</option>
            <option value="All">All</option>
          </select>
          
          {/* On Blockchain Button */}
          <Button 
            variant={onBlockchain ? "contained" : "outlined"}
            color="primary"
            fullWidth
            onClick={() => setOnBlockchain(!onBlockchain)}
            sx={{ mt: 1, mb: 1 }}
          >
            {onBlockchain ? "On Blockchain ✓" : "On Blockchain"}
          </Button>

          {/* Food properties */}
          <div className="flex flex-col gap-3 border border-gray-200 p-3 rounded-md bg-gray-50">
            <h3 className="font-medium text-gray-700">Food Properties</h3>
            
            {/* Vegetarian toggle */}
            <FormControlLabel
              control={
                <Checkbox
                  checked={vegetarian}
                  onChange={(e) => setVegetarian(e.target.checked)}
                  color="success"
                />
              }
              label="Vegetarian"
            />
            
            {/* Spicy level selection */}
            <FormControl component="fieldset">
              <FormLabel component="legend" className="text-sm text-gray-600">Spicy Level</FormLabel>
              <RadioGroup
                row
                value={spicyLevel}
                onChange={(e) => setSpicyLevel(e.target.value)}
              >
                <FormControlLabel value="none" control={<Radio size="small" />} label="Not Spicy" />
                <FormControlLabel value="mild" control={<Radio size="small" />} label="Mild" />
                <FormControlLabel value="medium" control={<Radio size="small" />} label="Medium" />
                <FormControlLabel value="hot" control={<Radio size="small" />} label="Hot" />
              </RadioGroup>
            </FormControl>
            
            {/* Options that only show when onBlockchain is true */}
            {onBlockchain && (
              <Box sx={{ mt: 2 }}>
                {/* Cuisine type */}
                <FormControl fullWidth>
                  <FormLabel component="legend" className="text-sm text-gray-600">Cuisine</FormLabel>
                  <select
                    value={cuisine}
                    onChange={(e) => setCuisine(e.target.value)}
                    className="border border-gray-300 p-2 rounded-md mt-1"
                  >
                    <option value="">Select Cuisine</option>
                    <option value="Italian">Italian</option>
                    <option value="Mexican">Mexican</option>
                    <option value="Indian">Indian</option>
                    <option value="Chinese">Chinese</option>
                    <option value="Japanese">Japanese</option>
                    <option value="Thai">Thai</option>
                    <option value="Mediterranean">Mediterranean</option>
                    <option value="American">American</option>
                    <option value="French">French</option>
                    <option value="Other">Other</option>
                  </select>
                </FormControl>
                
                {/* Preparation time */}
                <FormControl fullWidth sx={{ mt: 2 }}>
                  <FormLabel component="legend" className="text-sm text-gray-600">Preparation Time (minutes)</FormLabel>
                  <input
                    type="number"
                    value={preparationTime}
                    onChange={(e) => setPreparationTime(e.target.value)}
                    className="border border-gray-300 p-2 rounded-md mt-1"
                    placeholder="e.g., 30"
                  />
                </FormControl>
                
                {/* Ingredients */}
                <FormControl fullWidth sx={{ mt: 2 }}>
                  <FormLabel component="legend" className="text-sm text-gray-600">Ingredients (comma separated)</FormLabel>
                  <textarea
                    value={ingredients}
                    onChange={(e) => setIngredients(e.target.value)}
                    className="border border-gray-300 p-2 rounded-md mt-1"
                    placeholder="e.g., flour, sugar, milk"
                    rows="3"
                  />
                </FormControl>
              </Box>
            )}
          </div>
          
          {/* Story Protocol IP Protection - Only show when onBlockchain is true */}
          {onBlockchain && (
            <div className="flex flex-col gap-3 border border-gray-200 p-3 rounded-md bg-blue-50">
              <div className="flex justify-between items-center">
                <h3 className="font-medium text-gray-700">Intellectual Property Protection</h3>
                <Tooltip title={isInitialized ? 
                  "Protect your recipe as intellectual property with Story Protocol" : 
                  "Story Protocol is not initialized yet. Please try again later"}>
                  <FormControlLabel
                    control={<Switch 
                      checked={enableIpProtection}
                      onChange={(e) => setEnableIpProtection(e.target.checked)}
                      color="primary"
                      disabled={!isInitialized}
                    />}
                    label="Enable"
                  />
                </Tooltip>
              </div>
              {enableIpProtection && (
                <div className="text-sm text-gray-600 bg-white p-2 rounded border border-blue-200">
                  <p className="mb-2">By enabling IP protection, you're registering your recipe as an intellectual property asset on Story Protocol.</p>
                  <p>This allows you to:</p>
                  <ul className="list-disc list-inside pl-2">
                    <li>Establish ownership of your recipe</li>
                    <li>Set licensing terms for others to use your recipe</li>
                    <li>Receive attribution when others use your recipe</li>
                    <li>Potentially earn royalties when your recipe is used commercially</li>
                  </ul>
                </div>
              )}
            </div>
          )}

          {postPreview && (
            <div className="w-full h-96">
              {file.type.startsWith("image") ? (
                <img
                  src={postPreview}
                  alt="Post Preview"
                  className="w-full rounded h-full object-cover"
                />
              ) : (
                <video
                  controls
                  autoPlay
                  loop
                  className="w-full h-full object-cover rounded"
                >
                  <source src={postPreview} type={file.type} />
                  Your browser does not support the video tag.
                </video>
              )}
            </div>
          )}
          <input
            type="file"
            ref={postRef}
            accept="image/*,video/*"
            className="hidden"
            onChange={fileChangeHandler}
            required
          />
          <button
            type="button"
            onClick={() => postRef.current.click()}
            className="w-fit mx-auto bg-[#0095F6] hover:bg-[#258bcf] p-2 rounded"
          >
            Select Post
          </button>
          {postPreview && (
            <input
              type="text"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="Price..."
              className="border border-gray-300 p-2 rounded-md"
              required
            />
          )}
          {postPreview && (
            <button
              type="submit"
              disabled={loading}
              className="w-full mx-auto bg-[#0095F6] hover:bg-[#258bcf] p-2 rounded flex justify-center items-center"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Please wait...
                </>
              ) : (
                "Post"
              )}
            </button>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreatePost;
