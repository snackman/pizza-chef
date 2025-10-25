import React, { useEffect, useState } from 'react';
import { Trophy } from 'lucide-react';
import { getTopScores, HighScore } from '../services/highScores';

const HighScores: React.FC = () => {
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
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-4xl w-full">
      <div className="flex items-center gap-3 mb-6 justify-center">
        <Trophy className="w-8 h-8 text-yellow-500" />
        <h2 className="text-3xl font-bold text-gray-800">Top Scores</h2>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading scores...</div>
      ) : scores.length === 0 ? (
        <div className="text-center py-8 text-gray-500">No scores yet. Be the first!</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            {leftColumn.map((score, index) => (
              <div
                key={score.id}
                className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                  index === 0
                    ? 'bg-yellow-100 border-2 border-yellow-400'
                    : index === 1
                    ? 'bg-gray-100 border-2 border-gray-400'
                    : index === 2
                    ? 'bg-orange-100 border-2 border-orange-400'
                    : 'bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`font-bold text-lg w-8 ${
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
                  <span className="font-medium text-gray-800 truncate max-w-[150px] sm:max-w-[200px]">
                    {score.player_name}
                  </span>
                </div>
                <span className="font-bold text-xl text-gray-800 ml-4">{score.score.toLocaleString()}</span>
              </div>
            ))}
          </div>

          {rightColumn.length > 0 && (
            <div className="space-y-2">
              {rightColumn.map((score, index) => (
                <div
                  key={score.id}
                  className="flex items-center justify-between p-3 rounded-lg transition-colors bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-lg w-8 text-gray-500">
                      #{index + 6}
                    </span>
                    <span className="font-medium text-gray-800 truncate max-w-[150px] sm:max-w-[200px]">
                      {score.player_name}
                    </span>
                  </div>
                  <span className="font-bold text-xl text-gray-800 ml-4">{score.score.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default HighScores;
