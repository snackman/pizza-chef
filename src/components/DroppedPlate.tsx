import React, { useEffect, useState } from 'react';
import { DroppedPlate as DroppedPlateType } from '../types/game';
import paperPlateImg from '/Sprites/paperplate.png';
import fullPizzaImg from '/Sprites/fullpizza.png';

interface DroppedPlateProps {
  droppedPlate: DroppedPlateType;
}

const BLINK_DURATION = 250;
const TOTAL_DURATION = 1000;

const DroppedPlate: React.FC<DroppedPlateProps> = ({ droppedPlate }) => {
  const [visible, setVisible] = useState(true);
  const elapsed = Date.now() - droppedPlate.startTime;

  useEffect(() => {
    if (elapsed >= TOTAL_DURATION) {
      setVisible(false);
      return;
    }

    const blinkInterval = setInterval(() => {
      const currentElapsed = Date.now() - droppedPlate.startTime;
      const blinkCycle = Math.floor(currentElapsed / BLINK_DURATION);
      setVisible(blinkCycle % 2 === 0);
    }, BLINK_DURATION);

    return () => clearInterval(blinkInterval);
  }, [droppedPlate.startTime, elapsed]);

  if (!visible || elapsed >= TOTAL_DURATION) {
    return null;
  }

  return (
    <div
      className="absolute w-[6%] aspect-square transition-all duration-100"
      style={{
        left: `${droppedPlate.position}%`,
        top: `${droppedPlate.lane * 25 + 10}%`,
        opacity: visible ? 1 : 0,
      }}
    >
      <img src={paperPlateImg} alt="dropped plate" className="w-full h-full object-contain" />
      {droppedPlate.hasSlice && (
        <img
          src={fullPizzaImg}
          alt="pizza slice"
          className="absolute top-0 left-0 w-full h-full object-contain"
          style={{ transform: 'scale(0.8)' }}
        />
      )}
    </div>
  );
};

export default DroppedPlate;
