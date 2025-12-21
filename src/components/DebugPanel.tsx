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
    { type: 'honey', label: 'Hot Honey', icon: '/Sprites/hothoney.png', color: 'bg-orange-500/90 hover:bg-orange-500' },
    { type: 'ice-cream', label: 'Ice Cream', icon: '/Sprites/sundae.png', color: 'bg-cyan-500/90 hover:bg-cyan-500' },
    { type: 'beer', label: 'Beer', icon: '/Sprites/beer.png', color: 'bg-amber-500/90 hover:bg-amber-500' },
    { type: 'star', label: 'Star Power', icon: '/Sprites/starpower.png', color: 'bg-yellow-500/90 hover:bg-yellow-500' },
    { type: 'doge', label: 'Doge', icon: '/Sprites/doge.png', color: 'bg-yellow-600/90 hover:bg-yellow-600' },
    { type: 'nyan', label: 'Nyan Cat', icon: '/Sprites/nyancat.png', color: 'bg-pink-500/90 hover:bg-pink-500' },
  ];

  return (
    <div className="relative z-50 pointer-events-auto w-full max-w-6xl mx-auto p-2 bg-gray-800/90 rounded-xl">
      <div className="flex items-center gap-3 flex-wrap justify-center">
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
                relative
                ${color}
                bg-white/20 backdrop-blur-sm
                ${disabled ? 'opacity-50 grayscale cursor-not-allowed' : ''}
                touch-manipulation select-none
                text-white px-3 sm:px-4 py-2
                rounded-xl text-xs font-semibold
                flex items-center gap-2
                transition-all
                shadow-md
                ring-1 ring-white/20
                hover:ring-white/30
                active:scale-95
              `}
            >
              {/* Inventory badge */}
              <div className="absolute -top-1.5 -right-1.5 bg-black/85 text-white text-[11px] px-1.5 py-0.5 rounded-full leading-none shadow ring-1 ring-white/20">
                ×{count}
              </div>

              <img
                src={icon}
                alt={label}
                className="w-6 h-6 object-contain"
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
