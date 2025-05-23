import React from 'react';
import { MdRestaurant, MdDirections, MdHome, MdCheck } from 'react-icons/md';

const DeliveryProgressBar = ({ status }) => {
  // Define the delivery stages and their corresponding statuses
  const stages = [
    { key: 'confirmed', label: 'Confirmed', icon: MdCheck },
    { key: 'preparing', label: 'Preparing', icon: MdRestaurant },
    { key: 'out_for_delivery', label: 'On the way', icon: MdDirections },
    { key: 'delivered', label: 'Delivered', icon: MdHome }
  ];

  // Find the current stage index
  const currentStageIndex = stages.findIndex(stage => stage.key === status) || 0;
  
  // Calculate progress percentage
  const progressPercentage = Math.round((currentStageIndex / (stages.length - 1)) * 100);

  return (
    <div className="py-4 px-6">
      {/* Progress percentage bar */}
      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden mb-6">
        <div 
          className="h-full bg-green-500 transition-all duration-500 ease-in-out"
          style={{ width: `${progressPercentage}%` }}
        ></div>
      </div>
      
      {/* Stages with icons */}
      <div className="flex justify-between">
        {stages.map((stage, index) => {
          const StageIcon = stage.icon;
          const isActive = index <= currentStageIndex;
          const isCurrent = index === currentStageIndex;
          
          return (
            <div key={stage.key} className="flex flex-col items-center flex-1">
              <div className={`
                relative w-10 h-10 rounded-full flex items-center justify-center mb-2
                ${isCurrent ? 'bg-green-500 text-white' : 
                  isActive ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}
                ${isCurrent ? 'ring-4 ring-green-100' : ''}
                transition-all duration-300
              `}>
                <StageIcon size={20} />
                {isCurrent && (
                  <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                  </span>
                )}
              </div>
              <span className={`text-xs font-medium ${
                isActive ? 'text-gray-800' : 'text-gray-400'
              }`}>
                {stage.label}
              </span>
              
              {/* Connecting line (except for the last item) */}
              {index < stages.length - 1 && (
                <div className="hidden sm:block absolute h-0.5 bg-gray-200 top-5 left-0" style={{
                  width: `calc(100% - ${stages.length * 20}px)`,
                  left: `${10 + index * (100 / (stages.length - 1))}%`,
                  transform: 'translateX(-50%)'
                }}></div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DeliveryProgressBar; 