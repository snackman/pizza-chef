import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Send, Trophy, Download, Share2, Check, Copy as CopyIcon, ArrowLeft, RotateCcw } from 'lucide-react';
import { submitScore, createGameSession, GameSession, uploadScorecardImage, updateGameSessionImage } from '../services/highScores';
import { GameStats, StarLostReason } from '../types/game';
import HighScores from './HighScores';

interface GameOverScreenProps {
  stats: GameStats;
  score: number;
  level: number;
  lastStarLostReason?: StarLostReason;
  onSubmitted: (session: GameSession, playerName: string) => void;
  onPlayAgain: () => void;
}

function getStarLostMessage(reason?: StarLostReason): string {
  switch (reason) {
    case 'burned_pizza':
      return 'Your pizza burned in the oven!';
    case 'disappointed_customer':
      return 'A hungry customer left disappointed!';
    case 'disappointed_critic':
      return 'A food critic stormed off angry!';
    case 'woozy_customer_reached':
      return 'A tipsy customer stumbled to the counter!';
    case 'woozy_critic_reached':
      return 'A tipsy critic demanded a refund!';
    case 'beer_vomit':
      return 'Too much beer made a customer sick!';
    case 'beer_critic_vomit':
      return 'A critic had one too many beers!';
    case 'brian_hurled':
      return 'Bad Luck Brian couldn\'t handle the beer!';
    default:
      return 'You ran out of stars!';
  }
}

interface LoadedImages {
  splashLogo: HTMLImageElement | null;
  pizzaDAOLogo: HTMLImageElement | null;
  droolface: HTMLImageElement | null;
  plate: HTMLImageElement | null;
  pizza: HTMLImageElement | null;
  honey: HTMLImageElement | null;
  iceCream: HTMLImageElement | null;
  beer: HTMLImageElement | null;
  doge: HTMLImageElement | null;
  nyancat: HTMLImageElement | null;
  star: HTMLImageElement | null;
  moltobenny: HTMLImageElement | null;
}

const DEFAULT_NAME = 'Pizza Trainee';

