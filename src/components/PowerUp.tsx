import React from 'react';
import { PowerUp as PowerUpType } from '../types/game';
import { sprite } from '../lib/assets';

// Power-up images (served from Cloudflare)
const beerImg = sprite("beer.png");
const honeyImg = sprite("hot-honey.png");
const sundaeImg = sprite("sundae.png");

interface PowerUpProps {
  powerUp: PowerUpType;
  boardWidth: number;
  boardHeight: number;
}

const PowerUp: React.FC<PowerUpProps> = ({ powerUp, boardWidth, boardHeight }) => {
  // Original coordinate system (percent of board)
  const xPct = powerUp.position;
  const yPct = powerUp.lane * 25 + 6;

  // Convert % of board → px
  const xPx = (xPct / 100) * boardWidth;
  const yPx = (yPct / 100) * boardHeight;

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
      case 'moltobenny':
        return 'https://i.imgur.com/5goVcAS.png';
      case 'star':
        return 'https://i.imgur.com/hw0jkrq.png';
      default:
        return null;
    }
  };

  const image = getImage();

  // Avoid doing weird transforms before we know board size
  const ready = boardWidth > 0 && boardHeight > 0;

  return (
    <div
      className="absolute w-[8%] aspect-square flex items-center justify-center"
      style={{
        left: 0,
        top: 0,
        transform: ready ? `translate3d(${xPx}px, ${yPx}px, 0)` : undefined,
        willChange: 'transform',
        transition: 'transform 100ms linear',
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
