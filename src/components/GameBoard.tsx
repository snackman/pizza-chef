import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import Customer from './Customer';
import PizzaSlice from './PizzaSlice';
import EmptyPlate from './EmptyPlate';
import DroppedPlate from './DroppedPlate';
import PowerUp from './PowerUp';
import PizzaSliceStack from './PizzaSliceStack';
import FloatingScore from './FloatingScore';
import FloatingStar from './FloatingStar';
import Boss from './Boss';
import PepeHelpers from './PepeHelpers';
import { GameState } from '../types/game';
import { sprite, bg } from '../lib/assets';
import { getOvenDisplayStatus } from '../logic/ovenSystem';
import { OVEN_CONFIG, TIMINGS } from '../lib/constants';

const chefImg = sprite("chef.png");
const cheesedChefImg = sprite("cheesed-chef.png");
const sadChefImg = sprite("sad-chef.png");
const nyanChefImg = sprite("nyan-chef.png");
const pizzaShopBg = bg("pizza-shop-background.webp");

interface GameBoardProps {
  gameState: GameState;
}

const GameBoard: React.FC<GameBoardProps> = ({ gameState }) => {
  const lanes = [0, 1, 2, 3];
  const [completedScores, setCompletedScores] = useState<Set<string>>(new Set());
  const [completedStars, setCompletedStars] = useState<Set<string>>(new Set());

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

  const handleStarComplete = useCallback((id: string) => {
    setCompletedStars(prev => new Set(prev).add(id));
  }, []);

  const activeFloatingScores = useMemo(
    () => gameState.floatingScores.filter(fs => !completedScores.has(fs.id)),
    [gameState.floatingScores, completedScores]
  );

  const activeFloatingStars = useMemo(
    () => gameState.floatingStars.filter(fs => !completedStars.has(fs.id)),
    [gameState.floatingStars, completedStars]
  );

  const getOvenStatus = (lane: number) => {
    const oven = gameState.ovens[lane];
    const speedUpgrade = gameState.ovenSpeedUpgrades[lane] || 0;
    const baseStatus = getOvenDisplayStatus(oven, speedUpgrade);

    // Add visual enhancements for GameBoard display
    if (baseStatus === 'cleaning') {
      const cleaningElapsed = Date.now() - oven.cleaningStartTime;
      const halfCleaning = OVEN_CONFIG.CLEANING_TIME / 2;
      return cleaningElapsed < halfCleaning ? 'extinguishing' : 'sweeping';
    }

    if (baseStatus === 'warning') {
      // Blinking effect for warning state
      const elapsed = oven.pausedElapsed !== undefined ? oven.pausedElapsed : Date.now() - oven.startTime;
      const warningElapsed = elapsed - OVEN_CONFIG.WARNING_TIME;
      const blinkCycle = Math.floor(warningElapsed / TIMINGS.WARNING_BLINK_INTERVAL);
      return blinkCycle % 2 === 0 ? 'warning-fire' : 'warning-pizza';
    }

    return baseStatus;
  };

  return (
    <div
      ref={boardRef}
      className="relative w-full aspect-[5/3] border-4 border-amber-600 sm:rounded-lg overflow-hidden"
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
              {oven.slimeDisabledUntil && Date.now() < oven.slimeDisabledUntil && oven.slimeCleaningStartTime ? '🧹' :
               oven.slimeDisabledUntil && Date.now() < oven.slimeDisabledUntil ? '🧀' :
               ovenStatus === 'burned' ? '💀' :
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
      {/* Hide chef when paused (but show game over chef) */}
      {!gameState.nyanSweep?.active && (!gameState.paused || gameState.gameOver) && (() => {
        const isSlimed = !!(gameState.chefSlowedUntil && Date.now() < gameState.chefSlowedUntil);
        return (
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
            transition: isSlimed ? 'top 300ms ease-in-out' : 'top 150ms ease-out',
          }}
        >
          <img
            src={gameState.gameOver ? sadChefImg : isSlimed ? cheesedChefImg : chefImg}
            alt={gameState.gameOver ? "game over" : isSlimed ? "cheesed chef" : "chef"}
            className="w-full h-full object-contain"
            style={{ transform: 'none' }}
          />

          {/* ✅ Slice stack (restored to same relative size as before) */}
          <div
            className={`absolute ${gameState.starPowerActive ? 'animate-pulse' : ''}`}
            style={{
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
        );
      })()}

      {/* Pepe Helpers - Franco-Pepe and Frank-Pepe */}
      <PepeHelpers helpers={gameState.pepeHelpers} />

      {/* Hired Worker */}
      {gameState.hiredWorker?.active && (
        <div
          className="absolute flex items-center justify-center"
          style={{
            left: '5%',
            top: `${gameState.hiredWorker.lane * 25 + 13}%`,
            width: '10%',
            aspectRatio: '1 / 1',
            transform: 'translate3d(0, -50%, 0)',
            zIndex: 10,
            transition: 'top 150ms ease-out',
          }}
        >
          <img
            src={sprite("franco-pepe.png")}
            alt="Hired worker"
            className="w-full h-full object-contain"
            style={{ filter: 'hue-rotate(180deg)' }}
          />
          {gameState.hiredWorker.availableSlices > 0 && (
            <div
              className="absolute"
              style={{
                left: '55%',
                top: '90%',
                width: '91%',
                height: '91%',
                transform: 'translateY(-50%)',
                pointerEvents: 'none',
              }}
            >
              <PizzaSliceStack sliceCount={gameState.hiredWorker.availableSlices} />
            </div>
          )}
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
            src={nyanChefImg}
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
        <PowerUp
          key={powerUp.id}
          powerUp={powerUp}
          boardWidth={boardSize.width}
          boardHeight={boardSize.height}
        />
      ))}


      {/* Boss Battle */}
      {gameState.bossBattle && (
        <Boss bossBattle={gameState.bossBattle} />
      )}

      {/* Floating score indicators */}
      {activeFloatingScores.map((floatingScore) => (
        <FloatingScore
          key={floatingScore.id}
          id={floatingScore.id}
          points={floatingScore.points}
          lane={floatingScore.lane}
          position={floatingScore.position}
          onComplete={handleScoreComplete}
        />
      ))}

      {/* Floating star indicators */}
      {activeFloatingStars.map((floatingStar) => (
        <FloatingStar
          key={floatingStar.id}
          id={floatingStar.id}
          isGain={floatingStar.isGain}
          count={floatingStar.count}
          lane={floatingStar.lane}
          position={floatingStar.position}
          onComplete={handleStarComplete}
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
