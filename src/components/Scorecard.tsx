import React from 'react';
import { X, Trophy, Star, Pizza, Users, Zap, Flame, TrendingUp } from 'lucide-react';
import { GameSession } from '../services/highScores';

interface ScorecardProps {
  session: GameSession | null;
  onClose: () => void;
}

const Scorecard: React.FC<ScorecardProps> = ({ session, onClose }) => {
  if (!session) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-800">Scorecard</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <p className="text-gray-600">No scorecard available for this player.</p>
        </div>
      </div>
    );
  }

  const powerUpIcons: Record<string, string> = {
    honey: '🍯',
    'ice-cream': '🍦',
    beer: '🍺',
    star: '⭐',
    doge: '🐕',
    nyan: '🌈',
    moltobenny: '👨‍🍳',
  };

  const totalPowerUps = Object.values(session.power_ups_used).reduce((sum, count) => sum + count, 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-2xl p-6 max-w-2xl w-full my-8">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-3xl font-bold text-gray-800 mb-1">
              {session.player_name.toUpperCase()}
            </h2>
            <p className="text-sm text-gray-500">
              {new Date(session.created_at).toLocaleDateString()} at{' '}
              {new Date(session.created_at).toLocaleTimeString()}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-gradient-to-br from-yellow-100 to-yellow-200 rounded-lg p-4 border-2 border-yellow-400">
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="w-5 h-5 text-yellow-600" />
              <h3 className="font-bold text-yellow-800">Final Score</h3>
            </div>
            <p className="text-3xl font-bold text-yellow-900">{session.score.toLocaleString()}</p>
          </div>

          <div className="bg-gradient-to-br from-purple-100 to-purple-200 rounded-lg p-4 border-2 border-purple-400">
            <div className="flex items-center gap-2 mb-2">
              <Star className="w-5 h-5 text-purple-600" />
              <h3 className="font-bold text-purple-800">Level Reached</h3>
            </div>
            <p className="text-3xl font-bold text-purple-900">{session.level}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Pizza className="w-5 h-5 text-orange-600" />
              <h3 className="font-bold text-gray-800">Pizza Stats</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-sm text-gray-600">Slices Baked</p>
                <p className="text-xl font-bold text-gray-900">{session.slices_baked}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Oven Upgrades</p>
                <p className="text-xl font-bold text-gray-900">{session.oven_upgrades}</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-gray-800">Customer Stats</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-sm text-gray-600">Customers Served</p>
                <p className="text-xl font-bold text-gray-900">{session.customers_served}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Longest Streak</p>
                <p className="text-xl font-bold text-gray-900">{session.longest_streak}</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-5 h-5 text-green-600" />
              <h3 className="font-bold text-gray-800">Plate Catching</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-sm text-gray-600">Plates Caught</p>
                <p className="text-xl font-bold text-gray-900">{session.plates_caught}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Largest Streak</p>
                <p className="text-xl font-bold text-gray-900">{session.largest_plate_streak}</p>
              </div>
            </div>
          </div>

          {totalPowerUps > 0 && (
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Flame className="w-5 h-5 text-red-600" />
                <h3 className="font-bold text-gray-800">Power-Ups Used</h3>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(session.power_ups_used).map(([key, count]) => {
                  if (count === 0) return null;
                  return (
                    <div key={key} className="flex items-center gap-2">
                      <span className="text-2xl">{powerUpIcons[key]}</span>
                      <div>
                        <p className="text-xs text-gray-600 capitalize">
                          {key === 'ice-cream' ? 'Ice Cream' : key}
                        </p>
                        <p className="text-lg font-bold text-gray-900">{count}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={onClose}
          className="mt-6 w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default Scorecard;
