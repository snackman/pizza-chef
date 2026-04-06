import React from 'react';
import { BossBattle } from '../types/game';
import { sprite } from '../lib/assets';
import { PAPA_JOHN_CONFIG, DOMINOS_CONFIG, CHUCK_E_CHEESE_CONFIG, PIZZA_THE_HUT_CONFIG } from '../lib/constants';

const dominosBossImg = sprite("dominos-boss.png");
const pizzaTheHutImg = sprite("pizza-the-hut.png");
const cheeseSlimeImg = sprite("cheese-slime.png");
const chuckECheeseImg = sprite("chuck-e-cheese.png");
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
  if (bossBattle.bossType === 'pizzaTheHut') {
    return pizzaTheHutImg;
  }
  if (bossBattle.bossType === 'chuckECheese') {
    return chuckECheeseImg;
  }
  // Papa John - select based on hits received (changes every 8 hits)
  const hits = bossBattle.hitsReceived || 0;
  const spriteIndex = Math.min(Math.floor(hits / 8), papaJohnSprites.length - 1);
  return papaJohnSprites[spriteIndex];
};

const getBossConfig = (bossBattle: BossBattle) => {
  if (bossBattle.bossType === 'papaJohn') return PAPA_JOHN_CONFIG;
  if (bossBattle.bossType === 'pizzaTheHut') return PIZZA_THE_HUT_CONFIG;
  if (bossBattle.bossType === 'chuckECheese') return CHUCK_E_CHEESE_CONFIG;
  return DOMINOS_CONFIG;
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
              src={minion.slime ? cheeseSlimeImg : (minion.sprite || bossSprite)}
              alt={minion.slime ? "cheese slime" : "minion"}
              className="w-full h-full object-contain"
              style={minion.slime ? { transform: 'scale(1.5)' } : undefined}
            />
          </div>
        );
      })}
    </>
  );
};

function areBossPropsEqual(prev: BossProps, next: BossProps): boolean {
  const a = prev.bossBattle;
  const b = next.bossBattle;

  if (
    a.active !== b.active ||
    a.bossType !== b.bossType ||
    a.bossHealth !== b.bossHealth ||
    a.currentWave !== b.currentWave ||
    a.bossVulnerable !== b.bossVulnerable ||
    a.bossDefeated !== b.bossDefeated ||
    a.bossPosition !== b.bossPosition ||
    a.bossLane !== b.bossLane ||
    a.hitsReceived !== b.hitsReceived ||
    a.minions.length !== b.minions.length ||
    a.slimesRemainingInWave !== b.slimesRemainingInWave
  ) {
    return false;
  }

  // Compare minions
  return a.minions.every((m, i) => {
    const n = b.minions[i];
    return (
      m.id === n.id &&
      m.position === n.position &&
      m.lane === n.lane &&
      m.defeated === n.defeated &&
      m.sprite === n.sprite &&
      m.slime === n.slime
    );
  });
}

export default React.memo(Boss, areBossPropsEqual);
