import React from 'react';
import { PowerUpType } from '../types/game';

const dogeAlert = sprite("doge-power-up-alert");

interface PowerUpAlertProps {
  powerUpType: PowerUpType;
  chefLane: number;
}

const PowerUpAlert: React.FC<PowerUpAlertProps> = ({ powerUpType }) => {
  const getAlertContent = () => {
    switch (powerUpType) {
      case 'doge':
        return {
          image: dogeAlert,
          scale: 6,
        };
      default:
        return null;
    }
  };

  const content = getAlertContent();
  if (!content) return null;

  const scale = content.scale || 1;

  return (
    <div
      className="absolute pointer-events-none z-10"
      style={{
        top: '50%',
        left: '50%',
        transform: `translate(-50%, -50%) scale(${scale})`,
        transformOrigin: 'center center',
      }}
    >
      <div className="p-4 text-center">
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
