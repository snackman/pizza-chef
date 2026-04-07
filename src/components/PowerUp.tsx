import React from 'react';
import { PowerUp as PowerUpType } from '../types/game';
import { sprite } from '../lib/assets';

// Power-up images (served from Cloudflare)

interface PowerUpProps {
  powerUp: PowerUpType;
  boardWidth: number;
  boardHeight: number;
}

const PowerUp: React.FC<PowerUpProps> = ({ powerUp, boardWidth, boardHeight }) => {
  // Sprites (resolved at render time for sprite sheet support)
  const beerImg = sprite("beer.png");
  const honeyImg = sprite("hot-honey.png");
  const sundaeImg = sprite("sundae.png");
  const dogeImg = sprite("doge.png");
  const nyanImg = sprite("nyan-cat.png");
  const moltobennyImg = sprite("molto-benny.png");
  const starImg = sprite("star.png");
  const pepeImg = sprite("pepe.png");
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
        return dogeImg;
      case 'nyan':
        return nyanImg;
      case 'moltobenny':
        return moltobennyImg;
      case 'star':
        return starImg;
      case 'pepe':
        return pepeImg;
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
        // Added zIndex here to ensure it floats above oven UI
        zIndex: 50,
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

function arePowerUpPropsEqual(prev: PowerUpProps, next: PowerUpProps): boolean {
  const a = prev.powerUp;
  const b = next.powerUp;
  return (
    a.id === b.id &&
    a.position === b.position &&
    a.lane === b.lane &&
    a.type === b.type &&
    prev.boardWidth === next.boardWidth &&
    prev.boardHeight === next.boardHeight
  );
}

export default React.memo(PowerUp, arePowerUpPropsEqual);