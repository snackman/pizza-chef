import React from 'react';
import { PizzaSlice as PizzaSliceType } from '../types/game';

interface PizzaSliceProps {
  slice: PizzaSliceType;
}

const LANDSCAPE_LANE_POSITIONS = [20, 40, 60, 80]; // match LandscapeCustomer

const PizzaSlice: React.FC<PizzaSliceProps> = ({ slice }) => {
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
    const handleResize = () => {
      setIsLandscape(getIsLandscape());
      setIsMobile(getIsMobile());
    };
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  const topPercent =
    isMobile && isLandscape
      ? LANDSCAPE_LANE_POSITIONS[slice.lane]
      : slice.lane * 25 + 6;

  return (
    <div
      className="absolute w-[10%] aspect-square transition-all duration-100 flex items-center justify-center"
      style={{
        left: `${slice.position}%`,
        top: `${topPercent}%`,
      }}
    >
      {/* White plate image underneath */}
      <img
        src="https://i.imgur.com/vUT4nnz.png"
        alt="plate"
        className="absolute inset-0 w-[80%] h-[80%] object-contain"
        style={{ zIndex: 1 }}
      />

      {/* Pizza on top - centered within plate */}
      <div
        className="absolute inset-0 w-[70%] h-[70%] flex items-center justify-center z-10"
        style={{ fontSize: 'clamp(1.5rem, 4vw, 2.5rem)' }}
      >
        🍕
      </div>
    </div>
  );
};

export default PizzaSlice;
