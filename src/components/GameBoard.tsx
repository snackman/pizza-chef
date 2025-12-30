import React, { useState, useCallback, useEffect, useRef } from 'react';
import Customer from './Customer';
import LandscapeCustomer from './LandscapeCustomer';
import PizzaSlice from './PizzaSlice';
import EmptyPlate from './EmptyPlate';
import DroppedPlate from './DroppedPlate';
import LandscapeDroppedPlate from './LandscapeDroppedPlate';
import PowerUp from './PowerUp';
import PizzaSliceStack from './PizzaSliceStack';
import FloatingScore from './FloatingScore';
import Boss from './Boss';
import { GameState } from '../types/game';
import pizzaShopBg from '/pizza shop background v2.png';

interface GameBoardProps {
  gameState: GameState;
  isLandscape?: boolean;
}

const GameBoard: React.FC<GameBoardProps> = ({ gameState, isLandscape = false }) => {
  const lanes = [0, 1, 2, 3];
  const [, forceUpdate] = React.useReducer(x => x + 1, 0);
  const [completedScores, setCompletedScores] = useState<Set<string>>(new Set());

  // Measure board size (for Portrait px-based translate3d positioning)
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
        const halfCleaning = 1500; 
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

    // Calculate cook time based on speed upgrades (Unified to faster settings)
    const speedUpgrade = gameState.ovenSpeedUpgrades[lane] || 0;
    const cookingTime =
      speedUpgrade === 0 ? 3000 :
      speedUpgrade === 1 ? 2000 :
      speedUpgrade === 2 ? 1000 : 500;

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

  const containerStyle: React.CSSProperties = isLandscape ? {
    backgroundImage: `url("https://i.imgur.com/f2a5vFx.jpeg")`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  } : {
    backgroundImage: `url(${pizzaShopBg})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  };

  const containerClass = isLandscape
    ? "relative w-full h-full overflow-hidden"
    : "relative w-full aspect-[5/3] border-4 border-amber-600 rounded-lg overflow-hidden";

  return (
    <div
      ref={boardRef}
      className={containerClass}
      style={containerStyle}
    >
      {/* Pizza Ovens - one per lane */}
      {lanes.map((lane) => {
        const ovenStatus = getOvenStatus(lane);
        const oven = gameState.ovens[lane];
        const showSlices = oven.cooking && !oven.burned;

        // Conditional Styles for Ovens
        const ovenStyle: React.CSSProperties = isLandscape ? {
            width: '4%',
            height: '4%',
            left: '12vw',
            top: `${30 + lane * 20}%`,
            fontSize: 'clamp(0.75rem, 1.5vw, 1rem)',
        } : {
            width: '8%',
            left: '1%',
            top: `${lane * 25 + 6}%`,
            fontSize: 'clamp(1.25rem, 2.5vw, 1.75rem)',
            aspectRatio: '2/3'
        };

        const sliceStackStyle: React.CSSProperties = isLandscape ? {
            width: '200%',
            height: '200%',
            top: '50%',
            left: '100%',
            transform: 'translate(-50%, -50%)',
            zIndex: 1
        } : {
            width: '75%',
            height: '75%',
            top: '40%',
            left: '70%',
            transform: 'translate(-50%, -50%)',
            zIndex: 1
        };

        return (
          <div
            key={lane}
            className="absolute flex items-center justify-center"
            style={ovenStyle}
          >
            {showSlices && (
              <div className="absolute" style={sliceStackStyle}>
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

      {/* Chef Character */}
      {!gameState.nyanSweep?.active && (
        <div
          className="absolute flex items-center justify-center"
          style={isLandscape ? {
            width: '15%',
            height: '15%',
            left: '15%',
            top: `${23 + gameState.chefLane * 20}%`,
            zIndex: gameState.gameOver ? 19 : 10
          } : {
            left: '5%',
            top: `${gameState.chefLane * 25 + 13}%`,
            width: '10%',
            aspectRatio: '1 / 1',
            transform: 'translate3d(0, -50%, 0)',
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

          <div
            className={`absolute ${gameState.starPowerActive ? 'animate-pulse' : ''}`}
            style={isLandscape ? {
                width: '80%', height: '80%', top: '10%', left: '60%'
            } : {
                left: '55%',
                top: '90%',
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

      {/* Nyan Cat Chef */}
      {gameState.nyanSweep?.active && (
        <div
          className="absolute flex items-center justify-center"
          style={isLandscape ? {
            width: '3%',
            height: '3%',
            left: `${gameState.nyanSweep.xPosition}%`,
            top: `${23 + gameState.chefLane * 20}%`,
            zIndex: 20
          } : {
            width: '8%',
            aspectRatio: '1/1',
            top: `${gameState.chefLane * 25 + 13}%`,
            left: `${gameState.nyanSweep.xPosition}%`,
            zIndex: 20
          }}
        >
          <img
            src="https://i.imgur.com/fGPU4Pu.png"
            alt="nyan chef"
            className="w-full h-full object-contain"
            style={{ transform: isLandscape ? 'scale(0.5)' : 'scale(1.5)' }}
          />
        </div>
      )}

      {/* Serving Counters (Portrait Only) */}
      {!isLandscape && lanes.map((lane) => (
        <div
          key={lane}
          className="absolute w-full h-[20%]"
          style={{ top: `${lane * 25 + 4}%` }}
        />
      ))}

      {/* Customer End Area (Portrait Only) */}
      {!isLandscape && (
        <div className="absolute right-0 top-0 w-[10%] h-full flex flex-col items-center justify-center" />
      )}

      {/* Game Elements */}
      {gameState.customers.map((customer) => (
        isLandscape ? (
            <LandscapeCustomer key={customer.id} customer={customer} />
        ) : (
            <Customer
                key={customer.id}
                customer={customer}
                boardWidth={boardSize.width}
                boardHeight={boardSize.height}
            />
        )
      ))}

      {gameState.pizzaSlices.map((slice) => (
        <PizzaSlice key={slice.id} slice={slice} />
      ))}

      {gameState.emptyPlates.map((plate) => (
        <EmptyPlate key={plate.id} plate={plate} />
      ))}

      {gameState.droppedPlates.map((droppedPlate) => (
        isLandscape ? (
            <LandscapeDroppedPlate key={droppedPlate.id} droppedPlate={droppedPlate} />
        ) : (
            <DroppedPlate key={droppedPlate.id} droppedPlate={droppedPlate} />
        )
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
          style={isLandscape ? {
            left: '22%',
            top: `calc(${23.5 + gameState.fallingPizza.lane * 18.5}% + ${gameState.fallingPizza.y}px)`,
            transform: `rotate(${gameState.fallingPizza.y * 2}deg)`,
            zIndex: 19,
            fontSize: 'clamp(0.75rem, 2vw, 1.25rem)',
          } : {
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