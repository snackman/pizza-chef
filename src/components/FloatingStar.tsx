import React, { useEffect, useState } from 'react';

interface FloatingStarProps {
  x: number;
  y: number;
  delta: number;
  onDone: () => void;
}

const FloatingStar: React.FC<FloatingStarProps> = ({
  x,
  y,
  delta,
  onDone,
}) => {
  const [style, setStyle] = useState({
    transform: 'translateY(0px) scale(1)',
    opacity: 1,
  });

  useEffect(() => {
    requestAnimationFrame(() => {
      setStyle({
        transform: 'translateY(-40px) scale(1.1)',
        opacity: 0,
      });
    });

    const timeout = setTimeout(onDone, 700);
    return () => clearTimeout(timeout);
  }, [onDone]);

  return (
    <div
      className={`absolute pointer-events-none select-none font-bold text-lg ${
        delta > 0 ? 'text-yellow-400' : 'text-red-400'
      }`}
      style={{
        left: x,
        top: y,
        transition: 'transform 0.7s ease-out, opacity 0.7s ease-out',
        ...style,
      }}
    >
      {delta > 0 ? `+${delta} ⭐` : `${delta} ⭐`}
    </div>
  );
};

export default FloatingStar;
