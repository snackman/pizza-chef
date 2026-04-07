import React from 'react';
import { PizzaSlice as PizzaSliceType } from '../types/game';
import { sprite } from '../lib/assets';


interface PizzaSliceProps {
  slice: PizzaSliceType;
}

const PizzaSlice: React.FC<PizzaSliceProps> = ({ slice }) => {
  // Sprites (resolved at render time for sprite sheet support)
  const slicePlateImg = sprite("slice-plate.png");
  const topPercent = slice.lane * 25 + 6;

  return (
    <div
      className="absolute w-[10%] aspect-square transition-all duration-100 flex items-center justify-center"
      style={{
        left: `${slice.position}%`,
        top: `${topPercent}%`,
      }}
    >
      {/* Pizza slice on plate */}
      <img
        src={slicePlateImg}
        alt="pizza slice"
        className="absolute inset-0 w-[80%] h-[80%] object-contain"
        style={{ zIndex: 1 }}
      />

    </div>
  );
};

function arePizzaSlicePropsEqual(prev: PizzaSliceProps, next: PizzaSliceProps): boolean {
  const a = prev.slice;
  const b = next.slice;
  return (
    a.id === b.id &&
    a.position === b.position &&
    a.lane === b.lane
  );
}

export default React.memo(PizzaSlice, arePizzaSlicePropsEqual);
