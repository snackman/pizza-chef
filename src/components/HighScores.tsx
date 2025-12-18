import React, { useEffect, useState } from 'react';
import { Trophy } from 'lucide-react';
import { getTopScores, HighScore } from '../services/highScores';

interface HighScoresProps {
  userScore?: { name: string; score: number };
}

const HighScores: React.FC<HighScoresProps> = ({ userScore }) => {
  const [scores, setScores] = useState<HighScore[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadScores();
  }, []);

  const loadScores = async () => {
    setLoading(true);
    const topScores = await getTopScores(10);
    setScores(topScores);
    setLoading(false);
  };

  const leftColumn = scores.slice(0, 5);
  const rightColumn = scores.slice(5, 10);

  return (
    <div className="bg-white rounded-lg shadow-lg p-3 sm:p-6 w-full">
      <div className="flex items-center gap-2 mb-2 sm:mb-6 justify-center">
        <Trophy className="w-5 h-5 sm:w-8 sm:h-8 text-yellow-500" />
        <h2 className="text-xl sm:text-3xl font-bold text-gray-800">Top Scores</h2>
      </div>

      {loading ? (
        <div className="text-center py-4 text-gray-500 text-sm">Loading...</div>
      ) : scores.length === 0 ? (
        <div className="text-center py-4 text-gray-500 text-sm">No scores yet!</div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 sm:gap-6">
            <div className="space-y-1 sm:space-y-2">
              {leftColumn.map((score, index) => (
                <div
                  key={score.id}
                  className={`flex items-center justify-between p-1.5 sm:p-3 rounded transition-colors ${
                    index === 0
                      ? 'bg-yellow-100 border border-yellow-400'
                      : index === 1
                      ? 'bg-gray-100 border border-gray-400'
                      : index === 2
                      ? 'bg-orange-100 border border-orange-400'
                      : 'bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-1 sm:gap-3 min-w-0">
                    <span
                      className={`font-bold text-xs sm:text-lg w-5 sm:w-8 flex-shrink-0 ${
                        index === 0
                          ? 'text-yellow-600'
                          : index === 1
                          ? 'text-gray-600'
                          : index === 2
                          ? 'text-orange-600'
                          : 'text-gray-500'
                      }`}
                    >
                      #{index + 1}
                    </span>
                    <span className="font-medium text-gray-800 truncate text-xs sm:text-base">
                      {score.player_name.toUpperCase()}
                    </span>
                  </div>
                  <span className="font-bold text-xs sm:text-xl text-gray-800 ml-1 flex-shrink-0">{score.score.toLocaleString()}</span>
                </div>
              ))}
            </div>

            {rightColumn.length > 0 && (
              <div className="space-y-1 sm:space-y-2">
                {rightColumn.map((score, index) => (
                  <div
                    key={score.id}
                    className="flex items-center justify-between p-1.5 sm:p-3 rounded transition-colors bg-gray-50"
                  >
                    <div className="flex items-center gap-1 sm:gap-3 min-w-0">
                      <span className="font-bold text-xs sm:text-lg w-5 sm:w-8 text-gray-500 flex-shrink-0">
                        #{index + 6}
                      </span>
                      <span className="font-medium text-gray-800 truncate text-xs sm:text-base">
                        {score.player_name.toUpperCase()}
                      </span>
                    </div>
                    <span className="font-bold text-xs sm:text-xl text-gray-800 ml-1 flex-shrink-0">{score.score.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {userScore && (
            <div className="mt-4 pt-4 border-t-2 border-gray-200">
              <div className="bg-gradient-to-r from-amber-100 to-orange-100 border-2 border-amber-500 rounded-lg p-2 sm:p-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs sm:text-base text-amber-700 flex-shrink-0">
                    {userScore.name.toUpperCase()}
                  </span>
                  <span className="font-bold text-sm sm:text-xl text-amber-700 ml-2 flex-shrink-0">
                    {userScore.score.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default HighScores;
