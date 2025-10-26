import React from 'react';
import { PowerUp as PowerUpType } from '../types/game';
import beerImg from '/Sprites/beer.png';
import honeyImg from '/Sprites/hothoney.png';
import sundaeImg from '/Sprites/sundae.png';

interface PowerUpProps {
  powerUp: PowerUpType;
}

const LANDSCAPE_LANE_POSITIONS = [20, 40, 60, 80]; // same as LandscapeCustomer

const PowerUp: React.FC<PowerUpProps> = ({ powerUp }) => {
  const leftPosition = powerUp.position;

  // Helpers that are safe with SSR
  const getIsLandscape = () =>
    typeof window !== 'undefined' ? window.innerWidth > window.innerHeight : true;

  const getIsMobile = () =>
    typeof navigator !== 'undefined'
      ? /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
        (navigator as any).maxTouchPoints > 1
      : false;

  const [isLandscape, setIsLandscape] = React.useState(getIsLandscape);
  const [isMobile, setIsMobile] = React.useState(getIsMobile);

  React.useEffect(() => {
    const onChange = () => {
      setIsLandscape(getIsLandscape());
      setIsMobile(getIsMobile());
    };
    window.addEventListener('resize', onChange);
    window.addEventListener('orientationchange', onChange);
    return () => {
      window.removeEventListener('resize', onChange);
      window.removeEventListener('orientationchange', onChange);
    };
  }, []);

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
        return 'https://i.imgur.com/hZ3eixZ.png';
      case 'star':
      default:
        return null;
    }
  };

  const image = getImage();

  // Only snap to LandscapeCustomer positions when mobile + landscape
  const topPercent =
    isMobile && isLandscape
      ? LANDSCAPE_LANE_POSITIONS[powerUp.lane]
      : powerUp.lane * 25 + 6;

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
        <div
          style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)' }}
          className={powerUp.type === 'star' ? 'animate-pulse' : ''}
        >
          ⭐
        </div>
      )}
    </div>
  );
};

export default PowerUp;
