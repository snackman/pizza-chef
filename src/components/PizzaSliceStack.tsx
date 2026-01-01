import React from 'react';
import { sprite } from '../lib/assets';

interface PizzaSliceStackProps {
  sliceCount: number;
  maxDisplay?: number;
}

const PizzaSliceStack: React.FC<PizzaSliceStackProps> = ({ sliceCount }) => {
  if (sliceCount === 0) return (
    <img
      src={sprite("pizzapan.png")}
      className="w-full h-full object-contain"
      alt="empty pan"
    /> null;

  const clampedCount = Math.min(Math.max(sliceCount, 1), 8);

  // Cloudflare-hosted sprite
  const imageUrl = sprite(`${clampedCount}slicepizzapan.png`);

  return (
    <div className="relative w-full h-full">
      <img
        src={imageUrl}
        alt={`${clampedCount} pizza slice${clampedCount > 1 ? 's' : ''}`}
        className="w-full h-full object-contain"
      />
    </div>
  );
};

export default PizzaSliceStack;
