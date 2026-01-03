import React, { useEffect, useState, useRef } from 'react';
import GameBoard from './components/GameBoard';
import ScoreBoard from './components/ScoreBoard';
import LandscapeGameBoard from './components/LandscapeGameBoard';
import LandscapeScoreBoard from './components/LandscapeScoreBoard';
import LandscapeControls from './components/LandscapeControls';
import MobileGameControls from './components/MobileGameControls';
import InstructionsModal from './components/InstructionsModal';
import SplashScreen from './components/SplashScreen';
import GameOverScreen from './components/GameOverScreen';
import HighScores from './components/HighScores';
import ItemStore from './components/ItemStore';
import PowerUpAlert from './components/PowerUpAlert';
import StreakDisplay from './components/StreakDisplay';
import DebugPanel from './components/DebugPanel';
import ControlsOverlay from './components/ControlsOverlay';
import { useGameLogic } from './hooks/useGameLogic';
import { bg } from './lib/assets';

const counterImg = bg('counter.png');

function App() {
  const [showGameOver, setShowGameOver] = useState(false);
  const [showHighScores, setShowHighScores] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [showControlsOverlay, setShowControlsOverlay] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [isLandscape, setIsLandscape] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [marbleTop, setMarbleTop] = useState(0);
  const gameBoardRef = useRef<HTMLDivElement>(null);
  const SHOW_DEBUG = false;

  const {
    gameState,
    servePizza,
    moveChef,
    useOven,
    cleanOven,
    resetGame,
    togglePause,
    upgradeOven,
    upgradeOvenSpeed,
    closeStore,
    bribeReviewer,
    buyPowerUp,
    debugActivatePowerUp,
  } = useGameLogic(gameStarted);

  // ---- Refs to avoid stale closures + re-binding keyboard handler every tick ----
  const gameStateRef = useRef(gameState);
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  const actionsRef = useRef({
    servePizza,
    moveChef,
    useOven,
    cleanOven,
    togglePause,
    resetGame,
  });

  useEffect(() => {
    actionsRef.current = { servePizza, moveChef, useOven, cleanOven, togglePause, resetGame };
  }, [servePizza, moveChef, useOven, cleanOven, togglePause, resetGame]);

  useEffect(() => {
    if (gameState.gameOver && !showGameOver && !showHighScores) {
      setShowGameOver(true);
    }
  }, [gameState.gameOver, showGameOver, showHighScores]);

  const handleStartGame = () => {
    setShowSplash(false);
    setGameStarted(true);
    setShowControlsOverlay(true);
  };

  // Pause game when controls overlay is shown and game has started
  useEffect(() => {
    if (showControlsOverlay && gameStarted && !gameState.paused && !gameState.gameOver) {
      togglePause();
    }
  }, [showControlsOverlay, gameStarted, gameState.paused, gameState.gameOver, togglePause]);

  const handleCloseControlsOverlay = () => {
    setShowControlsOverlay(false);
    // Unpause the game
    if (gameState.paused && !gameState.gameOver) {
      togglePause();
    }
  };

  useEffect(() => {
    const checkOrientation = () => {
      const mobile = window.innerWidth < 1000;
      const landscape = window.innerWidth > window.innerHeight;
      setIsMobile(mobile);
      setIsLandscape(mobile && landscape);
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  // Calculate marble background position based on gameboard bottom
  useEffect(() => {
    if (!isMobile || !gameBoardRef.current) return;

    const updateMarblePosition = () => {
      if (gameBoardRef.current) {
        const rect = gameBoardRef.current.getBoundingClientRect();
        setMarbleTop(rect.bottom);
      }
    };

    updateMarblePosition();
    window.addEventListener('resize', updateMarblePosition);
    window.addEventListener('orientationchange', updateMarblePosition);

    // Use ResizeObserver to watch for gameboard size changes
    const resizeObserver = new ResizeObserver(updateMarblePosition);
    if (gameBoardRef.current) {
      resizeObserver.observe(gameBoardRef.current);
    }

    return () => {
      window.removeEventListener('resize', updateMarblePosition);
      window.removeEventListener('orientationchange', updateMarblePosition);
      resizeObserver.disconnect();
    };
    // NOTE: you had [isMobile, gameState]; keeping it to preserve behavior, but it's heavier than needed.
  }, [isMobile, gameState]);

  useEffect(() => {
    if (showInstructions && !gameState.paused && gameStarted && !gameState.gameOver) {
      togglePause();
    }
  }, [showInstructions, gameStarted, gameState.paused, gameState.gameOver, togglePause]);

  // ✅ Stable keyboard listener (no re-bind every tick)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const gs = gameStateRef.current;
      const a = actionsRef.current;

      if (!gameStarted || showInstructions) return;

      // Optional: block input when overlays/modals are up
      if (showControlsOverlay || showHighScores || showGameOver || gs.showStore) return;

      const target = event.target as HTMLElement | null;
      const isTyping =
        !!target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          // contenteditable (e.g. some UI libs)
          (target as any).isContentEditable);

      if (isTyping) return;

      if (event.key === ' ' || event.key === 'ArrowLeft') {
        event.preventDefault();
        const currentOven = gs.ovens[gs.chefLane];
        if (currentOven.burned) {
          a.cleanOven();
        } else {
          a.useOven();
        }
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        a.moveChef('up');
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        a.moveChef('down');
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        a.servePizza();
      } else if (event.key === 'p' || event.key === 'P') {
        a.togglePause();
      } else if (event.key === 'r' || event.key === 'R') {
        a.resetGame();
      }
    };

    window.addEventListener('keydown', handleKeyDown, { passive: false });
    return () => window.removeEventListener('keydown', handleKeyDown as any);
  }, [gameStarted, showInstructions, showControlsOverlay, showHighScores, showGameOver]);

  const handleGameBoardClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!gameStarted || gameState.gameOver || gameState.paused || gameState.showStore) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const relativeX = x / rect.width;
    const relativeY = y / rect.height;

    const laneHeight = 0.25;
    const chefY = gameState.chefLane * laneHeight + 0.06;
    const counterX = 0.42;

    if (relativeX > counterX) {
      servePizza();
    } else if (relativeX < counterX) {
      if (relativeY >= chefY && relativeY <= chefY + laneHeight) {
        const currentOven = gameState.ovens[gameState.chefLane];
        if (currentOven.burned) {
          cleanOven();
        } else {
          useOven();
        }
      } else if (relativeY < chefY && gameState.chefLane > 0) {
        moveChef('up');
      } else if (relativeY > chefY + laneHeight && gameState.chefLane < 3) {
        moveChef('down');
      }
    }
  };

  if (showSplash) {
    return <SplashScreen onStart={handleStartGame} />;
  }

  if (isLandscape) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-orange-200 via-yellow-100 to-red-200 overflow-hidden">
        <div className="relative w-full h-full">
          <LandscapeGameBoard gameState={gameState} />

          {gameState.powerUpAlert && (
            <PowerUpAlert powerUpType={gameState.powerUpAlert.type} chefLane={gameState.powerUpAlert.chefLane} />
          )}

          {!gameState.gameOver && !gameState.paused && !gameState.showStore && <StreakDisplay stats={gameState.stats} />}

          <LandscapeScoreBoard gameState={gameState} onShowInstructions={() => setShowInstructions(true)} />
          <LandscapeControls
            gameOver={gameState.gameOver}
            paused={gameState.paused}
            nyanSweepActive={gameState.nyanSweep?.active ?? false}
            onMoveUp={() => moveChef('up')}
            onMoveDown={() => moveChef('down')}
            onServePizza={servePizza}
            onUseOven={useOven}
            onCleanOven={cleanOven}
            currentLane={gameState.chefLane}
            availableSlices={gameState.availableSlices}
            ovens={gameState.ovens}
            ovenSpeedUpgrades={gameState.ovenSpeedUpgrades}
          />

          {gameState.gameOver && showGameOver && (
            <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center z-20">
              <div className="flex flex-col items-center gap-4 p-4 max-h-[90vh] overflow-y-auto">
                <GameOverScreen
                  stats={gameState.stats}
                  score={gameState.score}
                  level={gameState.level}
                  lastStarLostReason={gameState.lastStarLostReason}
                  onSubmitted={() => { }}
                  onPlayAgain={() => {
                    resetGame();
                    setShowGameOver(false);
                  }}
                />
              </div>
            </div>
          )}

          {showControlsOverlay && <ControlsOverlay onClose={handleCloseControlsOverlay} />}

          {gameState.paused && !gameState.gameOver && !gameState.showStore && !showControlsOverlay && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
              <div className="text-center bg-white p-4 sm:p-6 rounded-xl shadow-xl mx-4">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4">Paused</h2>
                <p className="text-gray-600">Tap to continue</p>
                <button
                  onClick={togglePause}
                  className="mt-4 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Resume
                </button>
              </div>
            </div>
          )}

          {gameState.showStore && (
            <div className="absolute inset-0 bg-black bg-opacity-75 flex items-start justify-center z-[60] pt-2">
              <ItemStore
                gameState={gameState}
                onUpgradeOven={upgradeOven}
                onUpgradeOvenSpeed={upgradeOvenSpeed}
                onBribeReviewer={bribeReviewer}
                onBuyPowerUp={buyPowerUp}
                onClose={closeStore}
              />
            </div>
          )}

          {showInstructions && (
            <InstructionsModal
              onClose={() => setShowInstructions(false)}
              onReset={() => {
                resetGame();
                setShowHighScores(false);
                setShowGameOver(false);
              }}
              onShowHighScores={() => {
                setShowHighScores(true);
                setShowInstructions(false);
              }}
              onResume={() => {
                if (gameState.paused && !gameState.gameOver) {
                  togglePause();
                }
              }}
            />
          )}

          {showHighScores && !gameState.gameOver && (
            <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
              <div className="flex flex-col items-center gap-4 p-4 max-h-[90vh] overflow-y-auto">
                <HighScores />
                <button
                  onClick={() => {
                    setShowHighScores(false);
                    if (gameState.paused) {
                      togglePause();
                    }
                  }}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold"
                >
                  Resume Game
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-orange-200 via-yellow-100 to-red-200 flex items-center justify-center overflow-hidden">
      <div className="relative w-full h-full flex flex-col">
        <div
          className={`flex-1 flex flex-col items-center ${isMobile ? 'justify-start' : 'justify-center p-2 sm:p-4 gap-0'
            } ${isMobile ? 'relative' : ''}`}
        >
          <div className={`w-full ${isMobile ? '' : 'max-w-6xl'}`}>
            <ScoreBoard gameState={gameState} onShowInstructions={() => setShowInstructions(true)} />
          </div>

          <div
            ref={gameBoardRef}
            className={`relative w-full ${isMobile ? '' : 'max-w-6xl'} aspect-[5/3] z-30`}
            onClick={handleGameBoardClick}
          >
            <GameBoard gameState={gameState} />

            {gameState.powerUpAlert && (
              <PowerUpAlert powerUpType={gameState.powerUpAlert.type} chefLane={gameState.powerUpAlert.chefLane} />
            )}

            {!gameState.gameOver && !gameState.paused && !gameState.showStore && <StreakDisplay stats={gameState.stats} />}

            {showControlsOverlay && <ControlsOverlay onClose={handleCloseControlsOverlay} />}

            {gameState.paused && !gameState.gameOver && !gameState.showStore && !showControlsOverlay && (
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-lg">
                <div className="text-center bg-white p-4 sm:p-6 rounded-xl shadow-xl mx-4">
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4">Paused</h2>
                  <p className="text-gray-600">Press Space or tap to continue</p>
                  <button
                    onClick={togglePause}
                    className="mt-4 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Resume
                  </button>
                </div>
              </div>
            )}

            {gameState.showStore && (
              <div className="absolute inset-0 bg-black bg-opacity-75 flex items-start justify-center rounded-lg z-[60] pt-2">
                <ItemStore
                  gameState={gameState}
                  onUpgradeOven={upgradeOven}
                  onUpgradeOvenSpeed={upgradeOvenSpeed}
                  onBribeReviewer={bribeReviewer}
                  onBuyPowerUp={buyPowerUp}
                  onClose={closeStore}
                />
              </div>
            )}
          </div>

          {/* Marble counter texture background on mobile - anchored to bottom of gameboard */}
          {isMobile && (
            <div
              className="fixed left-0 right-0 bottom-0 z-25"
              style={{
                top: `${marbleTop}px`,
                backgroundImage: `url(${counterImg})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
              }}
            />
          )}

          {SHOW_DEBUG && gameStarted && !gameState.gameOver && !gameState.showStore && (
            <DebugPanel onActivatePowerUp={debugActivatePowerUp} />
          )}
        </div>

        {gameState.gameOver && showGameOver && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-40 p-2">
            <div className="flex flex-col items-center gap-2 w-full max-w-6xl max-h-[100dvh] overflow-y-auto py-2">
              <GameOverScreen
                stats={gameState.stats}
                score={gameState.score}
                level={gameState.level}
                lastStarLostReason={gameState.lastStarLostReason}
                onSubmitted={() => { }}
                onPlayAgain={() => {
                  resetGame();
                  setShowGameOver(false);
                }}
              />
            </div>
          </div>
        )}

        {showInstructions && (
          <InstructionsModal
            onClose={() => setShowInstructions(false)}
            onReset={() => {
              resetGame();
              setShowHighScores(false);
              setShowGameOver(false);
            }}
            onShowHighScores={() => {
              setShowHighScores(true);
              setShowInstructions(false);
            }}
            onResume={() => {
              if (gameState.paused && !gameState.gameOver) {
                togglePause();
              }
            }}
          />
        )}

        {showHighScores && !gameState.gameOver && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="flex flex-col items-center gap-4 p-4 max-h-[90vh] overflow-y-auto">
              <HighScores />
              <button
                onClick={() => {
                  setShowHighScores(false);
                  if (gameState.paused) {
                    togglePause();
                  }
                }}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold"
              >
                Resume Game
              </button>
            </div>
          </div>
        )}

        {isMobile && !gameState.gameOver && !showInstructions && !showHighScores && !gameState.showStore && (
          <MobileGameControls
            gameOver={gameState.gameOver}
            paused={gameState.paused}
            nyanSweepActive={gameState.nyanSweep?.active ?? false}
            onMoveUp={() => moveChef('up')}
            onMoveDown={() => moveChef('down')}
            onServePizza={servePizza}
            onUseOven={useOven}
            onCleanOven={cleanOven}
            currentLane={gameState.chefLane}
            availableSlices={gameState.availableSlices}
            ovens={gameState.ovens}
            ovenSpeedUpgrades={gameState.ovenSpeedUpgrades}
          />
        )}
      </div>
    </div>
  );
}

export default App;
