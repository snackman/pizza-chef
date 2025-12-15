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
    <div className="bg-white rounded-xl shadow-2xl p-2 sm:p-6 max-w-6xl w-full mx-2 sm:mx-4">
      <div className="flex items-center justify-between mb-1 sm:mb-4 gap-2">
        <div className="flex-1 min-w-0">
          <h2 className="text-lg sm:text-3xl font-bold text-red-600">
            Game Over!
          </h2>
          <div className="flex flex-wrap gap-2 sm:gap-4">
            <p className="text-xs sm:text-lg text-gray-700">Score: <span className="font-bold text-red-600">{score}</span></p>
            <p className="text-xs sm:text-lg text-gray-600">Level: {level}</p>
          </div>
        </div>
        <button
          onClick={onContinue}
          className="px-3 sm:px-6 py-1 sm:py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold text-sm sm:text-lg whitespace-nowrap flex-shrink-0"
        >
          Continue
        </button>
      </div>

      <div className="border-t border-gray-200 pt-1 sm:pt-4">
        <div className="grid grid-cols-2 gap-2 sm:gap-6">
          <div>
            <h3 className="text-xs sm:text-xl font-bold mb-1 sm:mb-3 text-gray-800">Statistics</h3>
            <div className="grid grid-cols-2 sm:grid-cols-2 gap-1 sm:gap-3">
              <StatCard
                icon="🍕"
                label="Baked"
                value={stats.slicesBaked}
              />
              <StatCard
                icon="⚙️"
                label="Upgrades"
                value={stats.ovenUpgradesMade}
              />
              <StatCard
                icon="😋"
                label="Served"
                value={stats.customersServed}
              />
              <StatCard
                icon="🔥"
                label="Streak"
                value={stats.longestCustomerStreak}
              />
              <StatCard
                icon="🍽️"
                label="Plates"
                value={stats.platesCaught}
              />
              <StatCard
                icon="✨"
                label="P. Streak"
                value={stats.largestPlateStreak}
              />
            </div>
          </div>

          <div>
            <h4 className="text-xs sm:text-xl font-bold mb-1 sm:mb-3 text-gray-800">Power-Ups</h4>
            <div className="grid grid-cols-2 sm:grid-cols-2 gap-1 sm:gap-3">
              {Object.entries(stats.powerUpsUsed).map(([key, value]) => (
                <div
                  key={key}
                  className="bg-gradient-to-br from-orange-100 to-yellow-100 rounded p-1 sm:p-3 text-center"
                >
                  <div className="text-sm sm:text-2xl">{powerUpNames[key].split(' ')[0]}</div>
                  <div className="text-base sm:text-xl font-bold text-red-600">{value}</div>
                </div>
              ))}
            </div>
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
    <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded p-1 sm:p-3 text-center border border-orange-200">
      <div className="text-sm sm:text-2xl">{icon}</div>
      <div className="text-[8px] sm:text-xs font-semibold text-gray-700 leading-tight">{label}</div>
      <div className="text-sm sm:text-xl font-bold text-red-600">{value}</div>
    </div>
  );
}
