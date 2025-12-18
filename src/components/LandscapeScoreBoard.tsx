import React from 'react';
import { GameState } from '../types/game';
import { Star, Trophy, DollarSign, Pause, HelpCircle, Layers } from 'lucide-react';

interface LandscapeScoreBoardProps {
  gameState: GameState;
  onShowInstructions: () => void;
}

const LandscapeScoreBoard: React.FC<LandscapeScoreBoardProps> = ({ gameState, onShowInstructions }) => {
  return (
    <div
      className="absolute text-white rounded-lg flex items-center justify-center px-4"
      style={{
        top: '0%',
        left: '20%',
        right: '20%',
        height: '16%',
      }}
    >
      <div className="flex items-center justify-center space-x-6 text-sm">
        <div className="flex items-center space-x-1">
          <Trophy className="w-4 h-4 text-yellow-300" />
          <span className="font-bold">{gameState.score.toLocaleString()}</span>
        </div>

        <div className="flex items-center space-x-1">
          <div className="flex">
            {Array.from({ length: 5 }, (_, i) => (
              <Star
                key={i}
                className={`w-3 h-3 text-yellow-300 ${i < gameState.lives ? 'fill-current' : ''}`}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center space-x-1">
          <DollarSign className="w-4 h-4 text-green-300" />
          <span className="font-bold">{gameState.bank}</span>
        </div>

        <div className="flex items-center space-x-1">
          <Layers className="w-4 h-4 text-blue-300" />
          <span className="font-medium">Lvl {gameState.level}</span>
        </div>

        <button
          onClick={onShowInstructions}
          className="flex items-center space-x-1 px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
          aria-label="Pause and show controls"
        >
          <Pause className="w-3 h-3" />
          <HelpCircle className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};

export default LandscapeScoreBoard;
