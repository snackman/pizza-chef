import React, { useState } from 'react';
import { Send, X } from 'lucide-react';
import { submitScore } from '../services/highScores';

interface SubmitScoreProps {
  score: number;
  onSubmitted: () => void;
  onSkip: () => void;
}

const SubmitScore: React.FC<SubmitScoreProps> = ({ score, onSubmitted, onSkip }) => {
  const [playerName, setPlayerName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }

    if (playerName.trim().length > 50) {
      setError('Name must be 50 characters or less');
      return;
    }

    setSubmitting(true);
    setError('');

    const success = await submitScore(playerName.trim(), score);

    if (success) {
      onSubmitted();
    } else {
      setError('Failed to submit score. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
      <h2 className="text-3xl font-bold text-gray-800 mb-2">Game Over!</h2>
      <p className="text-xl text-gray-600 mb-6">Your Score: <span className="font-bold text-amber-600">{score}</span></p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="playerName" className="block text-sm font-medium text-gray-700 mb-2">
            Enter your name to save your score:
          </label>
          <input
            type="text"
            id="playerName"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Your name"
            maxLength={50}
            className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-amber-500 focus:outline-none transition-colors"
            disabled={submitting}
          />
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={submitting || !playerName.trim()}
            className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 px-6 rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting ? (
              'Submitting...'
            ) : (
              <>
                <Send className="w-5 h-5" />
                Submit Score
              </>
            )}
          </button>
          <button
            type="button"
            onClick={onSkip}
            disabled={submitting}
            className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <X className="w-5 h-5" />
            Skip
          </button>
        </div>
      </form>
    </div>
  );
};

export default SubmitScore;
