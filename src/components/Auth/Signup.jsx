import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Button, TextField, CircularProgress } from "@mui/material";
import axios from "axios";
import { toast } from "react-hot-toast";

const Signup = () => {
  const [input, setInput] = useState({
    username: "",
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const changeEventHandler = (e) => {
    setInput({ ...input, [e.target.name]: e.target.value });
  };
  const signupHandler = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      console.log('Attempting signup with:', { username: input.username, email: input.email });
      
      // Use direct URL and don't use withCredentials to avoid CORS issues
      const res = await axios.post(
        "https://food-delivery-backend-gray.vercel.app/api/v1/user/register",
        input,
        {
          headers: {
            "Content-Type": "application/json",
          },
          withCredentials: false, // Don't use credentials for cross-origin request
        }
      );
      
      console.log('Signup response:', res.data);
      
      if (res.data.success) {
        // If backend returns a token and user object (auto-login after signup)
        if (res.data.token && res.data.user) {
          // Store token in localStorage
          localStorage.setItem('authToken', res.data.token);
          
          // Set for all future axios requests globally
          axios.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`;
          
          toast.success('Account created successfully! Logging you in...');
          
          // Redirect to homepage instead of login page
          navigate("/");
        } else {
          // If no token provided, redirect to login page
          toast.success(res.data.message);
          navigate("/login");
        }
        
        // Clear form
        setInput({
          username: "",
          email: "",
          password: "",
        });
      }
    } catch (error) {
      console.error('Signup error:', error);
      const errorMessage = error.response?.data?.message || 'Error creating account';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

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
          <TextField
            label="Username"
            variant="outlined"
            fullWidth
            margin="normal"
            type="text"
            name="username"
            value={input.username}
            onChange={changeEventHandler}
            required
          />
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
          {loading ? <CircularProgress size={24} color="inherit" /> : 'Sign Up'}
        </Button>
        <div className="text-center">
          Already have an account?{" "}
          <Link to="/login" className="text-blue-600">
            Login
          </Link>
        </div>
      </form>
    </div>
  );
};

export default Signup;
