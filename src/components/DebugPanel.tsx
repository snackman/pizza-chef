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
  }[] = [
    { type: 'honey', label: 'Hot Honey', icon: '/sprites/hothoney.png' },
    { type: 'ice-cream', label: 'Ice Cream', icon: '/sprites/sundae.png' },
    { type: 'beer', label: 'Beer', icon: '/sprites/beer.png' },
    { type: 'star', label: 'Star Power', icon: '/sprites/starpower.png' },
    { type: 'doge', label: 'Doge', icon: '/sprites/doge.png' },
    { type: 'nyan', label: 'Nyan Cat', icon: '/sprites/nyancat.png' },
  ];

  return (
    <div className="relative z-50 pointer-events-auto w-full max-w-6xl mx-auto p-2 bg-gray-800/90 rounded-xl">
      <div className="flex items-center gap-2 flex-wrap justify-center">
        {powerUps.map(({ type, label, icon }) => {
          const count = inventory[type] ?? 0;
          const disabled = count <= 0;

          return (
            <button
              key={type}
              type="button"
              onClick={() => !disabled && onActivatePowerUp(type)}
              disabled={disabled}
              className={`
                relative
                ${disabled ? 'opacity-40 grayscale cursor-not-allowed' : ''}
                touch-manipulation select-none
                bg-gray-700/80 hover:bg-gray-600/80
                text-white px-2 sm:px-3 py-1.5
                rounded-lg text-xs font-medium
                flex items-center gap-2
                transition-all shadow-md
                ring-1 ring-white/10 hover:ring-white/20
                active:scale-95
              `}
            >
              {/* Inventory badge */}
              <div className="absolute -top-1 -right-1 bg-black/85 text-white text-[10px] px-1.5 py-0.5 rounded-full leading-none z-10">
                ×{count}
              </div>

              {/* Icon only */}
              <img
                src={icon}
                alt={label}
                className="w-8 h-8 object-contain"
                draggable={false}
              />

              {/* Hide labels on mobile */}
              <span className="hidden sm:inline whitespace-nowrap">
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
