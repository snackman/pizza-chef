import React from 'react';
import { Play, Pause, RotateCcw, ChevronUp, ChevronDown, Pizza, ChefHat } from 'lucide-react';

interface MobileControlsProps {
  gameOver: boolean;
  paused: boolean;
  onReset: () => void;
  onTogglePause: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onServePizza: () => void;
  onUseOven: () => void;
  currentLane: number;
  availableSlices: number;
  ovens: {
    [key: number]: {
      cooking: boolean;
      startTime: number;
      burned: boolean;
      cleaningStartTime: number;
      pausedElapsed?: number;
    };
  };
  onCleanOven: () => void;
  ovenSpeedUpgrades: { [key: number]: number };
}

const MobileControls: React.FC<MobileControlsProps> = ({
  gameOver,
  paused,
  onReset,
  onTogglePause,
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
  const getCurrentOvenStatus = () => {
    const oven = ovens[currentLane];

    if (oven.burned) {
      if (oven.cleaningStartTime > 0) {
        const cleaningElapsed = Date.now() - oven.cleaningStartTime;
        const cleaningTime = 3000;
        return `Cleaning... ${Math.ceil((cleaningTime - cleaningElapsed) / 1000)}s`;
      }
      return 'Clean Oven (Burned!)';
    }

    if (!oven.cooking) return 'Put Pizza In';

    // Use pausedElapsed if game is paused, otherwise calculate from startTime
    const elapsed =
      oven.pausedElapsed !== undefined ? oven.pausedElapsed : Date.now() - oven.startTime;

    // Calculate cook time based on speed upgrades
    const speedUpgrade = ovenSpeedUpgrades[currentLane] || 0;
    const cookingTime = speedUpgrade === 0 ? 3000 :
                        speedUpgrade === 1 ? 2000 :
                        speedUpgrade === 2 ? 1000 : 500;

    if (elapsed >= cookingTime) return 'Take Out (Ready!)';
    return `Cooking... ${Math.ceil((cookingTime - elapsed) / 1000)}s`;
  };

  const handleOvenAction = () => {
    const oven = ovens[currentLane];
    if (oven.burned) {
      onCleanOven();
    } else {
      onUseOven();
    }
  };

  return (
<button
  onClick={onMoveUp}
  disabled={gameOver || paused || currentLane === 0}
  className={`fixed bottom-[20%] left-4 z-[60] transition-all text-gray-800 font-bold text-lg rounded-full flex items-center justify-center
    ${
      gameOver || paused || currentLane === 0
        ? disabledBase
        : 'bg-gray-300 hover:bg-gray-400 active:scale-[0.98]'
    }`}
  style={{
    width: '64px',
    height: '64px',
  }}
>
  Up
</button>

    <div className="mt-4 space-y-4">
      {/* Game Controls */}
      <div className="flex items-center justify-center space-x-4">
        <button
          onClick={onTogglePause}
          disabled={gameOver}
          className="flex items-center space-x-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-lg font-semibold"
        >
          {paused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
          <span>{paused ? 'Resume' : 'Pause'}</span>
        </button>

        <button
          onClick={onReset}
          className="flex items-center space-x-2 px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-lg font-semibold"
        >
          <RotateCcw className="w-5 h-5" />
          <span>Reset</span>
        </button>
      </div>

      {/* Movement, Oven, and Action Controls */}
      <div className="flex items-center justify-center space-x-4">
        {/* Movement Controls */}
        <div className="flex flex-col items-center space-y-2">
          <button
            onClick={onMoveUp}
            disabled={gameOver || paused || currentLane === 0}
            className="w-16 h-16 bg-green-600 text-white rounded-full hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center shadow-lg"
          >
            <ChevronUp className="w-8 h-8" />
          </button>

          <div className="text-center">
            <div className="text-sm font-semibold text-gray-700">Lane</div>
            <div className="text-2xl font-bold text-red-600">{currentLane + 1}</div>
          </div>

          <button
            onClick={onMoveDown}
            disabled={gameOver || paused || currentLane === 3}
            className="w-16 h-16 bg-green-600 text-white rounded-full hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center shadow-lg"
          >
            <ChevronDown className="w-8 h-8" />
          </button>
        </div>

        {/* Oven Control */}
        <div className="flex flex-col items-center">
          <button
            onClick={handleOvenAction}
            disabled={gameOver || paused}
            className="w-20 h-20 bg-orange-600 text-white rounded-full hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center shadow-lg"
          >
            <ChefHat className="w-10 h-10" />
          </button>
          <div className="text-xs font-semibold text-gray-700 mt-2 text-center max-w-20">
            {getCurrentOvenStatus()}
          </div>
        </div>

        {/* Serve Pizza Button */}
        <div className="flex flex-col items-center">
          <button
            onClick={onServePizza}
            disabled={gameOver || paused || availableSlices <= 0}
            className="w-20 h-20 bg-red-600 text-white rounded-full hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center shadow-lg"
          >
            <Pizza className="w-10 h-10" />
          </button>
          <div className="text-sm font-semibold text-gray-700 mt-2">Serve Pizza</div>
        </div>
      </div>

      {/* Mobile Instructions */}
      <div className="bg-gradient-to-r from-orange-100 to-yellow-100 p-3 rounded-lg border-2 border-orange-300">
        <div className="text-center">
          <h4 className="font-bold text-gray-800 mb-2">Quick Guide</h4>
          <div className="text-sm text-gray-700 space-y-1">
            <p>• Use ↑↓ buttons to move between lanes</p>
            <p>• Use oven button to cook pizzas (3s cooking time)</p>
            <p>• Tap pizza button to serve customers</p>
            <p>• Catch empty plates for bonus points!</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileControls;
