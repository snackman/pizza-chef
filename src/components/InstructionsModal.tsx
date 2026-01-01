import React from 'react';
import { Pizza, X, RotateCcw, Volume2, VolumeX, Trophy, Play } from 'lucide-react';
import { soundManager } from '../utils/sounds';
import { sprite } from '../lib/assets';

const chefImg = sprite("chef.png");
const smokingChefImg = sprite("chef-smoking.png");

interface InstructionsModalProps {
  onClose: () => void;
  onReset: () => void;
  onShowHighScores: () => void;
  onResume: () => void;
}

const InstructionsModal: React.FC<InstructionsModalProps> = ({ onClose, onReset, onShowHighScores, onResume }) => {
  const [isMuted, setIsMuted] = React.useState(soundManager.checkMuted());

  const handleToggleMute = () => {
    soundManager.toggleMute();
    setIsMuted(soundManager.checkMuted());
  };

  const handleReset = () => {
    onReset();
    onClose();
  };

  const handleHighScores = () => {
    onShowHighScores();
  };

  const handleResume = () => {
    onResume();
    onClose();
  };
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-r from-orange-100 to-yellow-100 p-6 rounded-lg border-2 border-orange-300 max-w-2xl w-full max-h-[90vh] overflow-y-auto relative">
        <button
          onClick={handleResume}
          className="absolute top-4 right-4 p-2 hover:bg-orange-200 rounded-full transition-colors"
          aria-label="Close"
        >
          <X className="w-6 h-6 text-gray-700" />
        </button>

        <div className="flex items-center space-x-2 mb-4">
          <img src={smokingChefImg} alt="chef" className="w-8 h-8 object-contain" />
          <h3 className="text-xl font-bold text-gray-800">How to Play Pizza Chef</h3>
        </div>

        <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-700">
          <div>
            <span className="font-semibold block mb-2 hidden md:block">Desktop Controls:</span>
            <ul className="space-y-1 ml-4 hidden md:block">
              <li>• Use <kbd className="px-2 py-1 bg-gray-200 rounded text-xs">↑</kbd> <kbd className="px-2 py-1 bg-gray-200 rounded text-xs">↓</kbd> to move chef between counters</li>
              <li>• Press <kbd className="px-2 py-1 bg-gray-200 rounded text-xs">←</kbd> or <kbd className="px-2 py-1 bg-gray-200 rounded text-xs">Space</kbd> to use oven (cook/take out pizza)</li>
              <li>• Press <kbd className="px-2 py-1 bg-gray-200 rounded text-xs">→</kbd> to serve pizza slice</li>
              <li>• Press <kbd className="px-2 py-1 bg-gray-200 rounded text-xs">P</kbd> to pause game</li>
            </ul>

            <span className="font-semibold block mb-2 md:hidden">Mobile Controls:</span>
            <ul className="space-y-1 ml-4 md:hidden">
              <li>• Tap above chef to move up</li>
              <li>• Tap below chef to move down</li>
              <li>• Tap on chef to use oven</li>
              <li>• Tap right side to serve pizza</li>
            </ul>
          </div>

          <div>
            <span className="font-semibold block mb-2">Gameplay:</span>
            <ul className="space-y-1 ml-4">
              <li>• Heat slices in ovens (3 seconds)</li>
              <li>• You can hold up to 8 slices at a time</li>
              <li>• Serve hungry customers before they reach you</li>
              <li>• Don't let slices burn in the oven!</li>
              <li>• Advance levels by increasing your score</li>
              <li>• Catch empty plates for bonus points</li>
            </ul>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3 justify-center">
          <button
            onClick={handleResume}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold"
          >
            <Play className="w-5 h-5" />
            Resume
          </button>

          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold"
          >
            <RotateCcw className="w-5 h-5" />
            Reset Game
          </button>

          <button
            onClick={handleToggleMute}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
          >
            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            {isMuted ? 'Unmute' : 'Mute'}
          </button>

          <button
            onClick={handleHighScores}
            className="flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors font-semibold"
          >
            <Trophy className="w-5 h-5" />
            High Scores
          </button>
        </div>
      </div>
    </div>
  );
};

export default InstructionsModal;
