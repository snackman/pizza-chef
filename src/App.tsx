import { useEffect, useState } from 'react';
import GameBoard from './components/GameBoard';
import ScoreBoard from './components/ScoreBoard';
import LandscapeGameBoard from './components/LandscapeGameBoard';
import LandscapeScoreBoard from './components/LandscapeScoreBoard';
import LandscapeControls from './components/LandscapeControls';
import MobileGameControls from './components/MobileGameControls';
import InstructionsModal from './components/InstructionsModal';
import SplashScreen from './components/SplashScreen';
import SubmitScore from './components/SubmitScore';
import HighScores from './components/HighScores';
import ItemStore from './components/ItemStore';
import PowerUpAlert from './components/PowerUpAlert';
import GameStats from './components/GameStats';
import StreakDisplay from './components/StreakDisplay';
import { useGameLogic } from './hooks/useGameLogic';
import { Info } from 'lucide-react';

function App() {
  const [showStats, setShowStats] = useState(false);
  const [showScoreSubmit, setShowScoreSubmit] = useState(false);
  const [showHighScores, setShowHighScores] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [gameStarted, setGameStarted] = useState(false);
  const [isLandscape, setIsLandscape] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const { gameState, servePizza, moveChef, useOven, cleanOven, resetGame, togglePause, upgradeOven, upgradeOvenSpeed, closeStore, bribeReviewer, buyPowerUp } = useGameLogic(gameStarted);

  useEffect(() => {
    if (gameState.gameOver && !showStats && !showScoreSubmit && !showHighScores) {
      setShowStats(true);
    }
  }, [gameState.gameOver, showStats, showScoreSubmit, showHighScores]);

  const handleStartGame = () => {
    setShowSplash(false);
    setGameStarted(true);
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

  useEffect(() => {
    if (showInstructions && !gameState.paused && gameStarted && !gameState.gameOver) {
      togglePause();
    }
  }, [showInstructions, gameStarted]);

  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (!gameStarted || showInstructions) return;

      const target = event.target as HTMLElement;
      const isTyping = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';

      if (isTyping) {
        return;
      }

      if (event.key === ' ' || event.key === 'ArrowLeft') {
        event.preventDefault();
        const currentOven = gameState.ovens[gameState.chefLane];
        if (currentOven.burned) {
          cleanOven();
        } else {
          useOven();
        }
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        moveChef('up');
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        moveChef('down');
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        servePizza();
      } else if (event.key === 'p' || event.key === 'P') {
        togglePause();
      } else if (event.key === 'r' || event.key === 'R') {
        resetGame();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [servePizza, moveChef, useOven, cleanOven, togglePause, resetGame, gameState.ovens, gameState.chefLane, gameStarted, showInstructions]);

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

          {!gameState.gameOver && !gameState.paused && !gameState.showStore && (
            <StreakDisplay stats={gameState.stats} />
          )}

          <LandscapeScoreBoard gameState={gameState} onShowInstructions={() => setShowInstructions(true)} />
          <LandscapeControls
            gameOver={gameState.gameOver}
            paused={gameState.paused}
            onMoveUp={() => moveChef('up')}
            onMoveDown={() => moveChef('down')}
            onServePizza={servePizza}
            onUseOven={useOven}
            onCleanOven={cleanOven}
            currentLane={gameState.chefLane}
            availableSlices={gameState.availableSlices}
            ovens={gameState.ovens}
          />

          {gameState.gameOver && (
            <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center z-20">
              <div className="flex flex-col items-center gap-4 p-4 max-h-[90vh] overflow-y-auto">
                {showStats && !showScoreSubmit && !showHighScores ? (
                  <GameStats
                    stats={gameState.stats}
                    score={gameState.score}
                    level={gameState.level}
                    onContinue={() => {
                      setShowStats(false);
                      setShowScoreSubmit(true);
                    }}
                  />
                ) : showScoreSubmit && !showHighScores ? (
                  <SubmitScore
                    score={gameState.score}
                    onSubmitted={() => {
                      setShowScoreSubmit(false);
                      setShowHighScores(true);
                    }}
                    onSkip={() => {
                      setShowScoreSubmit(false);
                      setShowHighScores(true);
                    }}
                  />
                ) : showHighScores ? (
                  <>
                    <HighScores />
                    <button
                      onClick={() => {
                        resetGame();
                        setShowHighScores(false);
                        setShowScoreSubmit(false);
                        setShowStats(false);
                      }}
                      className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold"
                    >
                      Play Again
                    </button>
                  </>
                ) : null}
              </div>
            </div>
          )}

          {gameState.paused && !gameState.gameOver && !gameState.showStore && (
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
            <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center z-30">
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
                setShowScoreSubmit(false);
                setShowHighScores(false);
                setShowStats(false);
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
        <div className="absolute top-2 left-2 right-2 z-30">
          <ScoreBoard gameState={gameState} onShowInstructions={() => setShowInstructions(true)} />
        </div>

        <div className="flex-1 flex items-center justify-center p-2 sm:p-4">
          <div
            className="w-full max-w-6xl aspect-[5/3] sm:relative absolute top-[15%] sm:top-auto"
            onClick={handleGameBoardClick}
          >
            <GameBoard gameState={gameState} />

            {gameState.powerUpAlert && (
              <PowerUpAlert powerUpType={gameState.powerUpAlert.type} chefLane={gameState.powerUpAlert.chefLane} />
            )}

            {!gameState.gameOver && !gameState.paused && !gameState.showStore && (
              <StreakDisplay stats={gameState.stats} />
            )}

            {gameState.gameOver && (
              <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center rounded-lg z-20">
                <div className="flex flex-col items-center gap-4 p-4 max-h-[90vh] overflow-y-auto">
                  {showStats && !showScoreSubmit && !showHighScores ? (
                    <GameStats
                      stats={gameState.stats}
                      score={gameState.score}
                      level={gameState.level}
                      onContinue={() => {
                        setShowStats(false);
                        setShowScoreSubmit(true);
                      }}
                    />
                  ) : showScoreSubmit && !showHighScores ? (
                    <SubmitScore
                      score={gameState.score}
                      onSubmitted={() => {
                        setShowScoreSubmit(false);
                        setShowHighScores(true);
                      }}
                      onSkip={() => {
                        setShowScoreSubmit(false);
                        setShowHighScores(true);
                      }}
                    />
                  ) : showHighScores ? (
                    <>
                      <HighScores />
                      <button
                        onClick={() => {
                          resetGame();
                          setShowHighScores(false);
                          setShowScoreSubmit(false);
                          setShowStats(false);
                        }}
                        className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold"
                      >
                        Play Again
                      </button>
                    </>
                  ) : null}
                </div>
              </div>
            )}

            {gameState.paused && !gameState.gameOver && !gameState.showStore && (
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
              <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center rounded-lg z-30">
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
        </div>

        {showInstructions && (
          <InstructionsModal
            onClose={() => setShowInstructions(false)}
            onReset={() => {
              resetGame();
              setShowScoreSubmit(false);
              setShowHighScores(false);
              setShowStats(false);
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
