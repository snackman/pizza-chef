import React from 'react';
import { PowerUpType } from '../types/game';

interface PowerUpAlertProps {
  powerUpType: PowerUpType;
  chefLane: number;
}

const PowerUpAlert: React.FC<PowerUpAlertProps> = ({ powerUpType, chefLane }) => {
  const getAlertContent = () => {
    switch (powerUpType) {
      case 'doge':
        return {
          image: 'https://i.imgur.com/VgoeQo4.png', // Using the provided Doge image
        };
      case 'nyan':
        return {
          image: 'https://images.com/image.png',
          title: 'Nyan Cat',
          subtitle: 'Rainbow Trail!',
          backgroundColor: 'bg-gradient-to-r from-purple-500 to-pink-500',
          textColor: 'text-white'
        };
      default:
        return null;
    }
  };

  const content = getAlertContent();
  if (!content) return null;

  // Calculate position based on chef lane and screen orientation
  const isLandscape = typeof window !== 'undefined' ? window.innerWidth > window.innerHeight : false;
  
  let chefTopPosition, chefLeftPosition;
  if (isLandscape) {
    // Landscape positioning (same as LandscapeGameBoard.tsx)
    chefTopPosition = 30 + chefLane * 20;
    chefLeftPosition = 20;
  } else {
    // Portrait positioning (same as GameBoard.tsx)
    chefTopPosition = chefLane * 25 + 13;
    chefLeftPosition = 10;
  }

  return (
    <div 
      className="absolute pointer-events-none z-10"
      style={{
        top: `${chefTopPosition}%`,
        left: `${chefLeftPosition}%`,
        transform: 'translate(-50%, -50%)',
      }}
    >
      <div className={`${content.backgroundColor} ${content.textColor} p-4 rounded-xl shadow-2xl text-center animate-pulse`}>
        <div className="mb-2">
          <img 
            src={content.image} 
            alt={powerUpType} 
            className="w-16 h-16 mx-auto object-contain"
          />
        </div>
        {content.title && (
          <h2 className="text-lg font-bold mb-1" style={{ color: '#3B82F6' }}>
            {content.title}
          </h2>
        )}
        <p className="text-sm font-semibold" style={{ color: '#10B981' }}>
          {content.subtitle}
        </p>
      </div>
    </div>
  );
};

export default PowerUpAlert;
