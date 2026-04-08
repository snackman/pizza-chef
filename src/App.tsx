import React, { useEffect, useState, useRef, useCallback } from 'react';
import GameBoard from './components/GameBoard';
import ScoreBoard from './components/ScoreBoard';
import MobileGameControls from './components/MobileGameControls';
import SplashScreen from './components/SplashScreen';
import GameOverScreen from './components/GameOverScreen';
import HighScores from './components/HighScores';
import ItemStore from './components/ItemStore';
import PowerUpAlert from './components/PowerUpAlert';
import StreakDisplay from './components/StreakDisplay';
import DebugPanel from './components/DebugPanel';
import ControlsOverlay from './components/ControlsOverlay';
import PauseMenu from './components/PauseMenu';
import { useGameLogic } from './hooks/useGameLogic';
import { useAssetPreloader } from './hooks/useAssetPreloader';
import { bg } from './lib/assets';
import { soundManager } from './utils/sounds';

const counterImg = bg('counter.webp');

function App() {
  const [showGameOver, setShowGameOver] = useState(false);
  const [showHighScores, setShowHighScores] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [showControlsOverlay, setShowControlsOverlay] = useState(false);
  const [controlsOpenedFromPause, setControlsOpenedFromPause] = useState(false);
  const [showPauseMenu, setShowPauseMenu] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [isLandscape, setIsLandscape] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isMuted, setIsMuted] = useState(soundManager.checkMuted());
  const [marbleTop, setMarbleTop] = useState(0);
  const gameBoardRef = useRef<HTMLDivElement>(null);
  const SHOW_DEBUG = false;

  // Preload game assets
  const { progress: assetProgress, isComplete: assetsReady, failedAssets } = useAssetPreloader();

  // Log failed assets in development
  useEffect(() => {
    if (failedAssets.length > 0) {
      console.warn('Some assets failed to load:', failedAssets);
    }
  }, [failedAssets]);

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
    hireWorker,
    debugActivatePowerUp,
    openLevelStore,
  } = useGameLogic(gameStarted);

  // Custom pause handler - shows pause menu overlay
  const handlePauseToggle = () => {
    if (showPauseMenu) {
      // Closing pause menu
      setShowPauseMenu(false);
      // Only toggle game pause if store isn't open (store handles its own pause)
      if (!gameState.showStore && gameState.paused) {
        togglePause();
      }
    } else {
      // Opening pause menu
      setShowPauseMenu(true);
      // Only toggle game pause if not already paused (store might have paused it)
      if (!gameState.paused) {
        togglePause();
      }
    }
  };

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
    handlePauseToggle,
    resetGame,
  });

  useEffect(() => {
    actionsRef.current = { servePizza, moveChef, useOven, cleanOven, handlePauseToggle, resetGame };
  }, [servePizza, moveChef, useOven, cleanOven, handlePauseToggle, resetGame]);

  useEffect(() => {
    if (gameState.gameOver && !showGameOver && !showHighScores) {
      setShowGameOver(true);
      setShowPauseMenu(false);
    }
  }, [gameState.gameOver, showGameOver, showHighScores]);

  // Close pause menu when game is unpaused externally
  useEffect(() => {
    if (!gameState.paused && !gameState.showStore && showPauseMenu) {
      setShowPauseMenu(false);
    }
  }, [gameState.paused, gameState.showStore, showPauseMenu]);

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
    // Only unpause if controls weren't opened from the pause menu
    if (!controlsOpenedFromPause && gameState.paused && !gameState.gameOver) {
      togglePause();
    }
    setControlsOpenedFromPause(false);
  };

  // Pause menu action handlers
  const handlePauseResume = useCallback(() => {
    handlePauseToggle();
  }, [handlePauseToggle]);

  const handlePauseReset = useCallback(() => {
    resetGame();
    setShowPauseMenu(false);
  }, [resetGame]);

  const handlePauseToggleMute = useCallback(() => {
    setIsMuted(soundManager.toggleMute());
  }, []);

  const handlePauseShowScores = useCallback(() => {
    setShowPauseMenu(false);
    setShowHighScores(true);
  }, []);

  const handlePauseShowHelp = useCallback(() => {
    setControlsOpenedFromPause(true);
    setShowControlsOverlay(true);
  }, []);

  // Handle Enter/Escape to close high scores view
  useEffect(() => {
    if (!showHighScores || gameState.gameOver) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === 'Escape') {
        e.preventDefault();
        setShowHighScores(false);
        setShowPauseMenu(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showHighScores, gameState.gameOver]);

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

  // Track menu state for space bar blocking
  const menuStateRef = useRef({ showSplash, showGameOver, showHighScores, showControlsOverlay, showPauseMenu, showStore: gameState.showStore });
  useEffect(() => {
    menuStateRef.current = { showSplash, showGameOver, showHighScores, showControlsOverlay, showPauseMenu, showStore: gameState.showStore };
  }, [showSplash, showGameOver, showHighScores, showControlsOverlay, showPauseMenu, gameState.showStore]);

  // Prevent space bar from triggering button clicks when menus are showing
  useEffect(() => {
    const preventSpaceInMenus = (event: KeyboardEvent) => {
      if (event.key !== ' ') return;

      // Skip if user is typing in an input
      const target = event.target as HTMLElement;
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA') {
        return;
      }

      // Block space bar if any menu/overlay is showing
      const { showSplash, showGameOver, showHighScores, showControlsOverlay, showPauseMenu, showStore } = menuStateRef.current;
      if (showSplash || showGameOver || showHighScores || showControlsOverlay || showPauseMenu || showStore) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    document.addEventListener('keydown', preventSpaceInMenus, { capture: true });
    document.addEventListener('keyup', preventSpaceInMenus, { capture: true });
    return () => {
      document.removeEventListener('keydown', preventSpaceInMenus, { capture: true });
      document.removeEventListener('keyup', preventSpaceInMenus, { capture: true });
    };
  }, []);

  // ✅ Stable keyboard listener (no re-bind every tick)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const gs = gameStateRef.current;
      const a = actionsRef.current;

      if (!gameStarted) return;

      // Optional: block input when overlays/modals are up
      if (showControlsOverlay || showHighScores || showGameOver || gs.showStore) return;

      // Block input during level complete phase
      if (gs.levelPhase === 'complete') return;

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
        } else if (currentOven.slimeDisabledUntil && Date.now() < currentOven.slimeDisabledUntil) {
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
        a.handlePauseToggle();
      } else if (event.key === 'r' || event.key === 'R') {
        a.resetGame();
      }
    };

    window.addEventListener('keydown', handleKeyDown, { passive: false });
    return () => window.removeEventListener('keydown', handleKeyDown as any);
  }, [gameStarted, showControlsOverlay, showHighScores, showGameOver]);

  // Game board click controls disabled - keyboard only
  // const handleGameBoardClick = (event: React.MouseEvent<HTMLDivElement>) => {
  //   if (!gameStarted || gameState.gameOver || gameState.paused || gameState.showStore) return;
  //   ...
  // };

  if (showSplash) {
    return (
      <SplashScreen
        onStart={handleStartGame}
        isLoading={!assetsReady}
        loadingProgress={assetProgress}
      />
    );
  }

  if (isLandscape) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-orange-200 via-yellow-100 to-red-200 overflow-hidden">
        {/* Landscape layout: controls on sides, game board centered */}
        <div className="relative w-full h-full flex items-center justify-center">
          {/* Center area for ScoreBoard and GameBoard */}
          <div className="flex flex-col items-center justify-center h-full" style={{ width: '76%' }}>
            {/* ScoreBoard at top - compact mode for landscape */}
            <div className="w-full">
              <ScoreBoard gameState={gameState} onPauseClick={handlePauseToggle} compact={true} />
            </div>

            {/* GameBoard - maintains 5:3 aspect ratio, scales to fit */}
            <div
              ref={gameBoardRef}
              className="relative w-full max-h-[calc(100vh-36px)] aspect-[5/3] z-30"
              style={{ maxWidth: 'calc((100vh - 36px) * 5 / 3)' }}
            >
              <GameBoard gameState={gameState} onLevelCompleteClick={openLevelStore} />

              {gameState.powerUpAlert && !gameState.paused && (
                <PowerUpAlert powerUpType={gameState.powerUpAlert.type} chefLane={gameState.powerUpAlert.chefLane} />
              )}

              {gameState.cleanKitchenBonusAlert && !gameState.paused && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
                  <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-3 rounded-xl shadow-2xl border-4 border-yellow-400 animate-bounce">
                    <div className="text-2xl sm:text-3xl font-bold text-center drop-shadow-lg">
                      ✨ Clean Kitchen Bonus! ✨
                    </div>
                  </div>
                </div>
              )}

              {!gameState.gameOver && !gameState.paused && !gameState.showStore && <StreakDisplay stats={gameState.stats} />}

              {showControlsOverlay && <ControlsOverlay onClose={handleCloseControlsOverlay} />}

              {!gameState.gameOver && !showControlsOverlay && (
                <PauseMenu
                  isVisible={showPauseMenu}
                  isMuted={isMuted}
                  onResume={handlePauseResume}
                  onReset={handlePauseReset}
                  onToggleMute={handlePauseToggleMute}
                  onShowScores={handlePauseShowScores}
                  onShowHelp={handlePauseShowHelp}
                />
              )}

              {gameState.showStore && (
                <div className="absolute inset-0 bg-black bg-opacity-75 flex items-start justify-center rounded-lg z-[60] pt-2">
                  <ItemStore
                    gameState={gameState}
                    onUpgradeOven={upgradeOven}
                    onUpgradeOvenSpeed={upgradeOvenSpeed}
                    onBribeReviewer={bribeReviewer}
                    onBuyPowerUp={buyPowerUp}
                    onHireWorker={hireWorker}
                    onClose={closeStore}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Mobile controls on sides */}
          {!gameState.gameOver && !showHighScores && !gameState.showStore && (
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
              isLandscape={true}
            />
          )}

          {gameState.gameOver && showGameOver && (
            <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
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

          {showHighScores && !gameState.gameOver && (
            <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
              <div className="flex flex-col items-center gap-4 p-4 max-h-[90vh] overflow-y-auto">
                <HighScores />
                <button
                  onClick={() => { setShowHighScores(false); setShowPauseMenu(true); }}
                  className="px-6 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-semibold ring-2 ring-white ring-opacity-80"
                >
                  Back
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
            <ScoreBoard gameState={gameState} onPauseClick={handlePauseToggle} />
          </div>

          <div
            ref={gameBoardRef}
            className={`relative w-full ${isMobile ? '' : 'max-w-6xl'} aspect-[5/3] z-30`}
          >
            <GameBoard gameState={gameState} onLevelCompleteClick={openLevelStore} />

            {gameState.powerUpAlert && !gameState.paused && (
              <PowerUpAlert powerUpType={gameState.powerUpAlert.type} chefLane={gameState.powerUpAlert.chefLane} />
            )}

            {gameState.cleanKitchenBonusAlert && !gameState.paused && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
                <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-3 rounded-xl shadow-2xl border-4 border-yellow-400 animate-bounce">
                  <div className="text-2xl sm:text-3xl font-bold text-center drop-shadow-lg">
                    ✨ Clean Kitchen Bonus! ✨
                  </div>
                </div>
              </div>
            )}

            {!gameState.gameOver && !gameState.paused && !gameState.showStore && <StreakDisplay stats={gameState.stats} />}

            {showControlsOverlay && <ControlsOverlay onClose={handleCloseControlsOverlay} />}

            {!gameState.gameOver && !showControlsOverlay && (
              <PauseMenu
                isVisible={showPauseMenu}
                isMuted={isMuted}
                onResume={handlePauseResume}
                onReset={handlePauseReset}
                onToggleMute={handlePauseToggleMute}
                onShowScores={handlePauseShowScores}
                onShowHelp={handlePauseShowHelp}
              />
            )}

            {gameState.showStore && (
              <div className="absolute inset-0 bg-black bg-opacity-75 flex items-start justify-center rounded-lg z-[60] pt-2">
                <ItemStore
                  gameState={gameState}
                  onUpgradeOven={upgradeOven}
                  onUpgradeOvenSpeed={upgradeOvenSpeed}
                  onBribeReviewer={bribeReviewer}
                  onBuyPowerUp={buyPowerUp}
                  onHireWorker={hireWorker}
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

        {showHighScores && !gameState.gameOver && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="flex flex-col items-center gap-4 p-4 max-h-[90vh] overflow-y-auto">
              <HighScores />
              <button
                onClick={() => { setShowHighScores(false); setShowPauseMenu(true); }}
                className="px-6 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-semibold ring-2 ring-white ring-opacity-80"
              >
                Back
              </button>
            </div>
          </div>
        )}

        {isMobile && !gameState.gameOver && !showHighScores && !gameState.showStore && (
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

        {/* GitHub + Google Sheets links - desktop only, light brown */}
        {!isMobile && (
          <div className="fixed bottom-4 right-4 flex items-center gap-3 z-50">
            <a
              href="https://docs.google.com/spreadsheets/d/1J3-Usmmfd2B_av_BVvC9m70cRdpLvmGv5Wm2d6m_Y_w/edit?gid=0#gid=0"
              target="_blank"
              rel="noopener noreferrer"
            >
              <img
                src="https://cdn.simpleicons.org/googlesheets/A67B5B"
                alt="Google Sheets"
                className="w-8 h-8 opacity-80 hover:opacity-100 transition-opacity"
              />
            </a>
            <a
              href="https://github.com/snackman/pizza-chef"
              target="_blank"
              rel="noopener noreferrer"
            >
              <img
                src="https://cdn.simpleicons.org/github/A67B5B"
                alt="GitHub"
                className="w-8 h-8 opacity-80 hover:opacity-100 transition-opacity"
              />
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