function calculateSkillRating(stats: GameStats, score: number, level: number): { grade: string; stars: number; description: string } {
  let points = 0;
  points += score / 1000;
  points += Math.min(level * 0.1, 1);
  points += Math.min(stats.longestCustomerStreak * 0.05, 1);
  points += Math.min(stats.largestPlateStreak * 0.05, 0.5);
  const efficiency = stats.slicesBaked > 0 ? (stats.customersServed / stats.slicesBaked) * 100 : 0;
  points += Math.min(efficiency / 100, 1);
  const totalPowerUps = Object.values(stats.powerUpsUsed).reduce((a, b) => a + b, 0);
  points += Math.min(totalPowerUps * 0.05, 0.5);

  if (points >= 70) return { grade: 'S+', stars: 5, description: 'Legendary Pizzaiolo' };
  if (points >= 44) return { grade: 'S', stars: 5, description: 'Master Pizzaiolo' };
  if (points >= 27) return { grade: 'A', stars: 4, description: 'Pizzaiolo' };
  if (points >= 12) return { grade: 'B', stars: 3, description: 'Line Cook' };
  if (points >= 6) return { grade: 'C', stars: 2, description: 'Prep Cook' };
  if (points >= 3) return { grade: 'D', stars: 1, description: 'Busser' };
  return { grade: 'F', stars: 0, description: 'Dishwasher' };
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export default function GameOverScreen({ stats, score, level, lastStarLostReason, onSubmitted, onPlayAgain }: GameOverScreenProps) {
  const [playerName, setPlayerName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Separate success states so download doesn't toggle copy UI
  const [copySuccess, setCopySuccess] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [scoreSubmitted, setScoreSubmitted] = useState(false);
  const [submittedName, setSubmittedName] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imagesRef = useRef<LoadedImages>({
    splashLogo: null,
    pizzaDAOLogo: null,
    droolface: null,
    plate: null,
    pizza: null,
    honey: null,
    iceCream: null,
    beer: null,
    doge: null,
    nyancat: null,
    star: null,
    moltobenny: null,
  });

  const displayName = playerName.trim() || DEFAULT_NAME;
  const skillRating = calculateSkillRating(stats, score, level);
  const gameId = useMemo(() => crypto.randomUUID(), []);
  const timestamp = new Date();
  const formattedDate = timestamp.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const formattedTime = timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  useEffect(() => {
    async function loadAllImages() {
      const [
        splashLogo,
        pizzaDAOLogo,
        droolface,
        plate,
        pizza,
        honey,
        iceCream,
        beer,
        doge,
        nyancat,
        star,
        moltobenny,
      ] = await Promise.all([
        loadImage('https://i.imgur.com/EPCSa79.png'),
        loadImage('/PizzaDAO-Logo-White (2).png'),
        loadImage('/Sprites/droolface.png'),
        loadImage('/Sprites/paperplate.png'),
        loadImage('/Sprites/fullpizza.png'),
        loadImage('/Sprites/hothoney.png'),
        loadImage('/Sprites/sundae.png'),
        loadImage('/Sprites/beer.png'),
        loadImage('/Sprites/doge.png'),
        loadImage('/Sprites/nyancat.png'),
        loadImage('https://i.imgur.com/hw0jkrq.png'),
        loadImage('https://i.imgur.com/5goVcAS.png'),
      ]);

      imagesRef.current = {
        splashLogo,
        pizzaDAOLogo,
        droolface,
        plate,
        pizza,
        honey,
        iceCream,
        beer,
        doge,
        nyancat,
        star,
        moltobenny,
      };
      setImagesLoaded(true);
    }
    loadAllImages();
  }, []);

  const generateImage = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const images = imagesRef.current;
    const size = 1200;
    const scale = 2;
    canvas.width = size;
    canvas.height = size;

    ctx.fillStyle = '#dc2626';
    ctx.fillRect(0, 0, size, size);

    if (images.splashLogo) {
      const logoWidth = 75 * scale;
      const logoHeight = (images.splashLogo.height / images.splashLogo.width) * logoWidth;
      ctx.drawImage(images.splashLogo, 20 * scale, 14 * scale, logoWidth, logoHeight);
    }

    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${33 * scale}px system-ui, -apple-system, sans-serif`;
    ctx.textAlign = 'left';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 4 * scale;
    ctx.shadowOffsetY = 2 * scale;
    ctx.fillText('Pizza Chef', 104 * scale, 60 * scale);
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    if (images.pizzaDAOLogo) {
      const daoLogoWidth = 120 * scale;
      const daoLogoHeight = (images.pizzaDAOLogo.height / images.pizzaDAOLogo.width) * daoLogoWidth;
      ctx.drawImage(images.pizzaDAOLogo, 104 * scale, 70 * scale, daoLogoWidth, daoLogoHeight);
    }

    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${18 * scale}px system-ui, -apple-system, sans-serif`;
    ctx.textAlign = 'right';
    ctx.fillText(displayName.toUpperCase(), size - 24 * scale, 40 * scale);

    ctx.fillStyle = '#fbbf24';
    ctx.font = `bold ${44 * scale}px system-ui, -apple-system, sans-serif`;
    ctx.textAlign = 'right';
    ctx.fillText(score.toLocaleString(), size - 24 * scale, 85 * scale);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.beginPath();
    ctx.roundRect(24 * scale, 115 * scale, size - 48 * scale, 50 * scale, 10 * scale);
    ctx.fill();

    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.font = `bold ${18 * scale}px system-ui, -apple-system, sans-serif`;
    ctx.fillText(`Level ${level}`, size / 2, 139 * scale);

    const gradeColors: Record<string, string> = {
      'S+': '#fbbf24',
      'S': '#f59e0b',
      'A': '#22c55e',
      'B': '#60a5fa',
      'C': '#a78bfa',
      'D': '#fb923c',
      'F': '#f87171'
    };

    ctx.fillStyle = gradeColors[skillRating.grade] || '#fbbf24';
    ctx.font = `bold ${20 * scale}px system-ui, -apple-system, sans-serif`;
    ctx.fillText(skillRating.description, size / 2, 159 * scale);

    const deathMessage = getStarLostMessage(lastStarLostReason);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.roundRect(24 * scale, 173 * scale, size - 48 * scale, 50 * scale, 12 * scale);
    ctx.fill();

    const deathBoxCenterY = (173 + 25) * scale;
    const deathTextSize = 17 * scale;
    const deathEmojiSize = Math.round(17 * 1.5) * scale;

    ctx.font = `${deathEmojiSize}px system-ui, -apple-system, sans-serif`;
    ctx.textAlign = 'center';
    const deathEmoji = '\u{1FAA6}';
    const emojiWidth = ctx.measureText(deathEmoji).width;

    ctx.font = `${deathTextSize}px system-ui, -apple-system, sans-serif`;
    const textWidth = ctx.measureText(` ${deathMessage}`).width;
    const totalDeathWidth = emojiWidth + textWidth;
    const deathStartX = (size - totalDeathWidth) / 2;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.font = `${deathEmojiSize}px system-ui, -apple-system, sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText(deathEmoji, deathStartX, deathBoxCenterY + deathEmojiSize / 3);

    ctx.font = `${deathTextSize}px system-ui, -apple-system, sans-serif`;
    ctx.fillText(` ${deathMessage}`, deathStartX + emojiWidth, deathBoxCenterY + deathTextSize / 3);

    const awards: string[] = [];
    if (stats.longestCustomerStreak >= 10) awards.push('Streak Master');
    if (stats.customersServed >= 50) awards.push('Crowd Pleaser');
    if (stats.largestPlateStreak >= 5) awards.push('Plate Juggler');
    if (level >= 10) awards.push('Pizza Veteran');
    if (stats.ovenUpgradesMade >= 5) awards.push('Upgrade King');
    const totalPowerUps = Object.values(stats.powerUpsUsed).reduce((a, b) => a + b, 0);
    if (totalPowerUps >= 10) awards.push('Power Collector');

    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.roundRect(24 * scale, 233 * scale, size - 48 * scale, 58 * scale, 12 * scale);
    ctx.fill();

    const awardsBoxCenterY = (233 + 29) * scale;
    const awardsTextSize = 15 * scale;
    const awardsEmojiSize = Math.round(15 * 1.5) * scale;

    const awardsEmoji = '\u{1F3C6}';
    const awardsText = awards.length > 0 ? awards.slice(0, 3).join('  \u{2022}  ') : 'No awards this time!';

    ctx.font = `${awardsEmojiSize}px system-ui, -apple-system, sans-serif`;
    const awardsEmojiWidth = ctx.measureText(awardsEmoji).width;

    ctx.font = `${awards.length > 0 ? 'bold' : 'italic'} ${awardsTextSize}px system-ui, -apple-system, sans-serif`;
    const awardsTextWidth = ctx.measureText(` ${awardsText}`).width;
    const totalAwardsWidth = awardsEmojiWidth + awardsTextWidth;
    const awardsStartX = (size - totalAwardsWidth) / 2;

    ctx.fillStyle = awards.length > 0 ? '#fbbf24' : 'rgba(255, 255, 255, 0.7)';
    ctx.font = `${awardsEmojiSize}px system-ui, -apple-system, sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText(awardsEmoji, awardsStartX, awardsBoxCenterY + awardsEmojiSize / 3);

    ctx.font = `${awards.length > 0 ? 'bold' : 'italic'} ${awardsTextSize}px system-ui, -apple-system, sans-serif`;
    ctx.fillStyle = awards.length > 0 ? '#fbbf24' : 'rgba(255, 255, 255, 0.7)';
    ctx.fillText(` ${awardsText}`, awardsStartX + awardsEmojiWidth, awardsBoxCenterY + awardsTextSize / 3);

    // --- STATISTICS ---
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.roundRect(24 * scale, 301 * scale, size - 48 * scale, 145 * scale, 12 * scale);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${15 * scale}px system-ui, -apple-system, sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText('STATISTICS', 40 * scale, 324 * scale);

    const iconSize = 32 * scale;
    const statsData = [
      { emoji: '\u{1F355}', label: 'Slices Heated', value: stats.slicesBaked },
      { img: images.droolface, label: 'Served', value: stats.customersServed },
      { img: images.plate, label: 'Plates Caught', value: stats.platesCaught },
      { emoji: '\u{2B06}\u{FE0F}', label: 'Upgrades', value: stats.ovenUpgradesMade },
      { emoji: '\u{1F525}', label: 'Served Streak', value: stats.longestCustomerStreak },
      { emoji: '\u{1F4AB}', label: 'Plate Streak', value: stats.largestPlateStreak },
    ];

    statsData.forEach((stat, index) => {
      const col = index % 3;
      const row = Math.floor(index / 3);
      const colWidth = (size - 48 * scale) / 3;
      const x = 40 * scale + col * colWidth;
      const y = 338 * scale + row * 62 * scale;

      if ('img' in stat && stat.img) {
        ctx.drawImage(stat.img, x, y, iconSize, iconSize);
      } else if ('emoji' in stat) {
        ctx.fillStyle = '#ffffff';
        ctx.font = `${24 * scale}px system-ui, -apple-system, sans-serif`;
        ctx.textAlign = 'left';
        ctx.fillText(stat.emoji, x + 2 * scale, y + 24 * scale);
      }

      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.font = `${13 * scale}px system-ui, -apple-system, sans-serif`;
      ctx.textAlign = 'left';
      ctx.fillText(stat.label, x + iconSize + 8 * scale, y + 12 * scale);

      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${24 * scale}px system-ui, -apple-system, sans-serif`;
      ctx.fillText(stat.value.toString(), x + iconSize + 8 * scale, y + 34 * scale);
    });

    // --- POWER-UPS COLLECTED ---
    // Make spacing between STATISTICS and POWER-UPS match other section gaps (~10 * scale).
    // Stats box ends at (301 + 145) * scale = 446 * scale, so start power-ups at 446 + 10 = 456 * scale.
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();

    const powerUpsBoxExtraBottomPadding = 16 * scale;
    const powerUpsBoxY = 456 * scale; // was 476 * scale

    ctx.roundRect(
      24 * scale,
      powerUpsBoxY,
      size - 48 * scale,
      (98 * scale) + powerUpsBoxExtraBottomPadding,
      12 * scale
    );

    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${15 * scale}px system-ui, -apple-system, sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText('POWER-UPS COLLECTED', 40 * scale, powerUpsBoxY + 23 * scale); // was 499 * scale

    const powerUpIcons = [
      { img: images.honey, count: stats.powerUpsUsed.honey },
      { img: images.iceCream, count: stats.powerUpsUsed['ice-cream'] },
      { img: images.beer, count: stats.powerUpsUsed.beer },
      { img: images.star, count: stats.powerUpsUsed.star },
      { img: images.doge, count: stats.powerUpsUsed.doge },
      { img: images.nyancat, count: stats.powerUpsUsed.nyan },
      { img: images.moltobenny, count: stats.powerUpsUsed.moltobenny },
    ];

    const powerUpSize = 40 * scale;
    const powerUpSpacing = 14 * scale;
    const totalPowerUpWidth = powerUpIcons.length * powerUpSize + (powerUpIcons.length - 1) * powerUpSpacing;
    const powerUpStartX = (size - totalPowerUpWidth) / 2;

    powerUpIcons.forEach((powerUp, index) => {
      const x = powerUpStartX + index * (powerUpSize + powerUpSpacing);
      const y = powerUpsBoxY + 37 * scale; // was 513 * scale

      if (powerUp.img) {
        ctx.drawImage(powerUp.img, x, y, powerUpSize, powerUpSize);
      }

      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${16 * scale}px system-ui, -apple-system, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(powerUp.count.toString(), x + powerUpSize / 2, y + powerUpSize + 16 * scale);
    });

    const footerY = size - 12 * scale;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = `${13 * scale}px system-ui, -apple-system, sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText(`${formattedDate} at ${formattedTime}`, 24 * scale, footerY);

    ctx.textAlign = 'right';
    ctx.fillText(`#${gameId.slice(0, 8)}`, size - 24 * scale, footerY);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.font = `bold ${15 * scale}px system-ui, -apple-system, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('pizzachef.bolt.host', size / 2, footerY);
  }, [stats, score, level, displayName, skillRating, gameId, formattedDate, formattedTime, lastStarLostReason]);

  useEffect(() => {
    if (imagesLoaded) {
      generateImage();
    }
  }, [imagesLoaded, generateImage]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const nameToSubmit = playerName.trim() || DEFAULT_NAME;

    if (nameToSubmit.length > 50) {
      setError('Name must be 50 characters or less');
      return;
    }

    setSubmitting(true);
    setError('');

    const session = await createGameSession(nameToSubmit, score, level, stats);

    if (session) {
      const canvas = canvasRef.current;
      if (canvas) {
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
        if (blob) {
          const imageUrl = await uploadScorecardImage(session.id, blob);
          if (imageUrl) {
            await updateGameSessionImage(session.id, imageUrl);
            session.scorecard_image_url = imageUrl;
          }
        }
      }
    }

    const scoreSuccess = await submitScore(nameToSubmit, score, session?.id);

    if (scoreSuccess && session) {
      setSubmittedName(nameToSubmit);
      setScoreSubmitted(true);
      setShowLeaderboard(true);
      setSubmitting(false);
      onSubmitted(session, nameToSubmit);
    } else if (scoreSuccess) {
      const fallbackSession: GameSession = {
        id: crypto.randomUUID(),
        player_name: nameToSubmit,
        score,
        level,
        slices_baked: stats.slicesBaked,
        customers_served: stats.customersServed,
        longest_streak: stats.longestCustomerStreak,
        plates_caught: stats.platesCaught,
        largest_plate_streak: stats.largestPlateStreak,
        oven_upgrades: stats.ovenUpgradesMade,
        power_ups_used: stats.powerUpsUsed,
        created_at: new Date().toISOString()
      };
      setSubmittedName(nameToSubmit);
      setScoreSubmitted(true);
      setShowLeaderboard(true);
      setSubmitting(false);
      onSubmitted(fallbackSession, nameToSubmit);
    } else {
      setError('Failed to submit score. Please try again.');
      setSubmitting(false);
    }
  };

  const copyImageToClipboard = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (blob) {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ]);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      }
    } catch {
      downloadImage();
    }
  };

  const downloadImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = `pizza-chef-score-${gameId.slice(0, 8)}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();

    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 2000);
  };

  const handleNativeShare = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !navigator.share) return;

    try {
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (blob) {
        const file = new File([blob], `pizza-chef-score-${gameId.slice(0, 8)}.png`, { type: 'image/png' });
        await navigator.share({
          title: 'Pizza Chef Score Card',
          text: `I scored ${score.toLocaleString()} points in Pizza Chef! Level ${level} - ${skillRating.description}`,
          files: [file],
        });
      }
    } catch {
      copyImageToClipboard();
    }
  };

  if (showLeaderboard) {
    const displayNameForScore = scoreSubmitted ? submittedName : (playerName.trim() || DEFAULT_NAME);

    return (
      <div className="flex flex-col items-center gap-4 w-full max-w-4xl mx-auto">
        <HighScores userScore={{ name: displayNameForScore, score }} />

        {scoreSubmitted ? (
          <div className="flex gap-3 w-full">
            <button
              onClick={() => setShowLeaderboard(false)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-semibold"
            >
              <ArrowLeft className="w-5 h-5" />
              Back
            </button>
            <button
              onClick={onPlayAgain}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold"
            >
              <RotateCcw className="w-5 h-5" />
              Play Again
            </button>
          </div>
        ) : (
          <div className="w-full space-y-3">
            <div className="bg-white rounded-lg shadow-lg p-4">
              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label htmlFor="leaderboardPlayerName" className="block text-sm font-medium text-gray-700 mb-1">
                    Enter your name for the leaderboard:
                  </label>
                  <input
                    type="text"
                    id="leaderboardPlayerName"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    placeholder={DEFAULT_NAME}
                    maxLength={50}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-amber-500 focus:outline-none transition-colors text-base"
                    disabled={submitting}
                  />
                  {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg hover:from-amber-600 hover:to-orange-600 transition-all font-semibold disabled:opacity-50"
                >
                  {submitting ? '...' : (
                    <>
                      <Send className="w-5 h-5" />
                      Submit Score
                    </>
                  )}
                </button>
              </form>
            </div>

            <div className="flex gap-3 w-full">
              <button
                onClick={() => setShowLeaderboard(false)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-semibold"
              >
                <ArrowLeft className="w-5 h-5" />
                Back
              </button>
              <button
                onClick={onPlayAgain}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold"
              >
                <RotateCcw className="w-5 h-5" />
                Play Again
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-2xl p-3 sm:p-6 w-full max-w-lg mx-auto max-h-[95vh] overflow-y-auto">
      {/* SCORECARD + OVERLAY ICONS */}
      <div className="relative flex justify-center mb-3 bg-red-700 rounded-lg p-2 overflow-hidden aspect-square">
        <canvas
          ref={canvasRef}
          className="w-full h-full rounded object-contain"
        />

        <div className="absolute bottom-7 right-3 z-10 flex flex-col gap-2">
          <button
            type="button"
            onClick={copyImageToClipboard}
            className="w-10 h-10 rounded-lg bg-black/50 hover:bg-black/60 backdrop-blur flex items-center justify-center text-white transition-colors"
            aria-label="Copy scorecard image"
            title={copySuccess ? 'Copied!' : 'Copy image'}
          >
            {copySuccess ? (
              <Check className="w-5 h-5" />
            ) : (
              <CopyIcon className="w-5 h-5" />
            )}
          </button>

          <button
            type="button"
            onClick={downloadImage}
            className="w-10 h-10 rounded-lg bg-black/50 hover:bg-black/60 backdrop-blur flex items-center justify-center text-white transition-colors"
            aria-label="Download scorecard image"
            title={downloadSuccess ? 'Downloaded!' : 'Download'}
          >
            {downloadSuccess ? (
              <Check className="w-5 h-5" />
            ) : (
              <Download className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {!scoreSubmitted && (
          <>
            <div>
              <label htmlFor="playerName" className="block text-sm font-medium text-gray-700 mb-1">
                Enter your name for the leaderboard:
              </label>
              <input
                type="text"
                id="playerName"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder={DEFAULT_NAME}
                maxLength={50}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-amber-500 focus:outline-none transition-colors text-base"
                disabled={submitting}
              />
              {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg hover:from-amber-600 hover:to-orange-600 transition-all font-semibold disabled:opacity-50"
              >
                {submitting ? '...' : (
                  <>
                    <Send className="w-5 h-5" />
                    Submit Score
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setShowLeaderboard(true)}
                disabled={submitting}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-semibold disabled:opacity-50"
              >
                <Trophy className="w-5 h-5" />
                Leaderboard
              </button>
            </div>
          </>
        )}

        {scoreSubmitted && (
          <button
            type="button"
            onClick={() => setShowLeaderboard(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-semibold"
          >
            <Trophy className="w-5 h-5" />
            Leaderboard
          </button>
        )}

        <button
          type="button"
          onClick={onPlayAgain}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold"
        >
          <RotateCcw className="w-5 h-5" />
          Play Again
        </button>

        {'share' in navigator && (
          <button
            type="button"
            onClick={handleNativeShare}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all font-semibold text-sm"
          >
            <Share2 className="w-4 h-4" />
            Share Score Card
          </button>
        )}
      </form>
    </div>
  );
}
