import { GameStats as GameStatsType } from '../types/game';

interface GameStatsProps {
  stats: GameStatsType;
  score: number;
  level: number;
  onContinue: () => void;
}

export default function GameStats({ stats, score, level, onContinue }: GameStatsProps) {
  const powerUpNames: Record<string, string> = {
    honey: '🍯 Hot Honey',
    'ice-cream': '🍦 Ice Cream',
    beer: '🍺 Beer',
    star: '⭐ Star Power',
    doge: '🐕 Doge Coin',
    nyan: '🌈 Nyan Cat',
  };

  return (
    <div className="bg-white rounded-xl shadow-2xl p-6 sm:p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
      <h2 className="text-3xl sm:text-4xl font-bold text-center mb-2 text-red-600">
        Game Over!
      </h2>
      <div className="text-center mb-6">
        <p className="text-xl text-gray-700">Final Score: <span className="font-bold text-red-600">{score}</span></p>
        <p className="text-lg text-gray-600">Level Reached: {level}</p>
      </div>

      <div className="border-t-2 border-gray-200 pt-4 mb-6">
        <h3 className="text-2xl font-bold text-center mb-4 text-gray-800">Game Statistics</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <StatCard
            icon="🍕"
            label="Slices Baked"
            value={stats.slicesBaked}
          />
          <StatCard
            icon="😋"
            label="Customers Served"
            value={stats.customersServed}
          />
          <StatCard
            icon="🔥"
            label="Longest Customer Streak"
            value={stats.longestCustomerStreak}
          />
          <StatCard
            icon="🍽️"
            label="Plates Caught"
            value={stats.platesCaught}
          />
          <StatCard
            icon="✨"
            label="Largest Plate Streak"
            value={stats.largestPlateStreak}
          />
          <StatCard
            icon="⚙️"
            label="Oven Upgrades"
            value={stats.ovenUpgradesMade}
          />
        </div>

        <div className="border-t-2 border-gray-200 pt-4">
          <h4 className="text-xl font-bold mb-3 text-gray-800">Power-Ups Used</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Object.entries(stats.powerUpsUsed).map(([key, value]) => (
              <div
                key={key}
                className="bg-gradient-to-br from-orange-100 to-yellow-100 rounded-lg p-3 text-center"
              >
                <div className="text-2xl mb-1">{powerUpNames[key].split(' ')[0]}</div>
                <div className="text-sm font-semibold text-gray-700 mb-1">
                  {powerUpNames[key].split(' ').slice(1).join(' ')}
                </div>
                <div className="text-xl font-bold text-red-600">{value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <button
        onClick={onContinue}
        className="w-full py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold text-lg"
      >
        Continue
      </button>
    </div>
  );
}

interface StatCardProps {
  icon: string;
  label: string;
  value: number;
}

function StatCard({ icon, label, value }: StatCardProps) {
  return (
    <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-lg p-4 text-center border-2 border-orange-200">
      <div className="text-3xl mb-2">{icon}</div>
      <div className="text-sm font-semibold text-gray-700 mb-1">{label}</div>
      <div className="text-2xl font-bold text-red-600">{value}</div>
    </div>
  );
}
