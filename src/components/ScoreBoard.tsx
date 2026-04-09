import React from 'react';
import { GameState } from '../types/game';
import { Star, Trophy, DollarSign, Pause, Layers, Users } from 'lucide-react';

interface ScoreBoardProps {
  gameState: GameState;
  onPauseClick: () => void;
  compact?: boolean;
}

const ScoreBoard: React.FC<ScoreBoardProps> = ({ gameState, onPauseClick, compact = false }) => {
  const { customersServed, customersRequired } = gameState.levelProgress;
  const progressPercent = Math.min((customersServed / customersRequired) * 100, 100);

  return (
    <div className={`bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg ${compact ? 'py-1 px-3' : 'p-3 sm:p-4 sm:rounded-lg'}`}>
      <div className="flex items-center justify-center sm:justify-between">
        <div className="flex items-center space-x-3 sm:space-x-6 text-sm sm:text-base">
          <div className="flex items-center space-x-2">
            <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-300" />
            <span className="hidden sm:inline text-sm font-medium">Score:</span>
            <span className="text-lg sm:text-xl font-bold">{gameState.score.toLocaleString()}</span>
          </div>

          <div className="flex items-center space-x-2">
            <span className="hidden sm:inline text-sm font-medium">Rating:</span>
            <div className="flex space-x-1">
              {Array.from({ length: 5 }, (_, i) => (
                <Star
                  key={i}
                  className={`w-3 h-3 sm:w-4 sm:h-4 text-yellow-300 ${
                    i < gameState.lives ? 'fill-current' : ''
                  }`}
                />
              ))}
            </div>
            {gameState.bestOfAwardCount > 0 && (
              <span className="text-xs font-bold bg-amber-500 text-white px-1.5 py-0.5 rounded-full">
                Best Of x{gameState.bestOfAwardCount}
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-green-300" />
            <span className="hidden sm:inline text-sm font-medium">Bank:</span>
            <span className="text-base sm:text-lg font-bold">{gameState.bank}</span>
          </div>

          <div className="flex items-center space-x-2">
            <Layers className="w-4 h-4 sm:w-5 sm:h-5 text-blue-300" />
            <span className="hidden sm:inline text-sm font-medium">Level:</span>
            <span className="text-base sm:text-lg font-bold">{gameState.level}</span>
          </div>

          {/* Customer progress bar */}
          <div className="flex items-center space-x-1.5">
            <Users className="w-4 h-4 sm:w-5 sm:h-5 text-orange-300" />
            <div className="flex items-center space-x-1">
              <span className="text-xs sm:text-sm font-bold">{customersServed}/{customersRequired}</span>
              <div className="hidden sm:block w-16 h-2 bg-red-900 rounded-full overflow-hidden">
                <div
                  className="h-full bg-orange-400 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>

          <button
            onClick={onPauseClick}
            className="flex items-center space-x-1 px-2 py-1 bg-blue-500 hover:bg-blue-600 rounded transition-colors"
            aria-label="Pause game"
          >
            <Pause className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline text-xs font-medium">Pause</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ScoreBoard;