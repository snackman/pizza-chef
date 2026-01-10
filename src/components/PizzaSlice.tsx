import React from 'react';
import { PizzaSlice as PizzaSliceType } from '../types/game';
import { sprite } from '../lib/assets';

const slicePlateImg = sprite("slice-plate.png");

interface PizzaSliceProps {
  slice: PizzaSliceType;
}

const PizzaSlice: React.FC<PizzaSliceProps> = ({ slice }) => {
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

export default PizzaSlice;
