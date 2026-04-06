import React from 'react';
import { sprite } from '../lib/assets';
import { getOvenDisplayStatus } from '../logic/ovenSystem';

const pizzaPanImg = sprite("pizzapan.png");

interface MobileGameControlsProps {
  gameOver: boolean;
  paused: boolean;
  nyanSweepActive: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onServePizza: () => void;
  onUseOven: () => void;
  onCleanOven: () => void;
  currentLane: number;
  availableSlices: number;
  ovens: {
    [key: number]: {
      cooking: boolean;
      startTime: number;
      burned: boolean;
      cleaningStartTime: number;
      pausedElapsed?: number;
      sliceCount: number;
      slimeDisabledUntil?: number;
      slimeCleaningStartTime?: number;
    };
  };
  ovenSpeedUpgrades: { [key: number]: number };
  isLandscape?: boolean;
}

const MobileGameControls: React.FC<MobileGameControlsProps> = ({
  gameOver,
  paused,
  nyanSweepActive,
  onMoveUp,
  onMoveDown,
  onServePizza,
  onUseOven,
  onCleanOven,
  currentLane,
  availableSlices,
  ovens,
  ovenSpeedUpgrades,
  isLandscape = false,
}) => {
  const safeLane = Math.round(currentLane);
  const isDisabled = gameOver || paused || nyanSweepActive;

  const getOvenStatus = () => {
    const oven = ovens[safeLane];
    if (!oven) return 'empty';
    const speedUpgrade = ovenSpeedUpgrades[safeLane] || 0;
    return getOvenDisplayStatus(oven, speedUpgrade);
  };

  const handleOvenAction = () => {
    const oven = ovens[safeLane];
    if (!oven) return;
    if (oven.burned) {
      onCleanOven();
    } else if (oven.slimeDisabledUntil && Date.now() < oven.slimeDisabledUntil) {
      onCleanOven();
    } else {
      onUseOven();
    }
  };

  const ovenStatus = getOvenStatus();
  const currentOven = ovens[safeLane];

  // Landscape layout - controls on left and right edges
  if (isLandscape) {
    return (
      <>
        {/* Left side - Movement Controls */}
        <div className="fixed left-0 top-0 bottom-0 w-[12%] flex flex-col items-center justify-center z-40 pointer-events-auto bg-gradient-to-r from-black/40 to-transparent">
          <button
            onClick={onMoveUp}
            disabled={isDisabled || safeLane === 0}
            className="w-16 h-20 bg-gray-600 text-white rounded-xl hover:bg-gray-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95 active:bg-gray-700 flex items-center justify-center text-2xl font-bold shadow-lg mb-4"
          >
            ↑
          </button>
          <button
            onClick={onMoveDown}
            disabled={isDisabled || safeLane === 3}
            className="w-16 h-20 bg-gray-600 text-white rounded-xl hover:bg-gray-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95 active:bg-gray-700 flex items-center justify-center text-2xl font-bold shadow-lg"
          >
            ↓
          </button>
        </div>

        {/* Right side - Oven and Serve Controls */}
        <div className="fixed right-0 top-0 bottom-0 w-[12%] flex flex-col items-center justify-center z-40 pointer-events-auto bg-gradient-to-l from-black/40 to-transparent">
          {/* Serve Pizza Control */}
          <button
            onClick={onServePizza}
            disabled={isDisabled || availableSlices === 0}
            className="relative w-16 h-16 bg-white rounded-full border-4 border-gray-400 shadow-xl transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center mb-4"
          >
            <div className="text-3xl">
              🍕
            </div>
            {availableSlices > 0 && (
              <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 bg-green-600 text-white rounded-full px-2 py-0.5 text-xs font-bold shadow-lg">
                {availableSlices}
              </div>
            )}
          </button>

          {/* Oven Control */}
          <button
            onClick={handleOvenAction}
            disabled={isDisabled}
            className={`relative w-16 h-16 rounded-lg border-4 shadow-xl transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed
              ${currentOven?.slimeDisabledUntil && Date.now() < currentOven.slimeDisabledUntil ? 'bg-yellow-400 border-yellow-600 animate-pulse' :
                ovenStatus === 'burned' || ovenStatus === 'burning' ? 'bg-gray-900 border-gray-600 animate-pulse' :
                ovenStatus === 'warning' ? 'bg-orange-300 border-orange-600 animate-pulse' :
                ovenStatus === 'ready' ? 'bg-yellow-200 border-yellow-500' :
                ovenStatus === 'cooking' ? 'bg-orange-200 border-orange-400' :
                'bg-gray-700 border-gray-500'}`}
          >
            <img src={pizzaPanImg} alt="oven" className="w-full h-full object-contain" />
            {currentOven && currentOven.sliceCount > 0 && (
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-xl">
                🍕
              </div>
            )}
            {currentOven?.slimeDisabledUntil && Date.now() < currentOven.slimeDisabledUntil && (
              <div className="absolute inset-0 flex items-center justify-center text-2xl">
                {currentOven.slimeCleaningStartTime ? '🧹' : '🧀'}
              </div>
            )}
            {ovenStatus === 'burned' && (
              <div className="absolute inset-0 flex items-center justify-center text-2xl">
                💀
              </div>
            )}
            {ovenStatus === 'burning' && (
              <div className="absolute inset-0 flex items-center justify-center text-2xl">
                🔥
              </div>
            )}
            {ovenStatus === 'ready' && (
              <div className="absolute -top-1 -right-1 text-lg animate-bounce">
                ✓
              </div>
            )}
          </button>
        </div>
      </>
    );
  }

  // Portrait layout - controls at bottom
  return (
    <div className="fixed bottom-0 left-0 right-0 h-[45vh] pointer-events-none z-40">

      <div className="absolute inset-0 flex items-center justify-between px-4 pt-8 pointer-events-auto">

        {/* Chef Movement Control */}
        <div className="flex flex-col items-center">
          <button
            onClick={onMoveUp}
            disabled={isDisabled || safeLane === 0}
            className="w-36 h-[108px] bg-gray-500 text-white rounded-t-xl hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95 active:bg-gray-700 flex items-center justify-center text-3xl font-bold shadow-lg border-b border-gray-400"
          >
            ↑
          </button>
          <button
            onClick={onMoveDown}
            disabled={isDisabled || safeLane === 3}
            className="w-36 h-[108px] bg-gray-500 text-white rounded-b-xl hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95 active:bg-gray-700 flex items-center justify-center text-3xl font-bold shadow-lg"
          >
            ↓
          </button>
        </div>

        {/* Right side controls - Oven and Serve stacked */}
        <div className="flex flex-col space-y-6">
          {/* Oven Control */}
          <div className="flex items-center space-x-3">
            <div className="text-black text-xs font-bold text-right min-w-[60px]">
              {currentOven?.slimeDisabledUntil && Date.now() < currentOven.slimeDisabledUntil ? (currentOven.slimeCleaningStartTime ? 'Cleaning...' : 'Clean!') :
               ovenStatus === 'burned' ? 'Clean!' :
               ovenStatus === 'burning' ? 'Burning!' :
               ovenStatus === 'warning' ? 'Warning!' :
               ovenStatus === 'ready' ? 'Take Out!' :
               ovenStatus === 'cooking' ? 'Heating...' :
               'Heat Pizza'}
            </div>
            <button
              onClick={handleOvenAction}
              disabled={isDisabled}
              className={`relative w-24 h-24 rounded-lg border-4 shadow-xl transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed
                ${currentOven?.slimeDisabledUntil && Date.now() < currentOven.slimeDisabledUntil ? 'bg-yellow-400 border-yellow-600 animate-pulse' :
                  ovenStatus === 'burned' || ovenStatus === 'burning' ? 'bg-gray-900 border-gray-600 animate-pulse' :
                  ovenStatus === 'warning' ? 'bg-orange-300 border-orange-600 animate-pulse' :
                  ovenStatus === 'ready' ? 'bg-yellow-200 border-yellow-500' :
                  ovenStatus === 'cooking' ? 'bg-orange-200 border-orange-400' :
                  'bg-gray-700 border-gray-500'}`}
            >
              <img src={pizzaPanImg} alt="oven" className="w-full h-full object-contain" />
              {currentOven && currentOven.sliceCount > 0 && (
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-2xl">
                  🍕
                </div>
              )}
              {currentOven?.slimeDisabledUntil && Date.now() < currentOven.slimeDisabledUntil && (
                <div className="absolute inset-0 flex items-center justify-center text-3xl">
                  {currentOven.slimeCleaningStartTime ? '🧹' : '🧀'}
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
                  ✓
                </div>
              )}
            </button>
          </div>

          {/* Serve Pizza Control */}
          <div className="flex items-center space-x-3">
            <div className="text-black text-xs font-bold text-right min-w-[60px]">
              Serve
            </div>
            <button
              onClick={onServePizza}
              disabled={isDisabled || availableSlices === 0}
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
          </div>
        </div>

      </div>
    </div>
  );
};

export default MobileGameControls;
