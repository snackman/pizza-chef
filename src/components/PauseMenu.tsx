import React, { useEffect, useCallback } from 'react';
import { Play, RotateCcw, Volume2, VolumeX, Trophy, HelpCircle } from 'lucide-react';
import { useMenuKeyboardNav } from '../hooks/useMenuKeyboardNav';
import { sprite } from '../lib/assets';

const smokingChefImg = sprite('chef-smoking.png');

interface PauseMenuProps {
  isVisible: boolean;
  isMuted: boolean;
  onResume: () => void;
  onReset: () => void;
  onToggleMute: () => void;
  onShowScores: () => void;
  onShowHelp: () => void;
}

const PauseMenu: React.FC<PauseMenuProps> = ({
  isVisible,
  isMuted,
  onResume,
  onReset,
  onToggleMute,
  onShowScores,
  onShowHelp,
}) => {
  const menuActions = [onResume, onReset, onToggleMute, onShowScores, onShowHelp];

  const handleSelect = useCallback((index: number) => {
    menuActions[index]?.();
  }, [menuActions]);

  const { selectedIndex, getItemProps } = useMenuKeyboardNav({
    itemCount: 5, // 4 main buttons + help
    columns: 2,
    onSelect: handleSelect,
    onEscape: onResume,
    isActive: isVisible,
    initialIndex: 0,
  });

  if (!isVisible) return null;

  const buttonBaseClass = "flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-colors font-bold shadow-lg";
  const selectedRing = "ring-4 ring-white ring-opacity-80";

  return (
    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-lg z-[70]">
      <div
        className="text-center p-6 sm:p-8 rounded-xl shadow-2xl mx-4 border-4 border-amber-800 relative"
        style={{
          background: 'linear-gradient(to bottom, #f5e6c8 0%, #e8d4a8 100%)',
          boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.3), 0 8px 32px rgba(0,0,0,0.3)'
        }}
      >
        {/* Help button */}
        <button
          {...getItemProps(4)}
          className={`absolute top-3 right-3 p-2 rounded-full hover:bg-amber-200 transition-colors ${selectedIndex === 4 ? selectedRing : ''}`}
          style={{ color: '#8B4513' }}
          aria-label="How to play"
        >
          <HelpCircle className="w-6 h-6" />
        </button>

        <img
          src={smokingChefImg}
          alt="Chef taking a break"
          className="w-24 h-24 sm:w-32 sm:h-32 mx-auto mb-4 object-contain"
        />

        {/* Button grid */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <button
            {...getItemProps(0)}
            className={`${buttonBaseClass} bg-green-600 text-white hover:bg-green-700 ${selectedIndex === 0 ? selectedRing : ''}`}
          >
            <Play className="w-5 h-5" />
            <span className="hidden sm:inline">Resume</span>
          </button>
          <button
            {...getItemProps(1)}
            className={`${buttonBaseClass} bg-red-600 text-white hover:bg-red-700 ${selectedIndex === 1 ? selectedRing : ''}`}
          >
            <RotateCcw className="w-5 h-5" />
            <span className="hidden sm:inline">Reset</span>
          </button>
          <button
            {...getItemProps(2)}
            className={`${buttonBaseClass} bg-blue-600 text-white hover:bg-blue-700 ${selectedIndex === 2 ? selectedRing : ''}`}
          >
            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            <span className="hidden sm:inline w-14 text-left">{isMuted ? 'Unmute' : 'Mute'}</span>
          </button>
          <button
            {...getItemProps(3)}
            className={`${buttonBaseClass} bg-yellow-600 text-white hover:bg-yellow-700 ${selectedIndex === 3 ? selectedRing : ''}`}
          >
            <Trophy className="w-5 h-5" />
            <span className="hidden sm:inline">Scores</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default PauseMenu;
