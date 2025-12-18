import { useEffect, useState } from 'react';

interface FloatingScoreProps {
  id: string;
  points: number;
  lane: number;
  position: number;
  onComplete: (id: string) => void;
}

export default function FloatingScore({ id, points, lane, position, onComplete }: FloatingScoreProps) {
  const [yOffset, setYOffset] = useState(0);
  const [opacity, setOpacity] = useState(1);

  useEffect(() => {
    const startTime = Date.now();
    const duration = 1000;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      setYOffset(progress * -50);
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

  const color = points >= 1000 ? '#dc2626' :
                points >= 150 ? '#f59e0b' :
                points >= 100 ? '#10b981' :
                '#6b7280';

  return (
    <div
      className="absolute pointer-events-none font-bold text-xl z-50"
      style={{
        left: `${position}%`,
        top: `${lanePosition + yOffset}%`,
        opacity,
        color,
        textShadow: '0 0 4px rgba(0,0,0,0.5), 0 0 8px rgba(255,255,255,0.3)',
        transform: 'translateX(-50%)',
      }}
    >
      +{points.toLocaleString()}
    </div>
  );
}
