import React, { useEffect, useState } from 'react';

interface ConfettiPiece {
  id: number;
  left: number;
  delay: number;
  duration: number;
  rotation: number;
  size: number;
}

interface PizzaConfettiProps {
  active: boolean;
  duration?: number; // How long to show confetti in ms
}

const PizzaConfetti: React.FC<PizzaConfettiProps> = ({ active, duration = 5000 }) => {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (active) {
      // Generate confetti pieces
      const newPieces: ConfettiPiece[] = [];
      for (let i = 0; i < 30; i++) {
        newPieces.push({
          id: i,
          left: Math.random() * 100,
          delay: Math.random() * 2,
          duration: 2 + Math.random() * 2,
          rotation: Math.random() * 720 - 360,
          size: 24 + Math.random() * 24,
        });
      }
      setPieces(newPieces);
      setVisible(true);

      // Hide after duration
      const timer = setTimeout(() => {
        setVisible(false);
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [active, duration]);

  if (!visible || pieces.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
      {pieces.map((piece) => (
        <div
          key={piece.id}
          className="absolute animate-confetti-fall"
          style={{
            left: `${piece.left}%`,
            top: '-50px',
            fontSize: `${piece.size}px`,
            animationDelay: `${piece.delay}s`,
            animationDuration: `${piece.duration}s`,
            '--rotation': `${piece.rotation}deg`,
          } as React.CSSProperties}
        >
          🍕
        </div>
      ))}

      <style>{`
        @keyframes confetti-fall {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(var(--rotation, 360deg));
            opacity: 0.7;
          }
        }
        .animate-confetti-fall {
          animation: confetti-fall linear forwards;
        }
      `}</style>
    </div>
  );
};

export default PizzaConfetti;
