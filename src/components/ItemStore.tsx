import React from 'react';
import { GameState } from '../types/game';
import { Store, DollarSign, X } from 'lucide-react';
import PizzaSliceStack from './PizzaSliceStack';
import beerImg from '/Sprites/beer.png';
import honeyImg from '/Sprites/hothoney.png';
import sundaeImg from '/Sprites/sundae.png';

interface ItemStoreProps {
  gameState: GameState;
  onUpgradeOven: (lane: number) => void;
  onUpgradeOvenSpeed: (lane: number) => void;
  onBribeReviewer: () => void;
  onBuyPowerUp: (type: 'beer' | 'ice-cream' | 'honey') => void;
  onClose: () => void;
}

const ItemStore: React.FC<ItemStoreProps> = ({
  gameState,
  onUpgradeOven,
  onUpgradeOvenSpeed,
  onBribeReviewer,
  onBuyPowerUp,
  onClose,
}) => {
  const upgradeCost = 10;
  const speedUpgradeCost = 10;
  const maxUpgradeLevel = 7;
  const maxSpeedUpgradeLevel = 3;
  const bribeCost = 25;
  const powerUpCost = 5;

  const getOvenUpgradeLevel = (lane: number) => gameState.ovenUpgrades[lane] || 0;
  const getOvenSpeedUpgradeLevel = (lane: number) => gameState.ovenSpeedUpgrades[lane] || 0;
  const canAffordUpgrade = gameState.bank >= upgradeCost;
  const canAffordSpeedUpgrade = gameState.bank >= speedUpgradeCost;

  const getSpeedUpgradeText = (level: number) => {
    if (level === 0) return 'Base: 3s';
    if (level === 1) return '2.5s';
    if (level === 2) return '2s';
    return '1.5s';
  };

  return (
    <div className="bg-white rounded-lg shadow-2xl p-2 sm:p-4 w-full max-w-3xl mx-2 sm:mx-4 relative max-h-[95vh] overflow-y-auto">
      {/* Header Row */}
      <div className="flex items-center justify-between mb-2 sm:mb-4">
        {/* Left: Store Title + Bank */}
        <div className="flex items-center space-x-2 sm:space-x-4">
          <div className="flex items-center space-x-1.5 sm:space-x-2">
            <Store className="w-4 h-4 sm:w-6 sm:h-6 text-orange-600" />
            <div>
              <h2 className="text-sm sm:text-xl font-bold text-gray-800">Item Store</h2>
              <p className="text-[10px] sm:text-xs text-gray-600">Level {gameState.level}</p>
            </div>
          </div>

          {/* Bank balance — directly beside Item Store */}
          <div className="flex items-center bg-green-100 border border-green-300 rounded-md px-2 sm:px-4 py-1 sm:py-2 shadow-sm">
            <DollarSign className="w-4 h-4 sm:w-6 sm:h-6 text-green-700 mr-0.5 sm:mr-1" />
            <span className="text-xs sm:text-lg font-bold text-green-800">
              {gameState.bank}
            </span>
          </div>
        </div>

        {/* Right: Close button */}
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Close store"
        >
          <X className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
      </div>

      {/* Two-column content */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 mb-2 sm:mb-4">
        {/* Oven Upgrades */}
        <div>
          <h3 className="text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">Oven Upgrades</h3>
          <div className="space-y-1.5 sm:space-y-2">
            {[0, 1, 2, 3].map((lane) => {
              const currentLevel = getOvenUpgradeLevel(lane);
              const currentSpeedLevel = getOvenSpeedUpgradeLevel(lane);
              const isMaxLevel = currentLevel >= maxUpgradeLevel;
              const isMaxSpeedLevel = currentSpeedLevel >= maxSpeedUpgradeLevel;
              const slicesProduced = 1 + currentLevel;

              return (
                <div
                  key={lane}
                  className="border-2 border-orange-200 rounded-lg p-1.5 sm:p-2 bg-gradient-to-br from-orange-50 to-yellow-50 flex items-center justify-between gap-1.5 sm:gap-2"
                >
                  {/* LEFT: Pizza icon and label */}
                  <div className="flex items-center gap-1.5 sm:gap-3">
                    <div className="relative shrink-0 w-6 h-6 sm:w-10 sm:h-10">
                      <PizzaSliceStack sliceCount={slicesProduced} />
                    </div>
                    <div className="leading-tight">
                      <h4 className="text-[11px] sm:text-sm font-bold text-gray-800">Oven {lane + 1}</h4>
                      <p className="text-[9px] sm:text-xs text-gray-600">Lvl: {slicesProduced} | {getSpeedUpgradeText(currentSpeedLevel)}</p>
                    </div>
                  </div>

                  {/* RIGHT: Speed upgrade + Level upgrade buttons */}
                  <div className="flex items-center gap-0.5 sm:gap-1">
                    {/* Speed Upgrade Button */}
                    {isMaxSpeedLevel ? (
                      <div className="bg-gray-200 text-gray-600 rounded py-0.5 px-1 sm:py-1 sm:px-2 text-[9px] sm:text-xs font-semibold whitespace-nowrap">
                        Max⚡
                      </div>
                    ) : (
                      <button
                        onClick={() => onUpgradeOvenSpeed(lane)}
                        disabled={!canAffordSpeedUpgrade}
                        className={`rounded py-0.5 px-1 sm:py-1 sm:px-2 text-[9px] sm:text-xs font-semibold transition-colors whitespace-nowrap ${
                          canAffordSpeedUpgrade
                            ? 'bg-blue-600 hover:bg-blue-700 text-white'
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        }`}
                        title="Upgrade Speed"
                      >
                        ⚡${speedUpgradeCost}
                      </button>
                    )}

                    {/* Level Upgrade Button */}
                    {isMaxLevel ? (
                      <div className="bg-gray-200 text-gray-600 rounded py-0.5 px-1 sm:py-1 sm:px-2 text-[9px] sm:text-xs font-semibold whitespace-nowrap">
                        Max 🍕
                      </div>
                    ) : (
                      <button
                        onClick={() => onUpgradeOven(lane)}
                        disabled={!canAffordUpgrade}
                        className={`rounded py-0.5 px-1 sm:py-1 sm:px-2 text-[9px] sm:text-xs font-semibold transition-colors whitespace-nowrap ${
                          canAffordUpgrade
                            ? 'bg-orange-600 hover:bg-orange-700 text-white'
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        }`}
                        title="Upgrade Level"
                      >
                        🍕 ${upgradeCost}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Specials & Power-Ups */}
        <div>
          <h3 className="text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">Special Items</h3>
          <div className="space-y-1.5 sm:space-y-2">
            <div className="border-2 border-yellow-300 rounded-lg p-1.5 sm:p-3 bg-gradient-to-br from-yellow-50 to-orange-50">
              <h4 className="text-[10px] sm:text-sm font-bold text-gray-800 mb-0.5 sm:mb-1 text-center">⭐ Bribe Reviewer</h4>
              <p className="text-[9px] sm:text-xs text-gray-600 mb-1 sm:mb-2 text-center">Gain an extra star</p>
              <button
                onClick={onBribeReviewer}
                disabled={gameState.bank < bribeCost || gameState.lives >= 5}
                className={`w-full rounded py-0.5 px-2 sm:py-1 sm:px-3 text-[10px] sm:text-xs font-semibold transition-colors ${
                  gameState.bank >= bribeCost && gameState.lives < 5
                    ? 'bg-yellow-500 hover:bg-yellow-600 text-white'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                ${bribeCost}
              </button>
              {gameState.lives >= 5 && (
                <p className="text-[9px] sm:text-xs text-center mt-0.5 sm:mt-1 text-gray-500">Max stars!</p>
              )}
            </div>

            <h3 className="text-xs sm:text-sm font-semibold text-gray-700 mt-1.5 sm:mt-3 mb-1 sm:mb-2">Power-Ups</h3>
            <div className="grid grid-cols-3 gap-1 sm:gap-2">
              {[
                { type: 'beer', img: beerImg, color: 'amber' },
                { type: 'ice-cream', img: sundaeImg, color: 'blue' },
                { type: 'honey', img: honeyImg, color: 'orange' },
              ].map(({ type, img, color }) => (
                <button
                  key={type}
                  onClick={() => onBuyPowerUp(type as 'beer' | 'ice-cream' | 'honey')}
                  disabled={gameState.bank < powerUpCost}
                  className={`border-2 rounded-lg p-1 sm:p-2 flex flex-col items-center transition-colors ${
                    gameState.bank >= powerUpCost
                      ? `border-${color}-300 bg-${color}-50 hover:bg-${color}-100`
                      : 'border-gray-300 bg-gray-100 cursor-not-allowed opacity-50'
                  }`}
                >
                  <img src={img} alt={type} className="w-5 h-5 sm:w-8 sm:h-8 object-contain mb-0.5 sm:mb-1" />
                  <span className="text-[9px] sm:text-xs font-semibold">${powerUpCost}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={onClose}
        className="block mx-auto w-half bg-red-600 hover:bg-gray-700 text-white rounded-lg py-1.5 px-3 sm:py-2 sm:px-4 text-xs sm:text-sm font-semibold transition-colors"
      >
        Continue Playing
      </button>
    </div>
  );
};

export default ItemStore;
