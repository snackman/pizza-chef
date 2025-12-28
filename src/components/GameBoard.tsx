import React, { useState, useCallback, useEffect, useRef } from 'react';
import Customer from './Customer';
import PizzaSlice from './PizzaSlice';
import EmptyPlate from './EmptyPlate';
import DroppedPlate from './DroppedPlate';
import PowerUp from './PowerUp';
import PizzaSliceStack from './PizzaSliceStack';
import FloatingScore from './FloatingScore';
import Boss from './Boss';
import { GameState } from '../types/game';
import pizzaShopBg from '/pizza shop background v2.png';
import chefImg from '/Sprites/chefemoji.png';

interface GameBoardProps {
  gameState: GameState;
}

const GameBoard: React.FC<GameBoardProps> = ({ gameState }) => {
  const lanes = [0, 1, 2, 3];
  const [, forceUpdate] = React.useReducer(x => x + 1, 0);
  const [completedScores, setCompletedScores] = useState<Set<string>>(new Set());

  // ✅ Measure board size (for px-based translate3d positioning)
  const boardRef = useRef<HTMLDivElement | null>(null);
  const [boardSize, setBoardSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = boardRef.current;
    if (!el) return;

    const update = () => {
      const rect = el.getBoundingClientRect();
      setBoardSize({ width: rect.width, height: rect.height });
    };

    update();

    const ro = new ResizeObserver(() => update());
    ro.observe(el);

    return () => ro.disconnect();
  }, []);

  const handleScoreComplete = useCallback((id: string) => {
    setCompletedScores(prev => new Set(prev).add(id));
  }, []);

  React.useEffect(() => {
    const interval = setInterval(forceUpdate, 100);
    return () => clearInterval(interval);
  }, []);

  const getOvenStatus = (lane: number) => {
    const oven = gameState.ovens[lane];

    if (oven.burned) {
      if (oven.cleaningStartTime > 0) {
        const cleaningElapsed = Date.now() - oven.cleaningStartTime;
        const halfCleaning = 1500; // 1.5 seconds (half of 3 second cleaning time)
        if (cleaningElapsed < halfCleaning) {
          return 'extinguishing';
        }
        return 'sweeping';
      }
      return 'burned';
    }

    if (!oven.cooking) return 'empty';

    // Use pausedElapsed if game is paused, otherwise calculate from startTime
    const elapsed = oven.pausedElapsed !== undefined ? oven.pausedElapsed : Date.now() - oven.startTime;

    // Calculate cook time based on speed upgrades
    const speedUpgrade = gameState.ovenSpeedUpgrades[lane] || 0;
    const cookingTime =
      speedUpgrade === 0 ? 3000 :
      speedUpgrade === 1 ? 2500 :
      speedUpgrade === 2 ? 2000 : 1500;

    const warningTime = 7000; // 7 seconds (start blinking)
    const burnTime = 8000; // 8 seconds total
    const blinkInterval = 250; // 0.25 seconds

    if (elapsed >= burnTime) return 'burning';

    // Blinking phase (between 7-8 seconds)
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
      ref={boardRef}
      className="relative w-full aspect-[5/3] border-4 border-amber-600 rounded-lg overflow-hidden"
      style={{
        backgroundImage: `url(${pizzaShopBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Pizza Ovens - one per lane */}
      {lanes.map((lane) => {
        const ovenStatus = getOvenStatus(lane);
        const oven = gameState.ovens[lane];
        const showSlices = oven.cooking && !oven.burned;

        return (
          <div
            key={lane}
            className="absolute aspect-[2/3] flex items-center justify-center"
            style={{
              width: '8%',
              left: '1%',
              top: `${lane * 25 + 6}%`,
              fontSize: 'clamp(1.25rem, 2.5vw, 1.75rem)',
            }}
          >
            {showSlices && (
              <div
                className="absolute"
                style={{
                  width: '75%',
                  height: '75%',
                  top: '40%',
                  left: '70%',
                  transform: 'translate(-50%, -50%)',
                  zIndex: 1
                }}
              >
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

      {/* ✅ Chef (no scale(15), positioned directly on board) */}
      {!gameState.nyanSweep?.active && (
        <div
          className="absolute flex items-center justify-center"
          style={{
            left: '5%', // adjust if you want him closer/farther from ovens
            top: `${gameState.chefLane * 25 + 13}%`,
            width: '10%',
            aspectRatio: '1 / 1',
            transform: 'translate3d(0, -50%, 0)', // center on lane
            zIndex: gameState.gameOver ? 19 : 10,
            willChange: 'transform',
          }}
        >
          <img
            src={gameState.gameOver ? "https://i.imgur.com/PwRdw0u.png" : "https://i.imgur.com/EPCSa79.png"}
            alt={gameState.gameOver ? "game over" : "chef"}
            className="w-full h-full object-contain"
            style={{ transform: 'none' }}
          />

          {/* ✅ Slice stack (restored to same relative size as before) */}
          <div
            className={`absolute ${gameState.starPowerActive ? 'animate-pulse' : ''}`}
            style={{
              left: '55%',
              top: '100%',
              width: '91%',
              height: '91%',
              transform: 'translateY(-50%)',
              pointerEvents: 'none',
            }}
          >
            <PizzaSliceStack sliceCount={gameState.availableSlices} />
          </div>
        </div>
      )}

      {/* Nyan Cat Chef - positioned directly on game board during sweep */}
      {gameState.nyanSweep?.active && (
        <div
          className="absolute w-[8%] aspect-square flex items-center justify-center"
          style={{
            top: `${gameState.chefLane * 25 + 13}%`,
            left: `${gameState.nyanSweep.xPosition}%`,
            zIndex: 20
          }}
        >
          <img
            src="https://i.imgur.com/fGPU4Pu.png"
            alt="nyan chef"
            className="w-full h-full object-contain"
            style={{ transform: 'scale(1.5)' }}
          />
        </div>
      )}

      {/* Serving Counters */}
      {lanes.map((lane) => (
        <div
          key={lane}
          className="absolute w-full h-[20%]"
          style={{ top: `${lane * 25 + 4}%` }}
        />
      ))}

      {/* Customer End Area */}
      <div className="absolute right-0 top-0 w-[10%] h-full flex flex-col items-center justify-center" />

      {/* Game Elements */}
      {gameState.customers.map((customer) => (
        <Customer
          key={customer.id}
          customer={customer}
          boardWidth={boardSize.width}
          boardHeight={boardSize.height}
        />
      ))}

      {gameState.pizzaSlices.map((slice) => (
        <PizzaSlice key={slice.id} slice={slice} />
      ))}

      {gameState.emptyPlates.map((plate) => (
        <EmptyPlate key={plate.id} plate={plate} />
      ))}

      {gameState.droppedPlates.map((droppedPlate) => (
        <DroppedPlate key={droppedPlate.id} droppedPlate={droppedPlate} />
      ))}

      {gameState.powerUps.map((powerUp) => (
        <PowerUp key={powerUp.id} powerUp={powerUp} />
      ))}

      {/* Boss Battle */}
      {gameState.bossBattle && (
        <Boss bossBattle={gameState.bossBattle} />
      )}

      {/* Floating score indicators */}
      {gameState.floatingScores.filter(fs => !completedScores.has(fs.id)).map((floatingScore) => (
        <FloatingScore
          key={floatingScore.id}
          id={floatingScore.id}
          points={floatingScore.points}
          lane={floatingScore.lane}
          position={floatingScore.position}
          onComplete={handleScoreComplete}
        />
      ))}

      {/* Falling pizza when game over */}
      {gameState.fallingPizza && (
        <div
          className="absolute transition-none"
          style={{
            left: '13%',
            top: `calc(${gameState.fallingPizza.lane * 25 + 6}% + ${gameState.fallingPizza.y}px)`,
            transform: `rotate(${gameState.fallingPizza.y * 2}deg)`,
            zIndex: 19,
            fontSize: 'clamp(1.5rem, 4vw, 2.5rem)',
          }}
        >
          🍕
        </div>
      )}
    </div>
  );
};

export default GameBoard;
