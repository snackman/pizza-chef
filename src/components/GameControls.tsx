import React from 'react';
import { getOvenStatus, getOvenActionLabel, OvenState } from '../utils/ovenStatus';
import pizzaPanImg from '/Sprites/pizzapan.png';

export interface GameControlsProps {
  gameOver: boolean;
  paused: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onServePizza: () => void;
  onUseOven: () => void;
  onCleanOven: () => void;
  currentLane: number;
  availableSlices: number;
  ovens: { [key: number]: OvenState };
  ovenSpeedUpgrades: { [key: number]: number };
  variant?: 'portrait' | 'landscape';
}

const GameControls: React.FC<GameControlsProps> = ({
  gameOver,
  paused,
  onMoveUp,
  onMoveDown,
  onServePizza,
  onUseOven,
  onCleanOven,
  currentLane,
  availableSlices,
  ovens,
  ovenSpeedUpgrades,
  variant = 'portrait',
}) => {
  const handleOvenAction = () => {
    const oven = ovens[currentLane];
    if (oven.burned) {
      onCleanOven();
    } else {
      onUseOven();
    }
  };

  const currentOven = ovens[currentLane];
  const speedUpgrade = ovenSpeedUpgrades[currentLane] || 0;
  const ovenStatus = getOvenStatus(currentOven, speedUpgrade, false);

  if (variant === 'landscape') {
    const disabledBase =
      'cursor-not-allowed bg-gray-400 text-gray-600 shadow-inner border border-gray-500';

    return (
      <>
        <button
          onClick={onMoveUp}
          disabled={gameOver || paused || currentLane === 0}
          className={`absolute transition-all text-gray-800 font-bold text-lg rounded-lg flex items-center justify-center ${
            gameOver || paused || currentLane === 0
              ? disabledBase
              : 'bg-gray-300 hover:bg-gray-400 active:scale-[0.98]'
          }`}
          style={{
            left: '0%',
            top: '0%',
            width: '10%',
            height: '49%',
          }}
        >
          Up
        </button>

        <button
          onClick={onMoveDown}
          disabled={gameOver || paused || currentLane === 3}
          className={`absolute transition-all text-gray-800 font-bold text-lg rounded-lg flex items-center justify-center ${
            gameOver || paused || currentLane === 3
              ? disabledBase
              : 'bg-gray-300 hover:bg-gray-400 active:scale-[0.98]'
          }`}
          style={{
            left: '0%',
            top: '51%',
            width: '10%',
            height: '49%',
          }}
        >
          Down
        </button>

        <button
          onClick={onServePizza}
          disabled={gameOver || paused}
          className={`absolute transition-all text-gray-800 font-bold text-base rounded-full flex items-center justify-center ${
            gameOver || paused
              ? disabledBase
              : 'bg-gray-300 hover:bg-gray-400 active:scale-[0.98]'
          }`}
          style={{
            right: '0%',
            top: '0%',
            width: '10%',
            height: '49%',
          }}
        >
          Serve Pizza
        </button>

        <button
          onClick={handleOvenAction}
          disabled={gameOver || paused}
          className={`absolute transition-all text-gray-800 font-bold text-base rounded-full flex items-center justify-center ${
            gameOver || paused
              ? disabledBase
              : 'bg-gray-300 hover:bg-gray-400 active:scale-[0.98]'
          }`}
          style={{
            right: '0%',
            top: '51%',
            width: '10%',
            height: '49%',
          }}
        >
          Oven
        </button>
      </>
    );
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-gray-900 via-gray-800 to-transparent h-[45vh] pointer-events-none z-40">
      <div className="absolute inset-0 flex items-center justify-around px-4 pt-8 pointer-events-auto">
        <div className="flex flex-col items-center space-y-2">
          <button
            onClick={onMoveUp}
            disabled={gameOver || paused || currentLane === 0}
            className="w-12 h-12 bg-blue-500 text-white rounded-full hover:bg-blue-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95 flex items-center justify-center font-bold shadow-lg"
          >
            &uarr;
          </button>

          <div className="relative w-20 h-20 bg-orange-200 rounded-lg border-4 border-orange-400 shadow-xl flex items-center justify-center">
            <img src="https://i.imgur.com/EPCSa79.png" alt="chef" className="w-16 h-16 object-contain" />
            {availableSlices > 0 && (
              <div className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shadow-lg">
                {availableSlices}
              </div>
            )}
          </div>

          <button
            onClick={onMoveDown}
            disabled={gameOver || paused || currentLane === 3}
            className="w-12 h-12 bg-blue-500 text-white rounded-full hover:bg-blue-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95 flex items-center justify-center font-bold shadow-lg"
          >
            &darr;
          </button>

          <div className="text-white text-xs font-bold mt-1">
            Lane {currentLane + 1}
          </div>
        </div>

        <div className="flex flex-col items-center space-y-2">
          <button
            onClick={handleOvenAction}
            disabled={gameOver || paused}
            className={`relative w-24 h-24 rounded-lg border-4 shadow-xl transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed
              ${ovenStatus === 'burned' || ovenStatus === 'burning' ? 'bg-gray-900 border-red-600 animate-pulse' :
                ovenStatus === 'warning' ? 'bg-orange-300 border-orange-600 animate-pulse' :
                ovenStatus === 'ready' ? 'bg-yellow-200 border-yellow-500' :
                ovenStatus === 'cooking' ? 'bg-orange-200 border-orange-400' :
                'bg-gray-700 border-gray-500'}`}
          >
            <img src={pizzaPanImg} alt="oven" className="w-full h-full object-contain" />
            {currentOven.sliceCount > 0 && (
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-2xl">
                🍕
              </div>
            )}
            {ovenStatus === 'burned' && (
              <div className="absolute inset-0 flex items-center justify-center text-3xl">
                💀
              </div>
            )}
            {ovenStatus === 'burning' && (
              <div className="absolute inset-0 flex items-center justify-center text-3xl">
                🔥
              </div>
            )}
            {ovenStatus === 'ready' && (
              <div className="absolute -top-2 -right-2 text-2xl animate-bounce">
                &#10003;
              </div>
            )}
          </button>

          <div className="text-white text-xs font-bold text-center max-w-24">
            {getOvenActionLabel(ovenStatus)}
          </div>
        </div>

        <div className="flex flex-col items-center space-y-2">
          <button
            onClick={onServePizza}
            disabled={gameOver || paused || availableSlices === 0}
            className="relative w-24 h-24 bg-white rounded-full border-4 border-gray-400 shadow-xl transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center"
          >
            <div className="text-5xl">
              🍕
            </div>
            {availableSlices > 0 && (
              <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-green-600 text-white rounded-full px-3 py-1 text-sm font-bold shadow-lg">
                {availableSlices}
              </div>
            )}
          </button>

          <div className="text-white text-xs font-bold">
            Serve
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameControls;
