import React from 'react';
import { PowerUp as PowerUpType } from '../types/game';
import { sprite } from '../lib/assets';

interface PowerUpProps {
  powerUp: PowerUpType;
}

// Declare all sprite URLs once
const beerImg = sprite("beer.png");
const honeyImg = sprite("hothoney.png");
const sundaeImg = sprite("sundae.png");
const dogeImg = sprite("doge.png");
const nyanImg = sprite("nyan.png");
const moltoBennyImg = sprite("moltobenny.png");
const starImg = sprite("star.png");

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
        return dogeImg;
      case 'nyan':
        return nyanImg;
      case 'moltobenny':
        return moltoBennyImg;
      case 'star':
        return starImg;
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
      {image && (
        <img
          src={image}
          alt={powerUp.type}
          className={`w-full h-full object-contain ${
            powerUp.type === 'nyan' ? 'animate-bounce' : ''
          }`}
        />
      )}
    </div>
  );
};

export default PowerUp;
