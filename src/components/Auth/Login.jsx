import React, { useState } from "react";
import { Button, Input } from "@mui/material";
import axios from "axios";
import { toast } from "react-toastify";
import { Link, useNavigate } from "react-router-dom";
import { Loader, Loader2 } from "lucide-react";
import { setAuthUser } from "../../redux/authSlice";
import { useDispatch } from "react-redux";


const Login = () => {
  const [input, setInput] = useState({
   
    email: "",
    password: "",
  });
  const navigate=useNavigate();
  const [loading, setLoading] = useState(false);
  const dispatch=useDispatch();

  const changeEventHandler = (e) => {
    setInput({ ...input, [e.target.name]: e.target.value });
  };
  const signupHandler=async(e)=>{
    e.preventDefault();
    try{
      setLoading(true)
        const res = await axios.post(
          "http://localhost:8000/api/v1/user/login",
          input,
          {
            headers: {
              "Content-Type": "application/json",
            },
            withCredentials: true,
          }
        );
        console.log(res.data);
        if(res.data.success){
          const userData = {
            ...res.data.user,
            isAdmin: res.data.user.isAdmin || false
          };
          
          dispatch(setAuthUser(userData));
          
          if (userData.isAdmin && window.location.pathname.includes('/admin')) {
            navigate('/admin/dashboard');
          } else {
            navigate("/");
          }
          
          toast.success(res.data.message)
          setInput({
            email:"",
            password:""
          })
        }
    }catch(error){
        console.log(error)
        toast.error(error.response.data.message);
    }finally{
      setLoading(false);
    }
    
  }

  return (
    <div className="flex items-center w-screen h-screen justify-center">
      <form
        onSubmit={signupHandler}
        className="shadow-lg flex flex-col gap-5 px-20 py-2"
      >
        <div className="my-4">
          <h1 className="text-center font-bold text-xl">LOGO</h1>
          <p className="text-sm text-center">login to see photos </p>
        </div>

        <div>
          <div className="text-blue-700">Email</div>
          <Input
            type="email"
            name="email"
            value={input.email}
            onChange={changeEventHandler}
            className="focus-visible:ring-transparent mx-2"
          />
        </div>
        <div>
          <div className="text-blue-700">Password</div>
          <Input
            type="password"
            name="password"
            value={input.password}
            onChange={changeEventHandler}
            className="focus-visible:ring-transparent mx-2"
          />
        </div>
        {
            loading ? (
                <Button >
                <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
                </Button>
            ) : (
                <Button type="submit">Login</Button>
            )
        }
        
        <div className="text-center">
          Doesn't have an account?{" "}
          <Link to="/signup" className="text-blue-600">
            Signup
          </Link>
        </div>
      </form>
    </div>
  );
};

export default Login;
