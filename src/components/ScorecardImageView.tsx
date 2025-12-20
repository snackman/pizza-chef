import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface ScorecardImageViewProps {
  imageUrl: string | null;
  playerName: string;
  onBack: () => void;
}

const ScorecardImageView: React.FC<ScorecardImageViewProps> = ({ imageUrl, playerName, onBack }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl p-4 sm:p-6 max-w-2xl w-full">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800">
            {playerName.toUpperCase()}'S SCORECARD
          </h2>
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-semibold text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        </div>

        <div className="bg-gray-100 rounded-lg overflow-hidden">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={`${playerName}'s scorecard`}
              className="w-full h-auto"
            />
          ) : (
            <div className="aspect-square flex items-center justify-center text-gray-500">
              <div className="text-center p-8">
                <p className="text-lg font-semibold mb-2">No scorecard available</p>
                <p className="text-sm">This player's scorecard image was not saved</p>
              </div>
            </div>
          )}
        </div>

        <button
          onClick={onBack}
          className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-semibold"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Leaderboard
        </button>
      </div>
    </div>
  );
};

export default ScorecardImageView;
