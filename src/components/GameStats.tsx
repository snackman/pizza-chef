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
    <div className="bg-white rounded-xl shadow-2xl p-4 sm:p-6 max-w-6xl w-full mx-4 max-h-[85vh] overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <div className="flex-1">
          <h2 className="text-2xl sm:text-3xl font-bold text-red-600">
            Game Over!
          </h2>
          <div className="flex gap-4 mt-1">
            <p className="text-lg text-gray-700">Final Score: <span className="font-bold text-red-600">{score}</span></p>
            <p className="text-lg text-gray-600">Level: {level}</p>
          </div>
        </div>
        <button
          onClick={onContinue}
          className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold text-lg whitespace-nowrap"
        >
          Continue
        </button>
      </div>

      <div className="border-t-2 border-gray-200 pt-4">
        <h3 className="text-xl font-bold mb-3 text-gray-800">Game Statistics</h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
          <StatCard
            icon="🍕"
            label="Slices Baked"
            value={stats.slicesBaked}
          />
          <StatCard
            icon="⚙️"
            label="Oven Upgrades"
            value={stats.ovenUpgradesMade}
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
        </div>

        <div className="border-t-2 border-gray-200 pt-4">
          <h4 className="text-lg font-bold mb-3 text-gray-800">Power-Ups Used</h4>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {Object.entries(stats.powerUpsUsed).map(([key, value]) => (
              <div
                key={key}
                className="bg-gradient-to-br from-orange-100 to-yellow-100 rounded-lg p-2 text-center"
              >
                <div className="text-xl mb-1">{powerUpNames[key].split(' ')[0]}</div>
                <div className="text-xs font-semibold text-gray-700 mb-1">
                  {powerUpNames[key].split(' ').slice(1).join(' ')}
                </div>
                <div className="text-lg font-bold text-red-600">{value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
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
    <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-lg p-3 text-center border-2 border-orange-200">
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-xs font-semibold text-gray-700 mb-1 leading-tight">{label}</div>
      <div className="text-xl font-bold text-red-600">{value}</div>
    </div>
  );
}
