import React from 'react';
import { BossBattle } from '../types/game';
import { sprite } from '../lib/assets';
import { PAPA_JOHN_CONFIG, DOMINOS_CONFIG } from '../lib/constants';

const dominosBossImg = sprite("dominos-boss.png");
const papaJohnSprites = [
  sprite("papa-john.png"),    // Encounter 1 (level 10)
  sprite("papa-john-2.png"),  // Encounter 2 (level 20)
  sprite("papa-john-3.png"),  // Encounter 3 (level 40)
  sprite("papa-john-4.png"),  // Encounter 4 (level 50)
  sprite("papa-john-5.png"),  // Encounter 5 (level 60)
  sprite("papa-john-6.png"),  // Encounter 6 (level 70)
];

const getBossSprite = (bossBattle: BossBattle): string => {
  if (bossBattle.bossType === 'dominos') {
    return dominosBossImg;
  }
  // Papa John - select based on hits received (changes every 8 hits)
  const hits = bossBattle.hitsReceived || 0;
  const spriteIndex = Math.min(Math.floor(hits / 8), papaJohnSprites.length - 1);
  return papaJohnSprites[spriteIndex];
};

const getBossConfig = (bossBattle: BossBattle) => {
  return bossBattle.bossType === 'papaJohn' ? PAPA_JOHN_CONFIG : DOMINOS_CONFIG;
};

interface BossProps {
  bossBattle: BossBattle;
}

const Boss: React.FC<BossProps> = ({ bossBattle }) => {
  if (!bossBattle.active && !bossBattle.bossDefeated) return null;

  const bossSprite = getBossSprite(bossBattle);
  const config = getBossConfig(bossBattle);

  return (
    <>
      {!bossBattle.bossDefeated && (
        <div
          className="absolute transition-none flex items-center justify-center"
          style={{
            left: `${bossBattle.bossPosition}%`,
            top: `${bossBattle.bossLane * 25}%`,
            width: '24%',
            height: '25%',
            opacity: bossBattle.bossVulnerable ? 1 : 0.5,
          }}
        >
          <img
            src={bossSprite}
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
              HP: {bossBattle.bossHealth}/{config.HEALTH}
            </div>
          )}
          {!bossBattle.bossVulnerable && (
            <div
              className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-700 text-white px-3 py-1 rounded-full text-sm font-bold whitespace-nowrap"
            >
              Wave {bossBattle.currentWave}/{config.WAVES}
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
              src={bossSprite}
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
