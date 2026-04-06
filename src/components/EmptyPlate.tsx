import React from 'react';
import { EmptyPlate as EmptyPlateType } from '../types/game';
import { sprite } from '../lib/assets';

const paperPlateImg = sprite("paperplate.png");

interface EmptyPlateProps {
  plate: EmptyPlateType;
}

const OVEN_POSITION = 10; // Target X position (near the ovens)

const EmptyPlate: React.FC<EmptyPlateProps> = ({ plate }) => {
  // Calculate visual lane for angled throws
  let visualLane = plate.lane;

  if (plate.targetLane !== undefined && plate.startLane !== undefined && plate.startPosition !== undefined) {
    // Interpolate lane based on horizontal progress
    const totalDistance = plate.startPosition - OVEN_POSITION;
    const traveled = plate.startPosition - plate.position;
    const progress = Math.min(1, Math.max(0, traveled / totalDistance));

    visualLane = plate.startLane + (plate.targetLane - plate.startLane) * progress;
  }

  const topPercent = visualLane * 25 + 6;

  return (
    <div
      className="absolute w-[10%] aspect-square flex items-center justify-center"
      style={{
        left: `${plate.position}%`,
        top: `${topPercent}%`,
      }}
    >
      {/* Empty plate image */}
      <img
        src={paperPlateImg}
        alt="empty plate"
        className="absolute inset-0 w-[80%] h-[80%] object-contain"
        style={{ zIndex: 1 }}
      />
    </div>
  );
};

function areEmptyPlatePropsEqual(prev: EmptyPlateProps, next: EmptyPlateProps): boolean {
  const a = prev.plate;
  const b = next.plate;
  return (
    a.id === b.id &&
    a.position === b.position &&
    a.lane === b.lane &&
    a.targetLane === b.targetLane &&
    a.startLane === b.startLane &&
    a.startPosition === b.startPosition
  );
}

export default React.memo(EmptyPlate, areEmptyPlatePropsEqual);
