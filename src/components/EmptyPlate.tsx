import React from 'react';
import { EmptyPlate as EmptyPlateType } from '../types/game';
import { sprite } from "../lib/assets";

const paperPlate = sprite("paperplate.png");

interface EmptyPlateProps {
  plate: EmptyPlateType;
}

const LANDSCAPE_LANE_POSITIONS = [20, 40, 60, 80]; // match LandscapeCustomer & PizzaSlice

const EmptyPlate: React.FC<EmptyPlateProps> = ({ plate }) => {
  // Safe helpers (SSR-friendly)
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

  // Match PizzaSlice logic exactly
  const topPercent =
    isMobile && isLandscape
      ? LANDSCAPE_LANE_POSITIONS[plate.lane]
      : plate.lane * 25 + 6;

  return (
    <div
      className="absolute w-[10%] aspect-square transition-all duration-100 flex items-center justify-center"
      style={{
        left: `${plate.position}%`,
        top: `${topPercent}%`,
      }}
    >
      {/* Empty plate image */}
      <img
        src=paperPlate
        alt="empty plate"
        className="absolute inset-0 w-[80%] h-[80%] object-contain"
        style={{ zIndex: 1 }}
      />
    </div>
  );
};

export default EmptyPlate;
