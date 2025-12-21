import React from 'react';
import { PowerUpType } from '../types/game';

interface DebugPanelProps {
  onActivatePowerUp: (type: PowerUpType) => void;
  inventory?: Partial<Record<PowerUpType, number>>;
}

const DebugPanel: React.FC<DebugPanelProps> = ({
  onActivatePowerUp,
  inventory = {
    honey: 2,
    'ice-cream': 2,
    beer: 3,
    star: 1,
    doge: 0,
    nyan: 3,
  },
}) => {
  const powerUps: {
    type: PowerUpType;
    label: string;
    icon: string;
    color: string;
  }[] = [
    { type: 'honey', label: 'Hot Honey', icon: '/Sprites/hothoney.png', color: 'bg-orange-500 hover:bg-orange-600' },
    { type: 'ice-cream', label: 'Ice Cream', icon: '/Sprites/sundae.png', color: 'bg-cyan-500 hover:bg-cyan-600' },
    { type: 'beer', label: 'Beer', icon: '/Sprites/beer.png', color: 'bg-amber-500 hover:bg-amber-600' },
    { type: 'star', label: 'Star Power', icon: '/Sprites/starpower.png', color: 'bg-yellow-500 hover:bg-yellow-600' },
    { type: 'doge', label: 'Doge', icon: '/Sprites/doge.png', color: 'bg-yellow-600 hover:bg-yellow-700' },
    { type: 'nyan', label: 'Nyan Cat', icon: '/Sprites/nyancat.png', color: 'bg-pink-500 hover:bg-pink-600' },
  ];

  return (
    <div className="relative z-50 pointer-events-auto w-full max-w-6xl mx-auto p-2 bg-gray-800/90 rounded-xl">
      <div className="flex items-center gap-2 flex-wrap justify-center">
        {powerUps.map(({ type, label, icon, color }) => {
          const count = inventory[type] ?? 0;
          const disabled = count <= 0;

          return (
            <button
              key={type}
              type="button"
              onClick={() => !disabled && onActivatePowerUp(type)}
              disabled={disabled}
              className={`
                relative overflow-hidden
                ${color}
                ${disabled ? 'opacity-50 grayscale cursor-not-allowed' : ''}
                touch-manipulation select-none
                text-white px-2 sm:px-3 py-1.5
                rounded-lg text-xs font-medium
                flex items-center gap-2
                transition-all shadow-md
                active:scale-95
                ring-1 ring-white/15 hover:ring-white/25
              `}
            >
              {/* Light semi-transparent tile overlay (applies to whole button) */}
              <div className="absolute inset-0 bg-white/20 pointer-events-none" />

              {/* Inventory badge */}
              <div className="absolute -top-1 -right-1 bg-black/80 text-white text-[10px] px-1.5 py-0.5 rounded-full leading-none z-10">
                ×{count}
              </div>

              <img
                src={icon}
                alt={label}
                className="relative z-10 w-8 h-8 object-contain"
                draggable={false}
              />

              {/* Hide labels on mobile */}
              <span className="relative z-10 hidden sm:inline whitespace-nowrap">
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default DebugPanel;
