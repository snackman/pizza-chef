import React from 'react';
import Customer from './Customer';
import PizzaSlice from './PizzaSlice';
import EmptyPlate from './EmptyPlate';
import PowerUp from './PowerUp';
import PizzaSliceStack from './PizzaSliceStack';
import { GameState } from '../types/game';
import { getOvenStatus, getOvenStatusEmoji } from '../utils/ovenStatus';
import { getLayoutConfig, LayoutVariant } from '../utils/gameLayout';

interface GameBoardProps {
  gameState: GameState;
  variant?: LayoutVariant;
}

const GameBoard: React.FC<GameBoardProps> = ({ gameState, variant = 'portrait' }) => {
  const lanes = [0, 1, 2, 3];
  const [, forceUpdate] = React.useReducer(x => x + 1, 0);
  const layout = getLayoutConfig(variant);

  React.useEffect(() => {
    const interval = setInterval(forceUpdate, 100);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className={layout.containerClassName}
      style={{
        backgroundImage: layout.backgroundImage,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {lanes.map((lane) => {
        const oven = gameState.ovens[lane];
        const speedUpgrade = gameState.ovenSpeedUpgrades[lane] || 0;
        const ovenStatus = getOvenStatus(oven, speedUpgrade);
        const showSlices = oven.cooking && !oven.burned;

        return (
          <div
            key={lane}
            className="absolute aspect-[2/3] flex items-center justify-center"
            style={{
              width: layout.oven.width,
              height: layout.oven.height,
              left: layout.oven.left,
              top: layout.oven.getTop(lane),
              fontSize: layout.oven.fontSize,
            }}
          >
            {showSlices && (
              <div className="absolute" style={layout.oven.sliceStackStyle}>
                <PizzaSliceStack sliceCount={oven.sliceCount} />
              </div>
            )}
            <div className="relative" style={{ zIndex: 10 }}>
              {getOvenStatusEmoji(ovenStatus)}
            </div>
          </div>
        );
      })}

      {!gameState.nyanSweep?.active && (
        <div
          className="absolute top-0 h-full flex flex-col items-center justify-center"
          style={{ width: layout.chef.containerWidth, left: layout.chef.containerLeft }}
        >
          <div
            className="absolute w-[8%] aspect-square flex items-center justify-center"
            style={{
              top: layout.chef.getTop(gameState.chefLane),
              left: variant === 'portrait' ? '10%' : undefined,
              transition: 'all 0.2s',
              zIndex: gameState.gameOver ? 19 : 10,
            }}
          >
            {gameState.gameOver ? (
              <div style={{ fontSize: layout.chef.gameOverFontSize }}>🧟</div>
            ) : (
              <img
                src="https://i.imgur.com/EPCSa79.png"
                alt="chef"
                className="w-full h-full object-contain"
                style={{ transform: layout.chef.imageScale }}
              />
            )}
            <div
              className={`absolute ${gameState.starPowerActive ? 'animate-pulse' : ''}`}
              style={layout.chef.sliceStackStyle}
            >
              <PizzaSliceStack sliceCount={gameState.availableSlices} />
            </div>
          </div>
        </div>
      )}

      {gameState.nyanSweep?.active && (
        <div
          className="absolute aspect-square flex items-center justify-center"
          style={{
            width: layout.nyanCat.width,
            height: layout.nyanCat.height,
            top: layout.nyanCat.getTop(gameState.chefLane),
            left: `${gameState.nyanSweep.xPosition}%`,
            zIndex: 20,
          }}
        >
          <img
            src="https://i.imgur.com/fGPU4Pu.png"
            alt="nyan cat"
            className="w-full h-full object-contain"
            style={{ transform: layout.nyanCat.imageScale }}
          />
        </div>
      )}

      {variant === 'portrait' && lanes.map((lane) => (
        <div
          key={`counter-${lane}`}
          className="absolute w-full h-[20%]"
          style={{ top: `${lane * 25 + 4}%` }}
        />
      ))}

      {variant === 'portrait' && (
        <div className="absolute right-0 top-0 w-[10%] h-full flex flex-col items-center justify-center" />
      )}

      {gameState.customers.map((customer) => (
        <Customer key={customer.id} customer={customer} variant={variant} />
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

      {gameState.fallingPizza && (
        <div
          className="absolute transition-none"
          style={{
            left: layout.fallingPizza.left,
            top: layout.fallingPizza.getTop(gameState.fallingPizza.lane, gameState.fallingPizza.y),
            transform: `rotate(${gameState.fallingPizza.y * 2}deg)`,
            zIndex: 19,
            fontSize: layout.fallingPizza.fontSize,
          }}
        >
          🍕
        </div>
      )}
    </div>
  );
};

export default GameBoard;
