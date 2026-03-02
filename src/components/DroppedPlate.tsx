import React, { useEffect, useState } from 'react';
import { DroppedPlate as DroppedPlateType } from '../types/game';
import { sprite } from '../lib/assets';

const slicePlateImg = sprite("slice-plate.png");

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
      <img src={slicePlateImg} alt="dropped plate" className="w-full h-full object-contain" />
    </div>
  );
};

function areDroppedPlatePropsEqual(prev: DroppedPlateProps, next: DroppedPlateProps): boolean {
  const a = prev.droppedPlate;
  const b = next.droppedPlate;
  return (
    a.id === b.id &&
    a.lane === b.lane &&
    a.position === b.position &&
    a.startTime === b.startTime
  );
}

export default React.memo(DroppedPlate, areDroppedPlatePropsEqual);
