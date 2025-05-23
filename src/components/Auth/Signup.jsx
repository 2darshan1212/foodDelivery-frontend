import React, { useState } from "react";
import { Button, Input } from "@mui/material";
import axios from "axios";
import { toast } from "react-toastify";
import { Link, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";


const Signup = () => {
  const [input, setInput] = useState({
    username: "",
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const navigate=useNavigate();

  const changeEventHandler = (e) => {
    setInput({ ...input, [e.target.name]: e.target.value });
  };
  const signupHandler=async(e)=>{
    e.preventDefault();
    try{
      setLoading(true)
        const res = await axios.post(
          "http://localhost:8000/api/v1/user/register",
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
          navigate("/login")
            toast.success(res.data.message)
            setInput({
              username:"",
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
          <p className="text-sm text-center">signup to see photos </p>
        </div>
        <div>
          <div className="text-blue-700">UserName</div>
          <Input
            type="text"
            name="username"
            value={input.username}
            onChange={changeEventHandler}
            className="focus-visible:ring-transparent mx-2 "
          />
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
        <>
          {loading ? (
            <Button>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            </Button>
          ) : (
            <Button type="submit">SignUp</Button>
          )}
          <div className="text-center">
            Already have an account?{" "}
            <Link to="/login" className="text-blue-600">
              Login
            </Link>
          </div>
        </>
      </form>
    </div>
  );
};

export default Signup;
