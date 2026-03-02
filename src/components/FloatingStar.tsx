import { useEffect, useState } from 'react';
import { Star } from 'lucide-react';

interface FloatingStarProps {
  id: string;
  isGain: boolean; // true = green +, false = red -
  count?: number; // number of stars to show (default 1)
  lane: number;
  position: number;
  onComplete: (id: string) => void;
}

export default function FloatingStar({ id, isGain, count = 1, lane, position, onComplete }: FloatingStarProps) {
  const [yOffset, setYOffset] = useState(0);
  const [opacity, setOpacity] = useState(1);

  useEffect(() => {
    const startTime = Date.now();
    const duration = 2000;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      setYOffset(progress * -30);
      setOpacity(1 - progress);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        onComplete(id);
      }
    };

    requestAnimationFrame(animate);
  }, [id, onComplete]);

  const lanePosition = 15 + (lane * 22);

  return (
    <div
      className="absolute pointer-events-none font-black text-xl z-50 flex items-center"
      style={{
        left: `${position}%`,
        top: `${lanePosition + yOffset}%`,
        opacity,
        transform: 'translateX(-50%)',
      }}
    >
      <span className={isGain ? 'text-green-500' : 'text-red-500'}>
        {isGain ? '+' : '-'}
      </span>
      {Array.from({ length: count }, (_, i) => (
        <Star
          key={i}
          className={`w-5 h-5 fill-current ${isGain ? 'text-green-500' : 'text-red-500'}`}
        />
      ))}
    </div>
  );
}
