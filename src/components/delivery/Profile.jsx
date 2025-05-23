import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchAgentProfile } from '../../redux/deliverySlice';
import { MdDeliveryDining, MdDirectionsBike, MdStar, MdVerified, MdWarning } from 'react-icons/md';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';

const Profile = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const { isDeliveryAgent, profile, isProfileLoading, isProfileError, stats } = useSelector(
    (state) => state.delivery
  );

  // Fetch agent profile on mount
  useEffect(() => {
    if (user && user._id) {
      dispatch(fetchAgentProfile())
        .unwrap()
        .catch((error) => {
          if (!error || !error.includes('not found')) {
            toast.error(error || 'Failed to load profile');
          }
        });
    }
  }, [dispatch, user]);

  if (!user) {
    return (
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-sm p-6">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-4">Authentication Required</h2>
          <p className="text-gray-600 mb-6">
            You need to be logged in to view your profile.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  if (isProfileLoading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-64px)]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (!isDeliveryAgent && !isProfileLoading) {
    return (
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-sm p-6">
        <div className="text-center">
          <MdDeliveryDining className="mx-auto text-gray-400" size={80} />
          <h2 className="text-xl font-semibold mt-4">You are not registered as a delivery agent</h2>
          <p className="text-gray-600 mt-2">
            Register first to access your delivery agent profile
          </p>
          <button
            onClick={() => navigate('/deliver/register')}
            className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-6 rounded-md"
          >
            Register Now
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {/* Profile header */}
        <div className="md:flex">
          <div className="md:flex-shrink-0 bg-gradient-to-r from-indigo-600 to-indigo-800 md:w-48 flex items-center justify-center p-8">
            <img
              src={user?.profilePic || 'https://via.placeholder.com/150'}
              alt={user?.username || 'User'}
              className="h-24 w-24 rounded-full object-cover border-4 border-white"
            />
          </div>
          <div className="p-8 w-full">
            <div className="flex flex-wrap justify-between items-start">
              <div>
                <h1 className="text-2xl font-bold text-gray-800">{user?.username || 'User'}</h1>
                <p className="text-gray-600">Delivery Agent</p>
                <div className="mt-2 flex items-center">
                  <MdDirectionsBike className="text-indigo-600 mr-2" size={20} />
                  <span className="text-gray-700 capitalize">{profile?.vehicleType || 'Vehicle'}</span>
                  {profile?.isVerified ? (
                    <div className="ml-4 flex items-center text-green-600">
                      <MdVerified size={18} className="mr-1" />
                      <span>Verified</span>
                    </div>
                  ) : (
                    <div className="ml-4 flex items-center text-amber-600">
                      <MdWarning size={18} className="mr-1" />
                      <span>Pending Verification</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-col md:flex-row md:items-center mt-4 md:mt-0">
                <div className="flex items-center mr-6">
                  <MdStar className="text-yellow-500 mr-1" size={22} />
                  <span className="text-xl font-medium">
                    {stats?.rating ? stats.rating.toFixed(1) : 'N/A'}
                  </span>
                  <span className="text-gray-500 text-sm ml-1">
                    ({stats?.totalRatings || 0})
                  </span>
                </div>
                <div className="bg-indigo-50 px-4 py-2 rounded-md mt-2 md:mt-0">
                  <span className="text-indigo-700 font-medium">
                    {stats?.completedDeliveries || 0}
                  </span>{' '}
                  <span className="text-indigo-600">deliveries</span>
                </div>
              </div>
            </div>

            {!profile?.isVerified && (
              <div className="mt-6 bg-amber-50 border border-amber-100 rounded-md p-4">
                <h3 className="font-medium text-amber-800 flex items-center">
                  <MdWarning className="mr-2" size={20} />
                  Verification Pending
                </h3>
                <p className="mt-1 text-amber-700">
                  Your account is currently under review. You'll be able to accept orders once 
                  your account is verified by our team.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Profile details */}
        <div className="border-t border-gray-200">
          <dl>
            <div className="bg-gray-50 px-6 py-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Vehicle Type</dt>
                <dd className="mt-1 text-gray-900 capitalize">{profile?.vehicleType || 'Not set'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Vehicle Number</dt>
                <dd className="mt-1 text-gray-900">{profile?.vehicleNumber || 'Not set'}</dd>
              </div>
            </div>

            <div className="bg-white px-6 py-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Email</dt>
                <dd className="mt-1 text-gray-900">{user?.email || 'Not set'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Account Status</dt>
                <dd className="mt-1">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      profile?.isVerified
                        ? 'bg-green-100 text-green-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {profile?.isVerified ? 'Verified' : 'Pending Verification'}
                  </span>
                </dd>
              </div>
            </div>

            <div className="bg-gray-50 px-6 py-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Available</dt>
                <dd className="mt-1">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      profile?.isAvailable
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {profile?.isAvailable ? 'Available' : 'Unavailable'}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Member Since</dt>
                <dd className="mt-1 text-gray-900">
                  {profile?.createdAt
                    ? new Date(profile.createdAt).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })
                    : 'Unknown'}
                </dd>
              </div>
            </div>
          </dl>
        </div>

        {/* Stats section */}
        <div className="border-t border-gray-200 px-6 py-4">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Delivery Statistics</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-indigo-50 p-3 rounded-lg">
              <div className="text-sm text-indigo-700">Completed</div>
              <div className="text-xl font-bold text-indigo-900 mt-1">
                {stats?.completedDeliveries || 0}
              </div>
            </div>
            <div className="bg-green-50 p-3 rounded-lg">
              <div className="text-sm text-green-700">Rating</div>
              <div className="text-xl font-bold text-green-900 mt-1 flex items-center">
                {stats?.rating ? stats.rating.toFixed(1) : 'N/A'} 
                {stats?.rating ? <MdStar className="ml-1 text-yellow-500" size={16} /> : null}
              </div>
            </div>
            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="text-sm text-blue-700">Total Ratings</div>
              <div className="text-xl font-bold text-blue-900 mt-1">
                {stats?.totalRatings || 0}
              </div>
            </div>
            <div className="bg-yellow-50 p-3 rounded-lg">
              <div className="text-sm text-yellow-700">Active Orders</div>
              <div className="text-xl font-bold text-yellow-900 mt-1">
                {profile?.activeOrders?.length || 0}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile; 