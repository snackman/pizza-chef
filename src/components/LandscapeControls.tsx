import React from 'react';
import pizzaPanImg from '/sprites/pizzapan.png';

interface LandscapeControlsProps {
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
    };
  };
  ovenSpeedUpgrades: { [key: number]: number };
}

const LandscapeControls: React.FC<LandscapeControlsProps> = ({
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
}) => {
  const safeLane = Math.round(currentLane);
  const isDisabled = gameOver || paused || nyanSweepActive;

  const getOvenStatus = () => {
    const oven = ovens[safeLane];
    if (!oven) return 'empty';
    if (oven.burned) return 'burned';
    if (!oven.cooking) return 'empty';

    const elapsed = oven.pausedElapsed !== undefined ? oven.pausedElapsed : Date.now() - oven.startTime;

    const speedUpgrade = ovenSpeedUpgrades[safeLane] || 0;
    const cookingTime = speedUpgrade === 0 ? 3000 :
                        speedUpgrade === 1 ? 2000 :
                        speedUpgrade === 2 ? 1000 : 500;

    const warningTime = 7000;
    const burnTime = 8000;

    if (elapsed >= burnTime) return 'burning';
    if (elapsed >= warningTime) return 'warning';
    if (elapsed >= cookingTime) return 'ready';
    return 'cooking';
  };

  const handleOvenAction = () => {
    const oven = ovens[safeLane];
    if (!oven) return;
    if (oven.burned) {
      onCleanOven();
    } else {
      onUseOven();
    }
  };

  const ovenStatus = getOvenStatus();
  const currentOven = ovens[safeLane];

  return (
    <>
      {/* Left side - Chef Movement Controls */}
      <div
        className="absolute flex flex-col items-center justify-center gap-1 bg-gradient-to-r from-gray-900/90 to-transparent p-2"
        style={{
          left: '0%',
          top: '0%',
          width: '12%',
          height: '100%',
        }}
      >
        <button
          onClick={onMoveUp}
          disabled={isDisabled || safeLane === 0}
          className="w-10 h-10 bg-blue-500 text-white rounded-full hover:bg-blue-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95 flex items-center justify-center font-bold shadow-lg text-lg"
        >
          ^
        </button>

        <div className={`relative w-14 h-14 bg-orange-200 rounded-lg border-2 border-orange-400 shadow-xl flex items-center justify-center ${nyanSweepActive ? 'opacity-50' : ''}`}>
          <img src={"https://i.imgur.com/EPCSa79.png"} alt="chef" className="w-12 h-12 object-contain" />
          {availableSlices > 0 && (
            <div className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold shadow-lg">
              {availableSlices}
            </div>
          )}
        </div>

        <button
          onClick={onMoveDown}
          disabled={isDisabled || safeLane === 3}
          className="w-10 h-10 bg-blue-500 text-white rounded-full hover:bg-blue-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95 flex items-center justify-center font-bold shadow-lg text-lg"
        >
          v
        </button>

        <div className="text-white text-[10px] font-bold">
          Lane {safeLane + 1}
        </div>
      </div>

      {/* Right side - Oven and Serve Controls */}
      <div
        className="absolute flex flex-col items-center justify-center gap-2 bg-gradient-to-l from-gray-900/90 to-transparent p-2"
        style={{
          right: '0%',
          top: '0%',
          width: '12%',
          height: '100%',
        }}
      >
        {/* Serve Pizza Button */}
        <div className="flex flex-col items-center">
          <button
            onClick={onServePizza}
            disabled={isDisabled || availableSlices === 0}
            className="relative w-14 h-14 bg-white rounded-full border-2 border-gray-400 shadow-xl transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center"
          >
            <div className="text-3xl">
              🍕
            </div>
            {availableSlices > 0 && (
              <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 bg-green-600 text-white rounded-full px-2 py-0.5 text-[10px] font-bold shadow-lg">
                {availableSlices}
              </div>
            )}
          </button>
          <div className="text-white text-[10px] font-bold mt-0.5">
            Serve
          </div>
        </div>

        {/* Oven Control */}
        <div className="flex flex-col items-center">
          <button
            onClick={handleOvenAction}
            disabled={isDisabled}
            className={`relative w-14 h-14 rounded-lg border-2 shadow-xl transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed
              ${ovenStatus === 'burned' || ovenStatus === 'burning' ? 'bg-gray-900 border-red-600 animate-pulse' :
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
          <div className="text-white text-[10px] font-bold text-center mt-0.5">
            {ovenStatus === 'burned' ? 'Clean!' :
             ovenStatus === 'burning' ? 'Burning!' :
             ovenStatus === 'warning' ? 'Warning!' :
             ovenStatus === 'ready' ? 'Take Out!' :
             ovenStatus === 'cooking' ? 'Cooking...' :
             'Put Pizza'}
          </div>
        </div>
      </div>
    </>
  );
};

export default LandscapeControls;