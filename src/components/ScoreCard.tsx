import { useRef, useState, useEffect, useCallback } from 'react';
import { Copy, Download, Share2, Check, Image as ImageIcon } from 'lucide-react';
import { GameStats as GameStatsType } from '../types/game';

interface ScoreCardProps {
  stats: GameStatsType;
  score: number;
  level: number;
  playerName: string;
  gameId: string;
  timestamp: Date;
  onClose?: () => void;
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

function calculateSkillRating(stats: GameStatsType, score: number, level: number): { grade: string; stars: number; description: string } {
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

function getAchievements(stats: GameStatsType, score: number, level: number): string[] {
  const achievements: string[] = [];

  if (score >= 10000) achievements.push('10K Club');
  else if (score >= 5000) achievements.push('5K Club');
  else if (score >= 1000) achievements.push('1K Club');

  if (level >= 20) achievements.push('Level 20+');
  else if (level >= 10) achievements.push('Level 10+');
  else if (level >= 5) achievements.push('Level 5+');

  if (stats.longestCustomerStreak >= 20) achievements.push('Streak Master');
  else if (stats.longestCustomerStreak >= 10) achievements.push('Hot Streak');

  if (stats.customersServed >= 100) achievements.push('Century Server');
  else if (stats.customersServed >= 50) achievements.push('Fifty Fed');

  if (stats.platesCaught >= 50) achievements.push('Plate Catcher');

  const totalPowerUps = Object.values(stats.powerUpsUsed).reduce((a, b) => a + b, 0);
  if (totalPowerUps >= 20) achievements.push('Power User');

  return achievements.slice(0, 4);
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

export default function ScoreCard({ stats, score, level, playerName, gameId, timestamp, onClose }: ScoreCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imageGenerated, setImageGenerated] = useState(false);
  const [copySuccess, setCopySuccess] = useState<'image' | 'text' | 'link' | null>(null);
  const [imagesLoaded, setImagesLoaded] = useState(false);
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

  const skillRating = calculateSkillRating(stats, score, level);
  const achievements = getAchievements(stats, score, level);
  const shareUrl = `${window.location.origin}?scores=true&highlight=${gameId}`;
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
    ctx.fillText(playerName.toUpperCase(), width / 2, 250);

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

    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = '14px system-ui, -apple-system, sans-serif';
    ctx.fillText(`Game: ${gameId.slice(0, 8)}`, width / 2, 925);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.font = 'bold 16px system-ui, -apple-system, sans-serif';
    ctx.fillText('pizzadao.xyz', width / 2, 955);

    setImageGenerated(true);
  }, [stats, score, level, playerName, gameId, skillRating, formattedDate, formattedTime]);

  useEffect(() => {
    if (imagesLoaded) {
      generateImage();
    }
  }, [imagesLoaded, generateImage]);

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
    link.download = `pizza-chef-score-${gameId.slice(0, 8)}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    setCopySuccess('image');
    setTimeout(() => setCopySuccess(null), 2000);
  };

  const copyTextSummary = async () => {
    const text = `Pizza Chef Score Card
Player: ${playerName}
Score: ${score.toLocaleString()} | Level: ${level}
Ranking: ${skillRating.description}
Customers: ${stats.customersServed} | Plates: ${stats.platesCaught} | Streak: ${stats.longestCustomerStreak}
${achievements.length > 0 ? `Achievements: ${achievements.join(', ')}` : ''}
Play at: ${shareUrl}`;

    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess('text');
      setTimeout(() => setCopySuccess(null), 2000);
    } catch {
      console.error('Failed to copy text');
    }
  };

  const copyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopySuccess('link');
      setTimeout(() => setCopySuccess(null), 2000);
    } catch {
      console.error('Failed to copy link');
    }
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
          url: shareUrl
        });
      }
    } catch {
      copyTextSummary();
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-2xl p-4 sm:p-6 w-full max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Your Score Card</h2>
      </div>

      <div className="flex justify-center mb-4 bg-red-700 rounded-lg p-2 overflow-hidden">
        <canvas
          ref={canvasRef}
          className="max-w-full h-auto rounded"
          style={{ maxHeight: '520px', width: 'auto' }}
        />
      </div>

      {imageGenerated && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={copyImageToClipboard}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg hover:from-amber-600 hover:to-orange-600 transition-all font-semibold text-sm"
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
              onClick={downloadImage}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-colors font-semibold text-sm"
            >
              <Download className="w-4 h-4" />
              Download
            </button>
          </div>

          {'share' in navigator && (
            <button
              onClick={handleNativeShare}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all font-semibold"
            >
              <Share2 className="w-5 h-5" />
              Share Score Card
            </button>
          )}

          {onClose && (
            <button
              onClick={onClose}
              className="w-full mt-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-semibold"
            >
              Continue to Leaderboard
            </button>
          )}
        </div>
      )}
    </div>
  );
}
