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
          image: 'https://i.imgur.com/n0FtlUg.png',
          scale: 3, // 3x size multiplier
        };
      case 'nyan':
        return {
          image: '/Sprites/nyancat.png',
          scale: 3
        };
      default:
        return null;
    }
  };

  const content = getAlertContent();
  if (!content) return null;

  const isLandscape = typeof window !== 'undefined' ? window.innerWidth > window.innerHeight : false;
  
  let chefTopPosition, chefLeftPosition;
  if (isLandscape) {
    chefTopPosition = 30 + chefLane * 20;
    chefLeftPosition = 20;
  } else {
    chefTopPosition = chefLane * 25 + 13;
    chefLeftPosition = 10;
  }

  const scale = content.scale || 1;

  return (
    <div 
      className="absolute pointer-events-none z-10"
      style={{
        top: `${chefTopPosition}%`,
        left: `${chefLeftPosition}%`,
        transform: `translate(-50%, -50%) scale(${scale})`,
        transformOrigin: 'center center',
      }}
    >
      <div className={`p-4 text-center animate-pulse`}>
        <div className="mb-2">
          <img 
            src={content.image} 
            alt={powerUpType} 
            className="w-16 h-16 mx-auto object-contain"
          />
        </div>
      </div>
    </div>
  );
};

export default PowerUpAlert;
