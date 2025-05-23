import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { registerAgent } from '../../redux/deliverySlice';
import { MdDirectionsBike, MdDeliveryDining, MdDirectionsCar, MdEmojiTransportation } from 'react-icons/md';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';

const Register = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isRegistering, isRegistrationError, registrationError } = useSelector(
    (state) => state.delivery
  );
  const { user } = useSelector((state) => state.auth);

  const [formData, setFormData] = useState({
    vehicleType: 'bike',
    vehicleNumber: '',
  });

  const vehicleOptions = [
    { value: 'bike', label: 'Motorcycle', icon: MdDirectionsBike },
    { value: 'car', label: 'Car', icon: MdDirectionsCar },
    { value: 'bicycle', label: 'Bicycle', icon: MdDeliveryDining },
    { value: 'scooter', label: 'Scooter', icon: MdEmojiTransportation },
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleVehicleSelect = (vehicleType) => {
    setFormData({ ...formData, vehicleType });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.vehicleNumber.trim()) {
      toast.error('Please enter your vehicle number');
      return;
    }

    try {
      await dispatch(registerAgent(formData)).unwrap();
      toast.success('Registration successful! You are now a delivery agent.');
      navigate('/deliver/dashboard');
    } catch (error) {
      toast.error(error || 'Registration failed. Please try again.');
    }
  };

  if (!user) {
    return (
      <div className="max-w-lg mx-auto mt-10 bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Authentication Required</h2>
        <p className="text-gray-600 mb-6">
          You need to be logged in to register as a delivery agent.
        </p>
        <button
          onClick={() => navigate('/login')}
          className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
        >
          Go to Login
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-sm p-6">
      <div className="text-center mb-8">
        <MdDeliveryDining className="mx-auto text-indigo-600" size={60} />
        <h1 className="text-2xl font-bold mt-4">Register as a Delivery Agent</h1>
        <p className="text-gray-600 mt-2">
          Fill out the form below to join our delivery team
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Vehicle Type Selection */}
        <div className="mb-6">
          <label className="block text-gray-700 font-medium mb-3">
            Select your vehicle type
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {vehicleOptions.map((option) => (
              <div
                key={option.value}
                onClick={() => handleVehicleSelect(option.value)}
                className={`flex flex-col items-center justify-center p-4 rounded-lg cursor-pointer border-2 transition-all ${
                  formData.vehicleType === option.value
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-gray-200 hover:border-indigo-200 hover:bg-gray-50'
                }`}
              >
                <option.icon
                  size={36}
                  className={
                    formData.vehicleType === option.value
                      ? 'text-indigo-600'
                      : 'text-gray-500'
                  }
                />
                <span
                  className={`mt-2 ${
                    formData.vehicleType === option.value
                      ? 'text-indigo-600 font-medium'
                      : 'text-gray-600'
                  }`}
                >
                  {option.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Vehicle Number */}
        <div className="mb-6">
          <label
            htmlFor="vehicleNumber"
            className="block text-gray-700 font-medium mb-2"
          >
            Vehicle Number / License Plate
          </label>
          <input
            type="text"
            id="vehicleNumber"
            name="vehicleNumber"
            value={formData.vehicleNumber}
            onChange={handleChange}
            placeholder="Enter your vehicle number"
            className="w-full px-4 py-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            required
          />
        </div>

        {/* Terms and Conditions */}
        <div className="mb-6">
          <label className="flex items-center">
            <input
              type="checkbox"
              className="h-5 w-5 text-indigo-600 rounded"
              required
            />
            <span className="ml-2 text-gray-700">
              I agree to the{' '}
              <a href="#" className="text-indigo-600 hover:underline">
                Terms and Conditions
              </a>{' '}
              and{' '}
              <a href="#" className="text-indigo-600 hover:underline">
                Privacy Policy
              </a>
            </span>
          </label>
        </div>

        {/* Error message */}
        {isRegistrationError && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md">
            {registrationError}
          </div>
        )}

        {/* Submit button */}
        <button
          type="submit"
          disabled={isRegistering}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-4 rounded-md transition duration-200 flex justify-center items-center"
        >
          {isRegistering ? (
            <>
              <svg
                className="animate-spin -ml-1 mr-2 h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Registering...
            </>
          ) : (
            'Register as Delivery Agent'
          )}
        </button>
      </form>

      <div className="mt-8 bg-blue-50 p-4 rounded-lg">
        <h3 className="font-medium text-blue-800 mb-2">Important Information:</h3>
        <ul className="text-blue-700 text-sm space-y-1">
          <li>• Your registration will be reviewed by our team</li>
          <li>• You'll be notified once your account is verified</li>
          <li>• Make sure your vehicle documents are valid and up-to-date</li>
        </ul>
      </div>
    </div>
  );
};

export default Register; 