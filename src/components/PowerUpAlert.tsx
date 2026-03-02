import React, { useState, useEffect } from 'react';
import { PowerUpType } from '../types/game';
import { sprite } from '../lib/assets';

const dogeAlertImg = sprite("doge-power-up-alert.png");

interface PowerUpAlertProps {
  powerUpType: PowerUpType;
  chefLane: number;
}

const PowerUpAlert: React.FC<PowerUpAlertProps> = ({ powerUpType }) => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1000);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const getAlertContent = () => {
    switch (powerUpType) {
      case 'doge':
        return {
          image: dogeAlertImg,
          scale: 6,
          mobileScale: 2, // 1/3 size on mobile
        };
      default:
        return null;
    }
  };

  const content = getAlertContent();
  if (!content) return null;

  const scale = isMobile ? (content.mobileScale || content.scale / 3) : (content.scale || 1);

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
