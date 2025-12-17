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

function calculateSkillRating(stats: GameStatsType, score: number, level: number): { grade: string; stars: number; description: string } {
  let points = 0;

  points += Math.min(score / 100, 50);
  points += Math.min(level * 2, 20);
  points += Math.min(stats.longestCustomerStreak * 2, 20);
  points += Math.min(stats.largestPlateStreak, 10);

  const efficiency = stats.slicesBaked > 0 ? (stats.customersServed / stats.slicesBaked) * 100 : 0;
  points += Math.min(efficiency / 10, 10);

  const totalPowerUps = Object.values(stats.powerUpsUsed).reduce((a, b) => a + b, 0);
  points += Math.min(totalPowerUps, 10);

  if (points >= 100) return { grade: 'S+', stars: 5, description: 'Legendary Pizzaiolo' };
  if (points >= 85) return { grade: 'S', stars: 5, description: 'Master Chef' };
  if (points >= 70) return { grade: 'A', stars: 4, description: 'Expert' };
  if (points >= 55) return { grade: 'B', stars: 3, description: 'Skilled' };
  if (points >= 40) return { grade: 'C', stars: 2, description: 'Apprentice' };
  if (points >= 25) return { grade: 'D', stars: 1, description: 'Novice' };
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

export default function ScoreCard({ stats, score, level, playerName, gameId, timestamp, onClose }: ScoreCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imageGenerated, setImageGenerated] = useState(false);
  const [copySuccess, setCopySuccess] = useState<'image' | 'text' | 'link' | null>(null);
  const [logoLoaded, setLogoLoaded] = useState(false);
  const logoRef = useRef<HTMLImageElement | null>(null);

  const skillRating = calculateSkillRating(stats, score, level);
  const achievements = getAchievements(stats, score, level);
  const shareUrl = `${window.location.origin}?scores=true&highlight=${gameId}`;
  const formattedDate = timestamp.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const formattedTime = timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  useEffect(() => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      logoRef.current = img;
      setLogoLoaded(true);
    };
    img.onerror = () => {
      setLogoLoaded(true);
    };
    img.src = '/PizzaDAO-Logo-White (2).png';
  }, []);

  const generateImage = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = 600;
    const height = 800;
    canvas.width = width;
    canvas.height = height;

    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(0.5, '#16213e');
    gradient.addColorStop(1, '#0f0f23');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    const accentGradient = ctx.createLinearGradient(0, 0, width, 0);
    accentGradient.addColorStop(0, '#f59e0b');
    accentGradient.addColorStop(1, '#ef4444');
    ctx.fillStyle = accentGradient;
    ctx.fillRect(0, 0, width, 8);

    if (logoRef.current) {
      const logoSize = 80;
      ctx.drawImage(logoRef.current, (width - logoSize) / 2, 30, logoSize, logoSize);
    }

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PIZZA CHEF', width / 2, 140);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '16px system-ui, -apple-system, sans-serif';
    ctx.fillText('SCORE CARD', width / 2, 165);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 24px system-ui, -apple-system, sans-serif';
    ctx.fillText(playerName.toUpperCase(), width / 2, 210);

    const scoreGradient = ctx.createLinearGradient(width / 2 - 100, 240, width / 2 + 100, 310);
    scoreGradient.addColorStop(0, '#fbbf24');
    scoreGradient.addColorStop(1, '#f59e0b');
    ctx.fillStyle = scoreGradient;
    ctx.font = 'bold 72px system-ui, -apple-system, sans-serif';
    ctx.fillText(score.toLocaleString(), width / 2, 290);

    ctx.fillStyle = '#64748b';
    ctx.font = '18px system-ui, -apple-system, sans-serif';
    ctx.fillText(`Level ${level}`, width / 2, 320);

    const gradeColors: Record<string, string> = {
      'S+': '#fbbf24',
      'S': '#f59e0b',
      'A': '#22c55e',
      'B': '#3b82f6',
      'C': '#8b5cf6',
      'D': '#f97316',
      'F': '#ef4444'
    };

    ctx.fillStyle = gradeColors[skillRating.grade] || '#f59e0b';
    ctx.font = 'bold 48px system-ui, -apple-system, sans-serif';
    ctx.fillText(skillRating.grade, width / 2, 380);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '16px system-ui, -apple-system, sans-serif';
    ctx.fillText(skillRating.description, width / 2, 405);

    const starY = 430;
    const starSize = 20;
    const starSpacing = 30;
    const startX = width / 2 - ((5 - 1) * starSpacing) / 2;

    for (let i = 0; i < 5; i++) {
      const x = startX + i * starSpacing;
      ctx.fillStyle = i < skillRating.stars ? '#fbbf24' : '#374151';
      drawStar(ctx, x, starY, starSize / 2, starSize / 4, 5);
    }

    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.fillRect(30, 460, width - 60, 200);

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 14px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('STATISTICS', 50, 490);

    const statsData = [
      { label: 'Slices Baked', value: stats.slicesBaked },
      { label: 'Customers Served', value: stats.customersServed },
      { label: 'Best Streak', value: stats.longestCustomerStreak },
      { label: 'Plates Caught', value: stats.platesCaught },
      { label: 'Plate Streak', value: stats.largestPlateStreak },
      { label: 'Upgrades', value: stats.ovenUpgradesMade },
    ];

    ctx.font = '14px system-ui, -apple-system, sans-serif';
    statsData.forEach((stat, index) => {
      const row = Math.floor(index / 2);
      const col = index % 2;
      const x = col === 0 ? 50 : 320;
      const y = 520 + row * 40;

      ctx.fillStyle = '#94a3b8';
      ctx.textAlign = 'left';
      ctx.fillText(stat.label, x, y);

      ctx.fillStyle = '#e2e8f0';
      ctx.font = 'bold 18px system-ui, -apple-system, sans-serif';
      ctx.fillText(stat.value.toString(), x, y + 20);
      ctx.font = '14px system-ui, -apple-system, sans-serif';
    });

    if (achievements.length > 0) {
      const badgeY = 680;
      const badgeWidth = 120;
      const badgeHeight = 28;
      const badgeSpacing = 10;
      const totalBadgeWidth = achievements.length * badgeWidth + (achievements.length - 1) * badgeSpacing;
      let badgeStartX = (width - totalBadgeWidth) / 2;

      achievements.forEach((achievement, index) => {
        const x = badgeStartX + index * (badgeWidth + badgeSpacing);

        const badgeGradient = ctx.createLinearGradient(x, badgeY, x + badgeWidth, badgeY + badgeHeight);
        badgeGradient.addColorStop(0, 'rgba(245, 158, 11, 0.3)');
        badgeGradient.addColorStop(1, 'rgba(239, 68, 68, 0.3)');
        ctx.fillStyle = badgeGradient;
        ctx.beginPath();
        ctx.roundRect(x, badgeY, badgeWidth, badgeHeight, 14);
        ctx.fill();

        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = '#fbbf24';
        ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(achievement, x + badgeWidth / 2, badgeY + 18);
      });
    }

    ctx.fillStyle = '#475569';
    ctx.font = '12px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${formattedDate} at ${formattedTime}`, width / 2, 740);
    ctx.fillText(`Game ID: ${gameId.slice(0, 8)}`, width / 2, 758);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.fillRect(0, height - 40, width, 40);
    ctx.fillStyle = '#64748b';
    ctx.font = '11px system-ui, -apple-system, sans-serif';
    ctx.fillText('pizzadao.xyz', width / 2, height - 15);

    setImageGenerated(true);
  }, [stats, score, level, playerName, gameId, skillRating, achievements, formattedDate, formattedTime]);

  useEffect(() => {
    if (logoLoaded) {
      generateImage();
    }
  }, [logoLoaded, generateImage]);

  function drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, outerRadius: number, innerRadius: number, points: number) {
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const angle = (Math.PI * i) / points - Math.PI / 2;
      const x = cx + radius * Math.cos(angle);
      const y = cy + radius * Math.sin(angle);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
  }

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
Skill Rating: ${skillRating.grade} - ${skillRating.description}
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
          text: `I scored ${score.toLocaleString()} points in Pizza Chef! Level ${level} - ${skillRating.grade} Rank`,
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

      <div className="flex justify-center mb-4 bg-gray-900 rounded-lg p-2 overflow-hidden">
        <canvas
          ref={canvasRef}
          className="max-w-full h-auto rounded"
          style={{ maxHeight: '400px', width: 'auto' }}
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

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={copyTextSummary}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm"
            >
              {copySuccess === 'text' ? (
                <>
                  <Check className="w-4 h-4 text-green-600" />
                  <span className="text-green-600">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy Text
                </>
              )}
            </button>
            <button
              onClick={copyShareLink}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm"
            >
              {copySuccess === 'link' ? (
                <>
                  <Check className="w-4 h-4 text-green-600" />
                  <span className="text-green-600">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy Link
                </>
              )}
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
