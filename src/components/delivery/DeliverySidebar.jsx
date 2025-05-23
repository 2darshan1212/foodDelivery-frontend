import React from 'react';
import { useSelector } from 'react-redux';
import { NavLink } from 'react-router-dom';
import { MdDashboard, MdLocationOn, MdDeliveryDining, MdHistory, MdPerson } from 'react-icons/md';

const DeliverySidebar = ({ isMobile = false }) => {
  const { activeOrders } = useSelector((state) => state.delivery);
  const activeOrdersCount = activeOrders?.length || 0;

  const navItems = [
    {
      name: 'Dashboard',
      path: '/deliver/dashboard',
      icon: <MdDashboard size={24} />,
    },
    {
      name: 'Nearby Orders',
      path: '/deliver/nearby-orders',
      icon: <MdLocationOn size={24} />,
    },
    {
      name: 'My Deliveries',
      path: '/deliver/my-deliveries',
      icon: <MdDeliveryDining size={24} />,
      badge: activeOrdersCount > 0 ? activeOrdersCount : null,
    },
    {
      name: 'History',
      path: '/deliver/history',
      icon: <MdHistory size={24} />,
    },
    {
      name: 'Profile',
      path: '/deliver/profile',
      icon: <MdPerson size={24} />,
    },
  ];

  if (isMobile) {
    return (
      <div className="flex justify-around items-center">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center p-2 ${
                isActive ? 'text-indigo-600' : 'text-gray-600'
              }`
            }
          >
            <div className="relative">
              {item.icon}
              {item.badge && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {item.badge}
                </span>
              )}
            </div>
            <span className="text-xs mt-1">{item.name}</span>
          </NavLink>
        ))}
      </div>
    );
  }

  return (
    <div className="h-full py-6 px-3">
      <nav className="space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center px-3 py-3 rounded-md ${
                isActive
                  ? 'bg-indigo-50 text-indigo-600'
                  : 'text-gray-700 hover:bg-gray-50'
              }`
            }
          >
            <div className="relative mr-3">
              {item.icon}
              {item.badge && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {item.badge}
                </span>
              )}
            </div>
            <span className="text-sm font-medium">{item.name}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
};

export default DeliverySidebar; 