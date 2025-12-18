import { GameStats } from '../types/game';

interface StreakDisplayProps {
  stats: GameStats;
}

export function getStreakMultiplier(streak: number): number {
  if (streak < 5) {
    return 1.0;
  }
  return 1.0 + 0.01 * streak;
}

export default function StreakDisplay({ stats }: StreakDisplayProps) {
  const showCustomerStreak = stats.currentCustomerStreak >= 5;
  const showPlateStreak = stats.currentPlateStreak >= 5;

  if (!showCustomerStreak && !showPlateStreak) {
    return null;
  }

  const customerMultiplier = getStreakMultiplier(stats.currentCustomerStreak);
  const plateMultiplier = getStreakMultiplier(stats.currentPlateStreak);

  return (
    <div className="absolute top-2 right-[14%] z-30 flex flex-col gap-2">
      {showCustomerStreak && (
        <div className="bg-gradient-to-br from-yellow-400 to-orange-500 text-white px-4 py-2 rounded-lg shadow-lg border-2 border-yellow-200 animate-pulse">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🔥</span>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide">Customer Streak</div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold">{stats.currentCustomerStreak}</span>
                <span className="text-sm font-semibold bg-white/20 px-2 py-0.5 rounded">{customerMultiplier.toFixed(2)}x</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {showPlateStreak && (
        <div className="bg-gradient-to-br from-blue-400 to-cyan-500 text-white px-4 py-2 rounded-lg shadow-lg border-2 border-blue-200 animate-pulse">
          <div className="flex items-center gap-2">
            <span className="text-2xl">⚡</span>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide">Plate Streak</div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold">{stats.currentPlateStreak}</span>
                <span className="text-sm font-semibold bg-white/20 px-2 py-0.5 rounded">{plateMultiplier.toFixed(2)}x</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
