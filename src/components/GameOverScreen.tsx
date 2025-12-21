import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Send,
  Trophy,
  Download,
  Share2,
  Check,
  Image as ImageIcon,
  ArrowLeft,
  RotateCcw,
} from 'lucide-react';
import {
  submitScore,
  createGameSession,
  GameSession,
  uploadScorecardImage,
  updateGameSessionImage,
} from '../services/highScores';
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
      return "Bad Luck Brian couldn't handle the beer!";
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

function calculateSkillRating(
  stats: GameStats,
  score: number,
  level: number
): { grade: string; stars: number; description: string } {
  let points = 0;
  points += score / 1000;
  points += Math.min(level * 0.1, 1);
  points += Math.min(stats.longestCustomerStreak * 0.05, 1);
  points += Math.min(stats.largestPlateStreak * 0.05, 0.5);
  const efficiency =
    stats.slicesBaked > 0
      ? (stats.customersServed / stats.slicesBaked) * 100
      : 0;
  points += Math.min(efficiency / 100, 1);
  const totalPowerUps = Object.values(stats.powerUpsUsed).reduce(
    (a, b) => a + b,
    0
  );
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

export default function GameOverScreen({
  stats,
  score,
  level,
  lastStarLostReason,
  onSubmitted,
  onPlayAgain,
}: GameOverScreenProps) {
  const [playerName, setPlayerName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [copySuccess, setCopySuccess] = useState<'image' | null>(null);
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

  useEffect(() => {
    async function loadAllImages() {
      const images = await Promise.all([
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
        splashLogo: images[0],
        pizzaDAOLogo: images[1],
        droolface: images[2],
        plate: images[3],
        pizza: images[4],
        honey: images[5],
        iceCream: images[6],
        beer: images[7],
        doge: images[8],
        nyancat: images[9],
        star: images[10],
        moltobenny: images[11],
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

    const size = 1200;
    canvas.width = size;
    canvas.height = size;
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(0, 0, size, size);
  }, []);

  useEffect(() => {
    if (imagesLoaded) generateImage();
  }, [imagesLoaded, generateImage]);

  const copyImageToClipboard = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/png')
    );
    if (!blob) return;

    try {
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob }),
      ]);
      setCopySuccess('image');
      setTimeout(() => setCopySuccess(null), 2000);
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
  };

  if (showLeaderboard) {
    return (
      <div className="flex flex-col items-center gap-4 w-full max-w-4xl mx-auto">
        <HighScores
          userScore={{
            name: scoreSubmitted ? submittedName : displayName,
            score,
          }}
        />
        <div className="flex gap-3 w-full">
          <button
            onClick={() => setShowLeaderboard(false)}
            className="flex-1 px-4 py-3 bg-gray-600 text-white rounded-lg"
          >
            Back
          </button>
          <button
            onClick={onPlayAgain}
            className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg"
          >
            Play Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-2xl p-3 sm:p-6 w-full max-w-lg mx-auto">
      {/* SCORECARD WITH OVERLAY */}
      <div className="relative mb-3 bg-red-700 rounded-lg p-2 aspect-square overflow-hidden">
        <canvas
          ref={canvasRef}
          className="w-full h-full rounded object-contain"
        />

        <div className="absolute bottom-3 right-3 flex flex-col gap-2">
          <button
            onClick={copyImageToClipboard}
            className="w-10 h-10 bg-black/50 hover:bg-black/60 backdrop-blur rounded-lg flex items-center justify-center text-white"
            title={copySuccess ? 'Copied!' : 'Copy image'}
          >
            {copySuccess ? (
              <Check className="w-5 h-5" />
            ) : (
              <ImageIcon className="w-5 h-5" />
            )}
          </button>

          <button
            onClick={downloadImage}
            className="w-10 h-10 bg-black/50 hover:bg-black/60 backdrop-blur rounded-lg flex items-center justify-center text-white"
            title="Download"
          >
            <Download className="w-5 h-5" />
          </button>
        </div>
      </div>

      <button
        onClick={onPlayAgain}
        className="w-full px-4 py-3 bg-red-600 text-white rounded-lg font-semibold"
      >
        <RotateCcw className="inline w-5 h-5 mr-2" />
        Play Again
      </button>
    </div>
  );
}
