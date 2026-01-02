// src/components/Customer.tsx
import React from 'react';
import { Customer as CustomerType } from '../types/game';
import { sprite } from '../lib/assets';

// Sprites (all hosted on Cloudflare)
const droolfaceImg = sprite("drool-face.png");
const yumfaceImg = sprite("yum-face.png");
const frozenfaceImg = sprite("frozen-face.png");
const spicyfaceImg = sprite("spicy-face.png");
const woozyfaceImg = sprite("woozy-face.png");
const criticImg = sprite("critic.png");
const badLuckBrianImg = sprite("bad-luck-brian.png");
const badLuckBrianPukeImg = sprite("bad-luck-brian-puke.png");
const rainbowBrian = sprite("rainbow-brian.png");

interface CustomerProps {
  customer: CustomerType;
  boardWidth: number;
  boardHeight: number;
}

const Customer: React.FC<CustomerProps> = ({ customer, boardWidth, boardHeight }) => {
  // 1. Define 'ready' first to avoid ReferenceErrors
  const ready = boardWidth > 0 && boardHeight > 0;

  // 2. Original coordinate system (percent of board)
  const xPct = customer.position;
  const yPct = customer.lane * 25 + 6;

  // Convert % of board → px
  const xPx = (xPct / 100) * boardWidth;
  const yPx = (yPct / 100) * boardHeight;

  // 3. Text Message Position Logic
  const isBottomLane = customer.lane === 3;
  // If bottom lane: Anchor text at +5% (Above head)
  // If other lanes: Anchor text at +18% (Below feet)
  const textYOffset = isBottomLane ? 5 : 18;
  const textYPx = ((customer.lane * 25 + textYOffset) / 100) * boardHeight;

  const getDisplay = () => {
    // 🌈 Rainbow Brian (nyan hit) — override everything else
    if (customer.brianNyaned) {
      return { type: 'image', value: rainbowBrian, alt: 'rainbow-brian' };
    }

    if (customer.frozen) return { type: 'image', value: frozenfaceImg, alt: 'frozen' };
    if (customer.vomit && customer.badLuckBrian) return { type: 'image', value: badLuckBrianPukeImg, alt: 'brian-puke' };
    if (customer.vomit) return { type: 'emoji', value: '🤮' };
    if (customer.woozy) {
      if (customer.woozyState === 'drooling') return { type: 'image', value: droolfaceImg, alt: 'drooling' };
      return { type: 'image', value: woozyfaceImg, alt: 'woozy' };
    }
    if (customer.served) return { type: 'image', value: yumfaceImg, alt: 'yum' };
    if (customer.disappointed) return { type: 'emoji', value: customer.disappointedEmoji || '😢' };
    if (customer.hotHoneyAffected) return { type: 'image', value: spicyfaceImg, alt: 'spicy' };
    if (customer.badLuckBrian) return { type: 'image', value: badLuckBrianImg, alt: 'badluckbrian' };
    if (customer.critic) return { type: 'image', value: criticImg, alt: 'critic' };
    return { type: 'image', value: droolfaceImg, alt: 'drool' };
  };

  const display = getDisplay();

  return (
    <>
      <div
        className="absolute w-[8%] aspect-square flex items-center justify-center"
        style={{
          left: 0,
          top: 0,
          transform: ready ? `translate3d(${xPx}px, ${yPx}px, 0)` : undefined,
          willChange: 'transform',
          transition: 'transform 100ms linear',
        }}
      >
        {display.type === 'image' ? (
          <img
            key={display.value}
            src={display.value}
            alt={display.alt}
            className="w-full h-full object-contain"
            style={{
              transform: customer.brianNyaned
                ? 'scale(2)'
                : customer.flipped
                  ? 'scaleX(-1)'
                  : 'none',
            }}
          />
        ) : (
          <div style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)' }}>
            {display.value}
          </div>
        )}
      </div>

      {customer.textMessage && (
        <div
          className="z-50 absolute px-2 py-1 bg-white text-black rounded border-2 border-black text-xs font-bold whitespace-nowrap"
          style={{
            left: 0,
            top: 0,
            transform: ready
              ? `translate3d(${xPx}px, ${textYPx}px, 0) translateX(-50%) ${
                  // If bottom lane, shift UP by 100% of the text bubble's height
                  isBottomLane ? 'translateY(-100%)' : ''
                }`
              : 'translateX(-50%)',
            willChange: 'transform',
            transition: 'transform 100ms linear',
          }}
        >
          {customer.textMessage}
        </div>
      )}
    </>
  );
};

export default Customer;