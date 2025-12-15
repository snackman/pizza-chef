import { GameStats } from '../types/game';

interface StreakDisplayProps {
  stats: GameStats;
}

export default function StreakDisplay({ stats }: StreakDisplayProps) {
  const showCustomerStreak = stats.currentCustomerStreak >= 5;
  const showPlateStreak = stats.currentPlateStreak >= 5;

  if (!showCustomerStreak && !showPlateStreak) {
    return null;
  }

  return (
    <div className="absolute top-2 right-2 z-10 flex flex-col gap-2">
      {showCustomerStreak && (
        <div className="bg-gradient-to-br from-yellow-400 to-orange-500 text-white px-4 py-2 rounded-lg shadow-lg border-2 border-yellow-200 animate-pulse">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🔥</span>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide">Customer Streak</div>
              <div className="text-2xl font-bold">{stats.currentCustomerStreak}</div>
            </div>
          </div>
        </div>
      )}

      {showPlateStreak && (
        <div className="bg-gradient-to-br from-blue-400 to-purple-500 text-white px-4 py-2 rounded-lg shadow-lg border-2 border-blue-200 animate-pulse">
          <div className="flex items-center gap-2">
            <span className="text-2xl">⚡</span>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide">Plate Streak</div>
              <div className="text-2xl font-bold">{stats.currentPlateStreak}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
