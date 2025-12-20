import React from 'react';
import { GameState } from '../types/game';
import { Star, Trophy, Timer, DollarSign, Pause, HelpCircle, Layers } from 'lucide-react';

interface ScoreBoardProps {
  gameState: GameState;
  onShowInstructions: () => void;
}

const ScoreBoard: React.FC<ScoreBoardProps> = ({ gameState, onShowInstructions }) => {
  return (
    <div className="bg-gradient-to-r from-red-600 to-red-700 text-white p-3 sm:p-4 rounded-lg shadow-lg">
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

          <button
            onClick={onShowInstructions}
            className="flex items-center space-x-1 px-2 py-1 bg-blue-500 hover:bg-blue-600 rounded transition-colors"
            aria-label="Pause and show controls"
          >
            <Pause className="w-3 h-3 sm:w-4 sm:h-4 sm:hidden" />
            <HelpCircle className="w-3 h-3 sm:w-4 sm:h-4 sm:hidden" />
            <span className="hidden sm:inline text-xs font-medium">Pause/Controls</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ScoreBoard;