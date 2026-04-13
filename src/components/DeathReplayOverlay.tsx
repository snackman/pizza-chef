import React from 'react';

interface DeathReplayOverlayProps {
  frameIndex: number;
  totalFrames: number;
}

const DeathReplayOverlay: React.FC<DeathReplayOverlayProps> = ({ frameIndex, totalFrames }) => {
  const progress = totalFrames > 0 ? (frameIndex + 1) / totalFrames : 0;

  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 70 }}>
      {/* Semi-transparent vignette */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.5) 100%)',
        }}
      />

      {/* REPLAY label - top left */}
      <div
        className="absolute top-2 left-2 sm:top-3 sm:left-3"
        style={{ animation: 'replay-pulse 1s ease-in-out infinite' }}
      >
        <span
          className="text-red-500 font-bold tracking-widest drop-shadow-lg"
          style={{
            fontSize: 'clamp(0.75rem, 2vw, 1.25rem)',
            textShadow: '0 0 8px rgba(239, 68, 68, 0.7), 0 0 16px rgba(239, 68, 68, 0.4)',
          }}
        >
          REPLAY
        </span>
      </div>

      {/* SLOW-MO indicator - top right */}
      <div className="absolute top-2 right-2 sm:top-3 sm:right-3">
        <span
          className="text-white font-semibold opacity-60"
          style={{ fontSize: 'clamp(0.6rem, 1.5vw, 0.9rem)' }}
        >
          0.33x
        </span>
      </div>

      {/* Progress bar at bottom */}
      <div className="absolute bottom-2 left-2 right-2 sm:bottom-3 sm:left-3 sm:right-3">
        <div className="w-full h-1 sm:h-1.5 bg-black bg-opacity-40 rounded-full overflow-hidden">
          <div
            className="h-full bg-red-500 rounded-full transition-none"
            style={{
              width: `${progress * 100}%`,
              boxShadow: '0 0 6px rgba(239, 68, 68, 0.6)',
            }}
          />
        </div>
      </div>

      {/* Tap to skip hint */}
      <div className="absolute bottom-4 sm:bottom-6 left-0 right-0 flex justify-center">
        <span
          className="text-white opacity-50 font-medium"
          style={{ fontSize: 'clamp(0.5rem, 1.2vw, 0.75rem)' }}
        >
          Tap to skip
        </span>
      </div>
    </div>
  );
};

export default DeathReplayOverlay;
