import React from 'react';
import { PowerUpType } from '../types/game';

interface DebugPanelProps {
  onActivatePowerUp: (type: PowerUpType) => void;
}

const DebugPanel: React.FC<DebugPanelProps> = ({ onActivatePowerUp }) => {
  const powerUps: { type: PowerUpType; label: string; icon: string; color: string }[] = [
    { type: 'honey', label: 'Hot Honey', icon: '/Sprites/hothoney.png', color: 'bg-orange-500 hover:bg-orange-600' },
    { type: 'ice-cream', label: 'Ice Cream', icon: '/Sprites/sundae.png', color: 'bg-cyan-500 hover:bg-cyan-600' },
    { type: 'beer', label: 'Beer', icon: '/Sprites/beer.png', color: 'bg-amber-500 hover:bg-amber-600' },
    { type: 'star', label: 'Star', icon: '/Sprites/gotchi.png', color: 'bg-yellow-500 hover:bg-yellow-600' },
    { type: 'doge', label: 'Doge', icon: '/Sprites/doge.png', color: 'bg-yellow-600 hover:bg-yellow-700' },
    { type: 'nyan', label: 'Nyan Cat', icon: '/Sprites/nyancat.png', color: 'bg-pink-500 hover:bg-pink-600' },
  ];

  return (
    <div className="w-full max-w-6xl mx-auto p-2 bg-gray-800 bg-opacity-90 rounded-lg">
      <div className="flex items-center gap-2 flex-wrap justify-center">
        <span className="text-white text-xs font-bold uppercase tracking-wide mr-2">Debug:</span>
        {powerUps.map(({ type, label, icon, color }) => (
          <button
            key={type}
            onClick={() => onActivatePowerUp(type)}
            className={`${color} text-white px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors shadow-md`}
          >
            <img src={icon} alt={label} className="w-5 h-5 object-contain" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default DebugPanel;
