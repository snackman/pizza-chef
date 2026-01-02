import React from 'react';
import { ui } from '../lib/assets';

interface ControlsOverlayProps {
  onClose: () => void;
}

const ControlsOverlay: React.FC<ControlsOverlayProps> = ({ onClose }) => {
  const controls = ui("controls.png");

  const handleImageClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const relativeX = x / rect.width;
    const relativeY = y / rect.height;

    // Check if click is in upper right corner (top 15%, right 15%)
    if (relativeX >= 0.85 && relativeY <= 0.15) {
      onClose();
    }
  };

  return (
    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40 rounded-lg">
      <div 
        className="relative max-w-4xl w-full mx-4 cursor-pointer"
        onClick={handleImageClick}
      >
        <img
          src={controls}
          alt="Game Controls"
          className="w-full h-auto rounded-lg shadow-2xl"
        />
        {/* Visual indicator for close area (optional, can be removed) */}
        <div className="absolute top-0 right-0 w-[20%] h-[20%] opacity-0 hover:opacity-20 transition-opacity bg-white rounded-bl-lg" />
      </div>
    </div>
  );
};

export default ControlsOverlay;

