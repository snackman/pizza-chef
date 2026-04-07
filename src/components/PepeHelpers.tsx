import React from 'react';
import { sprite } from '../lib/assets';
import { PepeHelpers as PepeHelpersType } from '../types/game';
import PizzaSliceStack from './PizzaSliceStack';


interface PepeHelpersProps {
  helpers: PepeHelpersType | undefined;
}

const PepeHelpers: React.FC<PepeHelpersProps> = ({ helpers }) => {
  // Sprites (resolved at render time for sprite sheet support)
  const francoPepeImg = sprite("franco-pepe.png");
  const frankPepeImg = sprite("frank-pepe.png");
  if (!helpers?.active) return null;

  return (
    <>
      {/* Franco-Pepe */}
      <div
        className="absolute flex items-center justify-center"
        style={{
          left: '5%',
          top: `${helpers.franco.lane * 25 + 13}%`,
          width: '10%',
          aspectRatio: '1 / 1',
          transform: 'translate3d(0, -50%, 0)',
          zIndex: 10,
          transition: 'top 150ms ease-out',
        }}
      >
        <img
          src={francoPepeImg}
          alt="Franco-Pepe helper"
          className="w-full h-full object-contain"
        />
        {/* Franco's slice stack */}
        {helpers.franco.availableSlices > 0 && (
          <div
            className="absolute"
            style={{
              left: '55%',
              top: '90%',
              width: '91%',
              height: '91%',
              transform: 'translateY(-50%)',
              pointerEvents: 'none',
            }}
          >
            <PizzaSliceStack sliceCount={helpers.franco.availableSlices} />
          </div>
        )}
      </div>

      {/* Frank-Pepe */}
      <div
        className="absolute flex items-center justify-center"
        style={{
          left: '5%',
          top: `${helpers.frank.lane * 25 + 13}%`,
          width: '10%',
          aspectRatio: '1 / 1',
          transform: 'translate3d(0, -50%, 0)',
          zIndex: 10,
          transition: 'top 150ms ease-out',
        }}
      >
        <img
          src={frankPepeImg}
          alt="Frank-Pepe helper"
          className="w-full h-full object-contain"
        />
        {/* Frank's slice stack */}
        {helpers.frank.availableSlices > 0 && (
          <div
            className="absolute"
            style={{
              left: '55%',
              top: '90%',
              width: '91%',
              height: '91%',
              transform: 'translateY(-50%)',
              pointerEvents: 'none',
            }}
          >
            <PizzaSliceStack sliceCount={helpers.frank.availableSlices} />
          </div>
        )}
      </div>
    </>
  );
};

function arePepeHelpersPropsEqual(prev: PepeHelpersProps, next: PepeHelpersProps): boolean {
  const a = prev.helpers;
  const b = next.helpers;

  // Both undefined or both falsy
  if (!a && !b) return true;
  if (!a || !b) return false;

  return (
    a.active === b.active &&
    a.franco.lane === b.franco.lane &&
    a.franco.availableSlices === b.franco.availableSlices &&
    a.frank.lane === b.frank.lane &&
    a.frank.availableSlices === b.frank.availableSlices
  );
}

export default React.memo(PepeHelpers, arePepeHelpersPropsEqual);
