import React from 'react';

interface LandscapeControlsProps {
  gameOver: boolean;
  paused: boolean;
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
    };
  };
}

const LandscapeControls: React.FC<LandscapeControlsProps> = ({
  gameOver,
  paused,
  onMoveUp,
  onMoveDown,
  onServePizza,
  onUseOven,
  onCleanOven,
  currentLane,
  ovens,
}) => {
  const handleOvenAction = () => {
    const oven = ovens[currentLane];
    if (oven.burned) {
      onCleanOven();
    } else {
      onUseOven();
    }
  };

  const disabledBase =
    'cursor-not-allowed bg-gray-400 text-gray-600 shadow-inner border border-gray-500'; // subtle, consistent disabled style

  return (
    <>
      {/* Up Button */}
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

      {/* Down Button */}
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

      {/* Serve Pizza Button */}
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

      {/* Oven Button */}
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
};

export default LandscapeControls;