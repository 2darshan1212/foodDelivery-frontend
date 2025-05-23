import React from 'react';
import { MdDirections, MdStar, MdAttachMoney, MdLocalShipping, MdAlarm, MdSpeed } from 'react-icons/md';

const DeliveryMetrics = ({ stats = {} }) => {
  const {
    completedDeliveries = 0,
    rating = 0,
    totalRatings = 0,
    estimatedEarnings = 0,
    totalDistance = 0,
    averageTime = 0
  } = stats;

  // Calculate metrics
  const formattedRating = rating.toFixed(1);
  const formattedEarnings = estimatedEarnings.toFixed(2);
  const formattedDistance = totalDistance.toFixed(1);
  const averageTimeFormatted = `${Math.floor(averageTime / 60)}m ${averageTime % 60}s`;

  // Create metrics cards
  const metrics = [
    {
      id: 'deliveries',
      label: 'Deliveries',
      value: completedDeliveries,
      icon: MdLocalShipping,
      color: 'bg-blue-500'
    },
    {
      id: 'rating',
      label: 'Rating',
      value: `${formattedRating}/5`,
      subtext: `${totalRatings} ratings`,
      icon: MdStar,
      color: 'bg-yellow-500'
    },
    {
      id: 'earnings',
      label: 'Est. Earnings',
      value: `$${formattedEarnings}`,
      icon: MdAttachMoney,
      color: 'bg-green-500'
    },
    {
      id: 'distance',
      label: 'Distance',
      value: `${formattedDistance} km`,
      icon: MdDirections,
      color: 'bg-purple-500'
    },
    {
      id: 'averageTime',
      label: 'Avg. Time',
      value: averageTimeFormatted,
      icon: MdAlarm,
      color: 'bg-orange-500'
    },
    {
      id: 'efficiency',
      label: 'Efficiency',
      value: `${Math.min(Math.round((completedDeliveries / Math.max(totalRatings, 1)) * 100), 100)}%`,
      icon: MdSpeed,
      color: 'bg-indigo-500'
    }
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="p-4 bg-gray-50 border-b border-gray-200">
        <h3 className="text-base font-medium text-gray-800">Delivery Performance</h3>
        <p className="text-sm text-gray-500">Your delivery stats and metrics</p>
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 divide-x divide-y sm:divide-y-0 divide-gray-200">
        {metrics.map((metric) => (
          <div key={metric.id} className="p-4 flex flex-col items-center text-center">
            <div className={`w-10 h-10 rounded-full ${metric.color} flex items-center justify-center text-white mb-2`}>
              <metric.icon size={20} />
            </div>
            <span className="text-xs text-gray-500">{metric.label}</span>
            <span className="text-lg font-semibold text-gray-800">{metric.value}</span>
            {metric.subtext && <span className="text-xs text-gray-500">{metric.subtext}</span>}
          </div>
        ))}
      </div>
    </div>
  );
};

export default DeliveryMetrics; 