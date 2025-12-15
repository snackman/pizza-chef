import React from 'react';
import { PowerUp as PowerUpType } from '../types/game';
import beerImg from '/Sprites/beer.png';
import honeyImg from '/Sprites/hothoney.png';
import sundaeImg from '/Sprites/sundae.png';

interface PowerUpProps {
  powerUp: PowerUpType;
}

const PowerUp: React.FC<PowerUpProps> = ({ powerUp }) => {
  const leftPosition = powerUp.position;

  const getImage = () => {
    switch (powerUp.type) {
      case 'honey':
        return honeyImg;
      case 'ice-cream':
        return sundaeImg;
      case 'beer':
        return beerImg;
      case 'doge':
        return 'https://i.imgur.com/TqnVUzO.png';
      case 'nyan':
        return 'https://i.imgur.com/OLD9UC8.png';
      case 'star':
      default:
        return null;
    }
  };

  const image = getImage();

  const topPercent = powerUp.lane * 25 + 6;

  return (
    <div
      className="absolute w-[8%] aspect-square transition-all duration-100 flex items-center justify-center"
      style={{
        left: `${leftPosition}%`,
        top: `${topPercent}%`,
      }}
    >
      {image ? (
        <img
          src={image}
          alt={powerUp.type}
          className={`w-full h-full object-contain ${
            powerUp.type === 'nyan' ? 'animate-bounce' : ''
          }`}
        />
      ) : (
        <div style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)' }}>
          ⭐
        </div>
      )}
    </div>
  );
};

export default PowerUp;
