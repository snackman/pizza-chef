import React from 'react';
import { BossBattle } from '../types/game';
import { sprite } from '../lib/assets';

const bossImg = sprite("dominos_boss.png");

interface BossProps {
  bossBattle: BossBattle;
}

const Boss: React.FC<BossProps> = ({ bossBattle }) => {
  if (!bossBattle.active && !bossBattle.bossDefeated) return null;

  return (
    <>
      {!bossBattle.bossDefeated && (
        <div
          className="absolute transition-all duration-100 flex items-center justify-center"
          style={{
            left: `${bossBattle.bossPosition}%`,
            top: '12.5%',
            width: '24%',
            height: '75%',
            opacity: bossBattle.bossVulnerable ? 1 : 0.5,
          }}
        >
          <img
            src={bossImg}
            alt="boss"
            className="w-full h-full object-contain"
            style={{
              filter: bossBattle.bossVulnerable
                ? `drop-shadow(0 0 20px rgba(255, 0, 0, 0.8))`
                : 'grayscale(0.5)',
            }}
          />
          {bossBattle.bossVulnerable && (
            <div
              className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-red-600 text-white px-3 py-1 rounded-full text-sm font-bold whitespace-nowrap"
            >
              HP: {bossBattle.bossHealth}/8
            </div>
          )}
          {!bossBattle.bossVulnerable && (
            <div
              className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-700 text-white px-3 py-1 rounded-full text-sm font-bold whitespace-nowrap"
            >
              Wave {bossBattle.currentWave}/3
            </div>
          )}
        </div>
      )}

      {bossBattle.minions.map(minion => {
  if (minion.defeated) return null;
  return (
    <div
      key={minion.id}
      className="absolute transition-all duration-100 flex items-center justify-center w-[8%] aspect-square"
      style={{
        left: `${minion.position}%`,
        top: `${minion.lane * 25 + 6}%`,
      }}
    >
      <img
        src={bossImg}
        alt="minion"
        className="w-full h-full object-contain"
      />
    </div>
  );
})}
    </>
  );
};

export default Boss;
