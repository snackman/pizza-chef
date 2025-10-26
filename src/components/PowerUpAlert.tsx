import React from 'react';
import { PowerUpType } from '../types/game';

interface PowerUpAlertProps {
  powerUpType: PowerUpType;
}

const PowerUpAlert: React.FC<PowerUpAlertProps> = ({ powerUpType }) => {
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`${content.backgroundColor} ${content.textColor} p-8 rounded-xl shadow-2xl text-center max-w-md mx-4 animate-pulse`}>
        <div className="mb-4">
          <img 
            src={content.image} 
            alt={powerUpType} 
            className="w-32 h-32 mx-auto object-contain"
          />
        </div>
        {content.title && (
          <h2 className="text-3xl font-bold mb-2" style={{ color: '#3B82F6' }}>
            {content.title}
          </h2>
        )}
        <p className="text-xl font-semibold" style={{ color: '#10B981' }}>
          {content.subtitle}
        </p>
      </div>
    </div>
  );
};

export default PowerUpAlert;
