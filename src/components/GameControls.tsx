import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, Volume2, VolumeX, Trophy } from 'lucide-react';
import { soundManager } from '../utils/sounds';

interface GameControlsProps {
  gameOver: boolean;
  paused: boolean;
  onReset: () => void;
  onTogglePause: () => void;
  onShowHighScores: () => void;
}

const GameControls: React.FC<GameControlsProps> = ({
  gameOver,
  paused,
  onReset,
  onTogglePause,
  onShowHighScores,
}) => {
  const [isMuted, setIsMuted] = useState(soundManager.getMuted());

  const toggleMute = () => {
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);
    soundManager.setMuted(newMutedState);
  };

  useEffect(() => {
    setIsMuted(soundManager.getMuted());
  }, []);

  return (
    <div className="flex items-center justify-center space-x-4 mt-4">
      <button
        onClick={onTogglePause}
        disabled={gameOver}
        className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {paused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
        <span>{paused ? 'Resume' : 'Pause'}</span>
      </button>
      
      <button
        onClick={onReset}
        className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
      >
        <RotateCcw className="w-4 h-4" />
        <span>Reset</span>
      </button>

      <button
        onClick={toggleMute}
        className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        title={isMuted ? 'Unmute' : 'Mute'}
      >
        {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        <span className="hidden sm:inline">{isMuted ? 'Unmute' : 'Mute'}</span>
      </button>

      <button
        onClick={onShowHighScores}
        className="flex items-center space-x-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
        title="View High Scores"
      >
        <Trophy className="w-4 h-4" />
        <span className="hidden sm:inline">High Scores</span>
      </button>
    </div>
  );
};

export default GameControls;