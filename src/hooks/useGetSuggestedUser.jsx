import axios from 'axios';
import React from 'react'
import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { setSuggestedUsers } from '../redux/authSlice';

const useGetSuggestedUser = () => {
  const dispatch = useDispatch();
  useEffect(()=>{
    const fetchSuggestedUsers=async()=>{
        try{
            const res=await axios.get('http://localhost:8000/api/v1/user/suggested',{
                withCredentials:true
            });
            if(res.data.success){
                dispatch(setSuggestedUsers(res.data.users))
            }
        }
        catch(error){
           console.log(error) 
        }
    }
    fetchSuggestedUsers();
  },[])

}

export default useGetSuggestedUser
