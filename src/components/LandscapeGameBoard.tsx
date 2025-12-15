import React from 'react';
import LandscapeCustomer from './LandscapeCustomer';
import PizzaSlice from './PizzaSlice';
import EmptyPlate from './EmptyPlate';
import PowerUp from './PowerUp';
import PizzaSliceStack from './PizzaSliceStack';
import { GameState } from '../types/game';
import landscapeBg from '../assets/landscape version pizza chef.png';
import chefImg from '/Sprites/chefemoji.png';

interface LandscapeGameBoardProps {
  gameState: GameState;
}

const LandscapeGameBoard: React.FC<LandscapeGameBoardProps> = ({ gameState }) => {
  const lanes = [0, 1, 2, 3];
  const [, forceUpdate] = React.useReducer(x => x + 1, 0);

  React.useEffect(() => {
    const interval = setInterval(forceUpdate, 100);
    return () => clearInterval(interval);
  }, []);

  const getOvenStatus = (lane: number) => {
    const oven = gameState.ovens[lane];

    if (oven.burned) {
      if (oven.cleaningStartTime > 0) {
        const cleaningElapsed = Date.now() - oven.cleaningStartTime;
        const halfCleaning = 1500;
        if (cleaningElapsed < halfCleaning) {
          return 'extinguishing';
        }
        return 'sweeping';
      }
      return 'burned';
    }

    if (!oven.cooking) return 'empty';

    const elapsed = oven.pausedElapsed !== undefined ? oven.pausedElapsed : Date.now() - oven.startTime;

    // Calculate cook time based on speed upgrades
    const speedUpgrade = gameState.ovenSpeedUpgrades[lane] || 0;
    const cookingTime = speedUpgrade === 0 ? 3000 :
                        speedUpgrade === 1 ? 2000 :
                        speedUpgrade === 2 ? 1000 : 500;

    const warningTime = 7000;
    const burnTime = 8000;
    const blinkInterval = 250;

    if (elapsed >= burnTime) return 'burning';

    if (elapsed >= warningTime) {
      const warningElapsed = elapsed - warningTime;
      const blinkCycle = Math.floor(warningElapsed / blinkInterval);
      return blinkCycle % 2 === 0 ? 'warning-fire' : 'warning-pizza';
    }

    if (elapsed >= cookingTime) return 'ready';
    return 'cooking';
  };

  return (
    <div
      className="relative w-full h-full overflow-hidden"
      style={{
        backgroundImage: `url("https://i.imgur.com/f2a5vFx.jpeg")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Pizza Ovens - positioned on the left side */}
      {lanes.map((lane) => {
        const ovenStatus = getOvenStatus(lane);
        const oven = gameState.ovens[lane];
        const showSlices = oven.cooking && !oven.burned;

        return (
          <div
            key={lane}
            className="absolute flex items-center justify-center"
            style={{
              width: '4%',
              height: '4%',
              left: '12vw',
              top: `${30 + lane * 20}%`,
              fontSize: 'clamp(0.75rem, 1.5vw, 1rem)',
            }}
          >
            {showSlices && (
              <div className="absolute" style={{ width: '200%', height: '200%', top: '50%', left: '100%', transform: 'translate(-50%, -50%)', zIndex: 1 }}>
                <PizzaSliceStack sliceCount={oven.sliceCount} />
              </div>
            )}
            <div className="relative" style={{ zIndex: 10 }}>
              {ovenStatus === 'burned' ? '💀' :
               ovenStatus === 'extinguishing' ? '🧯' :
               ovenStatus === 'sweeping' ? '🧹' :
               ovenStatus === 'burning' ? '💀' :
               ovenStatus === 'warning-fire' ? '🔥' :
               ovenStatus === 'warning-pizza' ? '⚠️' :
               ovenStatus === 'ready' ? '♨️' :
               ovenStatus === 'cooking' ? '🌡️' :
               ''}
            </div>
          </div>
        );
      })}

      {/* Chef positioned at current lane - only shown when NOT in nyan sweep */}
      {!gameState.nyanSweep?.active && (
        <div
          className="absolute flex items-center justify-center"
          style={{
            width: '3%',
            height: '3%',
            left: '20%',
            top: `${30 + gameState.chefLane * 20}%`,
            transition: 'all 0.2s',
            zIndex: gameState.gameOver ? 19 : 10
          }}
        >
          {gameState.gameOver ? (
            <div style={{ fontSize: 'clamp(1rem, 2vw, 1.5rem)' }}>🧟</div>
          ) : (
            <img src={"https://i.imgur.com/EPCSa79.png"} alt="chef" className="w-full h-full object-contain" style={{ transform: 'scale(5)' }} />
          )}
          <div
            className={`absolute ${gameState.starPowerActive ? 'animate-pulse' : ''}`}
            style={{ width: '400%', height: '400%', top: '10%', left: '-30%'}}
          >
            <PizzaSliceStack sliceCount={gameState.availableSlices} />
          </div>
        </div>
      )}

      {/* Nyan Cat Chef - positioned directly on game board during sweep */}
      {gameState.nyanSweep?.active && (
        <div
          className="absolute flex items-center justify-center"
          style={{
            width: '3%',
            height: '3%',
            left: `${gameState.nyanSweep.xPosition}%`,
            top: `${30 + gameState.chefLane * 20}%`,
            zIndex: 20
          }}
        >
          <img src="https://i.imgur.com/fGPU4Pu.png" alt="nyan cat" className="w-full h-full object-contain" style={{ transform: 'scale(0.5)' }} />
        </div>
      )}

      {/* Game Elements */}
      {gameState.customers.map((customer) => (
        <LandscapeCustomer key={customer.id} customer={customer} />
      ))}

      {gameState.pizzaSlices.map((slice) => (
        <PizzaSlice key={slice.id} slice={slice} />
      ))}

      {gameState.emptyPlates.map((plate) => (
        <EmptyPlate key={plate.id} plate={plate} />
      ))}

      {gameState.powerUps.map((powerUp) => (
        <PowerUp key={powerUp.id} powerUp={powerUp} />
      ))}

      {/* Falling pizza when game over */}
      {gameState.fallingPizza && (
        <div
          className="absolute transition-none"
          style={{
            left: '22%',
            top: `calc(${23.5 + gameState.fallingPizza.lane * 18.5}% + ${gameState.fallingPizza.y}px)`,
            transform: `rotate(${gameState.fallingPizza.y * 2}deg)`,
            zIndex: 19,
            fontSize: 'clamp(0.75rem, 2vw, 1.25rem)',
          }}
        >
          🍕
        </div>
      )}
    </div>
  );
};

export default LandscapeGameBoard;
