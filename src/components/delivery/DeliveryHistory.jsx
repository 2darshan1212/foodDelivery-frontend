import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchAgentProfile } from '../../redux/deliverySlice';
import { MdDeliveryDining, MdHistory } from 'react-icons/md';
import { FiPackage, FiClock } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';

const DeliveryHistory = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { 
    isDeliveryAgent, 
    deliveryHistory, 
    isProfileLoading, 
    stats,
  } = useSelector((state) => state.delivery);

  // Fetch agent profile to get delivery history
  useEffect(() => {
    if (isDeliveryAgent) {
      dispatch(fetchAgentProfile());
    }
  }, [dispatch, isDeliveryAgent]);

  if (!isDeliveryAgent) {
    return (
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-sm p-6">
        <div className="text-center">
          <MdDeliveryDining className="mx-auto text-gray-400" size={80} />
          <h2 className="text-xl font-semibold mt-4">You are not registered as a delivery agent</h2>
          <p className="text-gray-600 mt-2">
            Register first to view your delivery history
          </p>
          <button
            onClick={() => navigate("/deliver/register")}
            className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-6 rounded-md"
          >
            Register Now
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

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-semibold text-gray-800">Delivery History</h1>
        <div className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-md">
          <span className="font-medium">{stats?.completedDeliveries || 0}</span> deliveries completed
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="text-sm font-medium text-gray-500">Total Completed</div>
          <div className="text-2xl font-bold mt-2 text-gray-800">{stats?.completedDeliveries || 0}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="text-sm font-medium text-gray-500">Average Rating</div>
          <div className="text-2xl font-bold mt-2 text-gray-800">{stats?.rating ? stats.rating.toFixed(1) : "N/A"}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="text-sm font-medium text-gray-500">Total Ratings</div>
          <div className="text-2xl font-bold mt-2 text-gray-800">{stats?.totalRatings || 0}</div>
        </div>
      </div>

      {!deliveryHistory || deliveryHistory.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <MdHistory className="mx-auto text-gray-400" size={64} />
          <h3 className="text-lg font-medium text-gray-800 mt-4">No Delivery History</h3>
          <p className="text-gray-600 mt-2 max-w-md mx-auto">
            You haven't completed any deliveries yet.
            Check nearby orders to start delivering.
          </p>
          <button
            onClick={() => navigate('/deliver/nearby-orders')}
            className="mt-6 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-6 rounded-md"
          >
            Find Orders to Deliver
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {/* History table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Order ID
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date & Time
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Delivery Address
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Items
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {deliveryHistory.map((order) => (
                  <tr key={order._id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <FiPackage className="text-gray-500 mr-2" />
                        <span className="text-gray-800">{order._id ? order._id.substr(-6) : 'Unknown'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        {order.actualDeliveryTime ? (
                          new Date(order.actualDeliveryTime).toLocaleString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                        ) : (
                          new Date(order.updatedAt).toLocaleString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-800 line-clamp-1">{order.deliveryAddress || 'Address not available'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-800">
                        {order.items && order.items.length ? `${order.items.length} ${order.items.length === 1 ? 'item' : 'items'}` : 'No items'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="text-sm font-medium text-gray-900">${order.total ? order.total.toFixed(2) : '0.00'}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeliveryHistory; 