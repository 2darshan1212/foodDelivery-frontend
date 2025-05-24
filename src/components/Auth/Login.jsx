import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Button, TextField, CircularProgress } from "@mui/material";
import axios from "axios";
import { toast } from "react-hot-toast";
import { setAuthUser } from "../../redux/authSlice";
import { useDispatch } from "react-redux";
import { setPosts, setSelectedPost } from "../../redux/postSlice";
import { setAuthToken } from "../../utils/axiosInstance";

const Login = () => {
  const [input, setInput] = useState({
    email: "",
    password: "",
  });
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();

  const changeEventHandler = (e) => {
    setInput({ ...input, [e.target.name]: e.target.value });
  };
  const loginHandler = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      console.log('Attempting login with:', input.email);
      
      if (!input.email || !input.password) {
        toast.error('Email and password are required');
        setLoading(false);
        return;
      }
      
      // Always use the absolute URL for login to avoid any path issues
      const loginUrl = "https://food-delivery-backend-gray.vercel.app/api/v1/user/login";
      
      // Make the login request without withCredentials to avoid CORS issues
      const res = await axios.post(
        loginUrl,
        input,
        {
          headers: {
            "Content-Type": "application/json",
          },
          withCredentials: false,
        }
      );
      
      console.log('Login response received');
      
      if (res.data.success) {
        // Ensure user data exists
        if (!res.data.user) {
          throw new Error('User data missing from response');
        }
        
        const userData = {
          ...res.data.user,
          isAdmin: res.data.user.isAdmin || false,
        };
        
        // Process authentication token
        if (res.data.token) {
          // Use our imported setAuthToken function
          setAuthToken(res.data.token);
          console.log('Auth token set successfully');
        } else {
          console.error('No token received from server');
          toast.error('Authentication error: No token received');
          setLoading(false);
          return;
        }
        
        dispatch(setAuthUser(userData));

        if (userData.isAdmin && window.location.pathname.includes("/admin")) {
          navigate("/admin/dashboard");
        } else {
          navigate("/");
        }

        toast.success(res.data.message);
        setInput({
          email: "",
          password: "",
        });
      }
    } catch (error) {
      console.error('Login error:', error);
      
      // Handle different types of errors
      if (error.response) {
        // The server responded with an error status code
        const errorMessage = error.response.data?.message || 'Authentication failed';
        toast.error(errorMessage);
        console.error('Server error:', errorMessage);
      } else if (error.request) {
        // The request was made but no response was received (network error)
        toast.error('Network error - please check your internet connection');
        console.error('Network error - no response received');
      } else {
        // Something else caused the error
        toast.error(error.message || 'Login error');
        console.error('Error during login:', error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center w-screen h-screen justify-center">
      <form
        onSubmit={loginHandler}
        className="shadow-lg flex flex-col gap-5 px-20 py-2"
      >
        <div className="my-4">
          <h1 className="text-center font-bold text-xl">LOGO</h1>
          <p className="text-sm text-center">login to see photos </p>
        </div>

        <div>
          <TextField
            label="Email"
            variant="outlined"
            fullWidth
            margin="normal"
            type="email"
            name="email"
            value={input.email}
            onChange={changeEventHandler}
            required
          />
        </div>
        <div>
          <TextField
            label="Password"
            variant="outlined"
            fullWidth
            margin="normal"
            type="password"
            name="password"
            value={input.password}
            onChange={changeEventHandler}
            required
          />
        </div>
        <Button 
          type="submit" 
          variant="contained" 
          color="primary" 
          fullWidth 
          disabled={loading}
          sx={{ mt: 2, mb: 2 }}
        >
          {loading ? <CircularProgress size={24} color="inherit" /> : 'Login'}
        </Button>

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
