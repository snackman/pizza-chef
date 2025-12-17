import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Trophy, Download, Share2, Check, Image as ImageIcon, ArrowLeft, RotateCcw } from 'lucide-react';
import { submitScore, createGameSession, GameSession } from '../services/highScores';
import { GameStats } from '../types/game';
import HighScores from './HighScores';

interface GameOverScreenProps {
  stats: GameStats;
  score: number;
  level: number;
  onSubmitted: (session: GameSession, playerName: string) => void;
  onPlayAgain: () => void;
}

interface LoadedImages {
  splashLogo: HTMLImageElement | null;
  pizzaDAOLogo: HTMLImageElement | null;
  gotchi: HTMLImageElement | null;
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
  if (points >= 44) return { grade: 'S', stars: 5, description: 'Master Chef' };
  if (points >= 27) return { grade: 'A', stars: 4, description: 'Expert' };
  if (points >= 12) return { grade: 'B', stars: 3, description: 'Skilled' };
  if (points >= 6) return { grade: 'C', stars: 2, description: 'Apprentice' };
  if (points >= 3) return { grade: 'D', stars: 1, description: 'Novice' };
  return { grade: 'F', stars: 0, description: 'Beginner' };
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

export default function GameOverScreen({ stats, score, level, onSubmitted, onPlayAgain }: GameOverScreenProps) {
  const [playerName, setPlayerName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [copySuccess, setCopySuccess] = useState<'image' | 'text' | 'link' | null>(null);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imagesRef = useRef<LoadedImages>({
    splashLogo: null,
    pizzaDAOLogo: null,
    gotchi: null,
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
  const timestamp = new Date();
  const formattedDate = timestamp.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const formattedTime = timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  useEffect(() => {
    async function loadAllImages() {
      const [
        splashLogo,
        pizzaDAOLogo,
        gotchi,
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
        loadImage('/Sprites/gotchi.png'),
        loadImage('/Sprites/paperplate.png'),
        loadImage('/Sprites/fullpizza.png'),
        loadImage('/Sprites/hothoney.png'),
        loadImage('/Sprites/sundae.png'),
        loadImage('/Sprites/beer.png'),
        loadImage('/Sprites/doge.png'),
        loadImage('/Sprites/nyancat.png'),
        loadImage('/Sprites/yumface.png'),
        loadImage('https://i.imgur.com/5goVcAS.png'),
      ]);

      imagesRef.current = {
        splashLogo,
        pizzaDAOLogo,
        gotchi,
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
    const width = 600;
    const height = 980;
    canvas.width = width;
    canvas.height = height;

    ctx.fillStyle = '#dc2626';
    ctx.fillRect(0, 0, width, height);

    if (images.splashLogo) {
      const logoWidth = 100;
      const logoHeight = (images.splashLogo.height / images.splashLogo.width) * logoWidth;
      ctx.drawImage(images.splashLogo, (width - logoWidth) / 2, 12, logoWidth, logoHeight);
    }

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 48px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 2;
    ctx.fillText('Pizza Chef', width / 2, 150);
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    if (images.pizzaDAOLogo) {
      const daoLogoWidth = 150;
      const daoLogoHeight = (images.pizzaDAOLogo.height / images.pizzaDAOLogo.width) * daoLogoWidth;
      ctx.drawImage(images.pizzaDAOLogo, (width - daoLogoWidth) / 2, 160, daoLogoWidth, daoLogoHeight);
    }

    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.beginPath();
    ctx.roundRect(30, 210, width - 60, 115, 12);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px system-ui, -apple-system, sans-serif';
    ctx.fillText(displayName.toUpperCase(), width / 2, 250);

    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 56px system-ui, -apple-system, sans-serif';
    ctx.fillText(score.toLocaleString(), width / 2, 305);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.beginPath();
    ctx.roundRect(30, 335, width - 60, 80, 12);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
    ctx.fillText(`Level ${level}`, width / 2, 370);

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
    ctx.font = 'bold 36px system-ui, -apple-system, sans-serif';
    ctx.fillText(skillRating.description, width / 2, 405);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.beginPath();
    ctx.roundRect(30, 425, width - 60, 280, 12);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.font = 'bold 18px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('STATISTICS', 50, 455);

    const iconSize = 40;
    const statsData = [
      { emoji: '\u{1F355}', label: 'Slices Baked', value: stats.slicesBaked },
      { emoji: '\u{2B06}\u{FE0F}', label: 'Oven Upgrades', value: stats.ovenUpgradesMade },
      { img: images.gotchi, label: 'Customers Served', value: stats.customersServed },
      { emoji: '\u{1F525}', label: 'Best Customer Streak', value: stats.longestCustomerStreak },
      { img: images.plate, label: 'Plates Caught', value: stats.platesCaught },
      { emoji: '\u{1F4AB}', label: 'Best Plate Streak', value: stats.largestPlateStreak },
    ];

    statsData.forEach((stat, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const x = col === 0 ? 50 : 310;
      const y = 475 + row * 85;

      if ('img' in stat && stat.img) {
        ctx.drawImage(stat.img, x, y, iconSize, iconSize);
      } else if ('emoji' in stat) {
        ctx.fillStyle = '#ffffff';
        ctx.font = '32px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(stat.emoji, x + 4, y + 30);
      }

      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.font = '16px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(stat.label, x + iconSize + 12, y + 15);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 32px system-ui, -apple-system, sans-serif';
      ctx.fillText(stat.value.toString(), x + iconSize + 12, y + 48);
    });

    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.beginPath();
    ctx.roundRect(30, 715, width - 60, 130, 12);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.font = 'bold 18px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('POWER-UPS COLLECTED', 50, 745);

    const powerUpIcons = [
      { img: images.honey, count: stats.powerUpsUsed.honey },
      { img: images.iceCream, count: stats.powerUpsUsed['ice-cream'] },
      { img: images.beer, count: stats.powerUpsUsed.beer },
      { img: images.doge, count: stats.powerUpsUsed.doge },
      { img: images.nyancat, count: stats.powerUpsUsed.nyan },
      { img: images.moltobenny, count: stats.powerUpsUsed.moltobenny },
    ];

    const powerUpSize = 50;
    const powerUpSpacing = 15;
    const totalPowerUpWidth = powerUpIcons.length * powerUpSize + (powerUpIcons.length - 1) * powerUpSpacing;
    const powerUpStartX = (width - totalPowerUpWidth) / 2;

    powerUpIcons.forEach((powerUp, index) => {
      const x = powerUpStartX + index * (powerUpSize + powerUpSpacing);
      const y = 760;

      if (powerUp.img) {
        ctx.drawImage(powerUp.img, x, y, powerUpSize, powerUpSize);
      }

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(powerUp.count.toString(), x + powerUpSize / 2, y + powerUpSize + 22);
    });

    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = '16px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${formattedDate} at ${formattedTime}`, width / 2, 900);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.font = 'bold 16px system-ui, -apple-system, sans-serif';
    ctx.fillText('pizzadao.xyz', width / 2, 955);
  }, [stats, score, level, displayName, skillRating, formattedDate, formattedTime]);

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

    const [scoreSuccess, session] = await Promise.all([
      submitScore(nameToSubmit, score),
      createGameSession(nameToSubmit, score, level, stats)
    ]);

    if (scoreSuccess && session) {
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
        setCopySuccess('image');
        setTimeout(() => setCopySuccess(null), 2000);
      }
    } catch {
      downloadImage();
    }
  };

  const downloadImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = `pizza-chef-score.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    setCopySuccess('image');
    setTimeout(() => setCopySuccess(null), 2000);
  };

  const handleNativeShare = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !navigator.share) return;

    try {
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (blob) {
        const file = new File([blob], `pizza-chef-score.png`, { type: 'image/png' });
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
    return (
      <div className="flex flex-col items-center gap-4 w-full max-w-lg mx-auto">
        <HighScores />
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
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-2xl p-3 sm:p-6 w-full max-w-lg mx-auto max-h-[95vh] overflow-y-auto">
      <div className="text-center mb-3">
        <h2 className="text-2xl sm:text-3xl font-bold text-red-600">Game Over!</h2>
        <p className="text-lg text-gray-600">
          Score: <span className="font-bold text-amber-600">{score.toLocaleString()}</span>
          <span className="mx-2">|</span>
          Level: <span className="font-bold">{level}</span>
        </p>
      </div>

      <div className="flex justify-center mb-3 bg-red-700 rounded-lg p-2 overflow-hidden">
        <canvas
          ref={canvasRef}
          className="max-w-full h-auto rounded"
          style={{ maxHeight: '400px', width: 'auto' }}
        />
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <button
          type="button"
          onClick={copyImageToClipboard}
          className="flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
        >
          {copySuccess === 'image' ? (
            <>
              <Check className="w-4 h-4" />
              Copied!
            </>
          ) : (
            <>
              <ImageIcon className="w-4 h-4" />
              Copy Image
            </>
          )}
        </button>
        <button
          type="button"
          onClick={downloadImage}
          className="flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
        >
          <Download className="w-4 h-4" />
          Download
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
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
