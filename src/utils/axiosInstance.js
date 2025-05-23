// utils/axiosInstance.js
import axios from "axios";

const instance = axios.create({
  baseURL: "https://food-delivery-backend-gray.vercel.app/api/api/v1", // your backend base URL
});

instance.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default instance;
