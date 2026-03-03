import React from 'react';
import { sprite } from '../lib/assets';
import { useAssetPreloader } from '../hooks/useAssetPreloader';

const chefImg = sprite("chef.png");

interface SplashScreenProps {
  onStart: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onStart }) => {
  const { progress, done } = useAssetPreloader();

  return (
    <div className="fixed inset-0 bg-red-600 flex items-center justify-center z-50">
      <div className="text-center space-y-3 p-8 relative">
        <img
          src={"https://i.imgur.com/EPCSa79.png"}
          alt="PizzaDAO Logo"
          className="w-48 h-auto mx-auto mb-5"
        />

        <h1 className="text-6xl font-bold text-white mb-4">
          Pizza Chef
        </h1>

        <img
          src="/PizzaDAO-Logo-White (2).png"
          alt="PizzaDAO Logo"
          className="w-48 h-auto mx-auto"
        />

        {/* Loading bar */}
        {!done && (
          <div className="w-64 mx-auto">
            <div className="bg-red-800 rounded-full h-3 overflow-hidden">
              <div
                className="bg-green-400 h-full rounded-full transition-all duration-300"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>
            <p className="text-red-200 text-sm mt-1">Loading assets...</p>
          </div>
        )}

        <button
          onClick={onStart}
          disabled={!done}
          className={`px-12 py-4 text-white text-2xl font-bold rounded-lg transition-all transform shadow-lg ${
            done
              ? 'bg-green-600 hover:bg-green-700 hover:scale-105 cursor-pointer'
              : 'bg-gray-500 cursor-not-allowed opacity-60'
          }`}
        >
          {done ? 'Start Game' : 'Loading...'}
        </button>
      </div>

      {/* GitHub + Google Sheets links — bottom right */}
<div className="absolute bottom-4 right-4 flex items-center gap-3">
  {/* Google Sheets (left) */}
  <a
    href="https://docs.google.com/spreadsheets/d/1J3-Usmmfd2B_av_BVvC9m70cRdpLvmGv5Wm2d6m_Y_w/edit?gid=0#gid=0"
    target="_blank"
    rel="noopener noreferrer"
  >
    <img
      src="https://cdn.simpleicons.org/googlesheets/000000"
      alt="Google Sheets"
      className="w-8 h-8 filter invert"
    />
  </a>

  {/* GitHub (right) */}
  <a
    href="https://github.com/snackman/pizza-chef"
    target="_blank"
    rel="noopener noreferrer"
  >
    <img
      src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/github/github-original.svg"
      alt="GitHub"
      className="w-8 h-8 filter invert"
    />
  </a>
</div>

    </div>
  );
};

export default SplashScreen;
