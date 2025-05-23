import axios from "axios";
import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setMessages } from "../redux/chatSlice";

const useGetAllMessage = () => {
  const [messagesLoaded, setMessagesLoaded] = useState(false);
  const dispatch = useDispatch();
  const { selectedUser } = useSelector((store) => store.auth);
  
  useEffect(() => {
    const fetchAllMessage = async () => {
      if (!selectedUser?._id) return;
      
      setMessagesLoaded(false);
      
      try {
        const res = await axios.get(
          `http://localhost:8000/api/v1/message/all/${selectedUser._id}`,
          {
            withCredentials: true,
          }
        );
        if (res.data.success) {
          dispatch(setMessages(res.data.messages));
          setMessagesLoaded(true);
        }
      } catch (error) {
        console.log(error);
      }
    };
    
    fetchAllMessage();
  }, [selectedUser, dispatch]);
  
  return { messagesLoaded };
};

export default useGetAllMessage;
