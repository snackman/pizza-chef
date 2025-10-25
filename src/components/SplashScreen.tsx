import React from 'react';
import chefImg from '/Sprites/chefemoji.png';

interface SplashScreenProps {
  onStart: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onStart }) => {
  return (
    <div className="fixed inset-0 bg-red-600 flex items-center justify-center z-50">
      <div className="text-center space-y-3 p-8">
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

        <button
          onClick={onStart}
          className="px-12 py-4 bg-green-600 text-white text-2xl font-bold rounded-lg hover:bg-green-700 transition-all transform hover:scale-105 shadow-lg"
        >
          Start Game
        </button>
      </div>
    </div>
  );
};

export default SplashScreen;
