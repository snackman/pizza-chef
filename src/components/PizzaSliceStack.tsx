import React from 'react';
https://i.imgur.com/xdnZuJm.png;

interface PizzaSliceStackProps {
  sliceCount: number;
  maxDisplay?: number;
}

const PizzaSliceStack: React.FC<PizzaSliceStackProps> = ({ sliceCount }) => {
  if (sliceCount === 0) return null;

  const clampedCount = Math.min(Math.max(sliceCount, 1), 8);
  let imageUrl;
  if (clampedCount === 1) {imageUrl = "https://i.imgur.com/xdnZuJm.png"}
  else {imageUrl = `/sprites/${clampedCount}slicepizzapan.png`};

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