import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { setAgentAvailability } from '../../redux/deliverySlice';
import { BiPackage } from 'react-icons/bi';
import { ImSwitch } from 'react-icons/im';
import { toast } from 'react-hot-toast';

const DeliveryHeader = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const { isAvailable, isDeliveryAgent, profile, isActionPending } = useSelector((state) => state.delivery);

  const toggleAvailability = () => {
    if (isActionPending) return;
    
    dispatch(setAgentAvailability(!isAvailable))
      .unwrap()
      .then(() => {
        toast.success(`You are now ${!isAvailable ? 'available' : 'unavailable'} for deliveries`);
      })
      .catch((error) => {
        toast.error(error || 'Failed to update availability');
      });
  };

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm py-3 px-4 md:px-6">
      <div className="flex items-center justify-between">
        {/* Logo and title */}
        <div className="flex items-center space-x-3">
          <Link to="/deliver/dashboard" className="flex items-center">
            <BiPackage size={28} className="text-indigo-600" />
            <span className="ml-2 text-xl font-semibold text-gray-800">Delivery Dashboard</span>
          </Link>
        </div>

        {/* Status and user info */}
        <div className="flex items-center space-x-4">
          {isDeliveryAgent && (
            <div className="flex items-center">
              <span className="mr-2 text-sm font-medium text-gray-600">
                {isAvailable ? 'Available' : 'Unavailable'}
              </span>
              <button
                onClick={toggleAvailability}
                disabled={isActionPending}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  isAvailable ? 'bg-green-500' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    isAvailable ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          )}

          {/* User info */}
          <div className="flex items-center">
            <img
              src={user?.profilePic || 'https://via.placeholder.com/40'}
              alt={user?.username || 'User'}
              className="w-8 h-8 rounded-full object-cover"
            />
            <span className="ml-2 text-sm font-medium text-gray-700 hidden md:inline">
              {user?.username || 'User'}
            </span>
          </div>

          {/* Main menu link */}
          <Link to="/" className="text-gray-600 hover:text-indigo-600">
            <ImSwitch size={18} className="rotate-180" />
          </Link>
        </div>
      </div>
    </header>
  );
};

export default DeliveryHeader; 