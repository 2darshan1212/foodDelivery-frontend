import axios from "axios";
import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { setPosts } from "../redux/postSlice";

const useGetAllPost = () => {
  const dispatch = useDispatch();
  useEffect(() => {
    const fetchAllPost = async () => {
      try {
        const res = await axios.get(
          "https://food-delivery-backend-gray.vercel.app/api/api/v1/post/all",
          {
            withCredentials: true,
          }
        );
        if (res.data.success) {
          dispatch(setPosts(res.data.posts));
        }
      } catch (error) {
        console.error("Error fetching posts:", error);
      }
    };

    fetchAllPost();
  }, []);
};

export default useGetAllPost;
