import React from 'react';
import { Customer as CustomerType } from '../types/game';
import droolfaceImg from '/Sprites/droolface.png';
import yumfaceImg from '/Sprites/yumface.png';
import frozenfaceImg from '/Sprites/frozenface.png';
const spicyfaceImg = "https://i.imgur.com/MDS5EVg.png";
import woozyfaceImg from '/Sprites/woozyface.png';
const criticImg = "https://i.imgur.com/ZygBTOI.png";
const badLuckBrianImg = "https://i.imgur.com/cs0LDgJ.png";
const badLuckBrianPukeImg = "https://i.imgur.com/yRXQDIT.png";

interface LandscapeCustomerProps {
  customer: CustomerType;
}

const LANDSCAPE_LANE_POSITIONS = [20, 40, 60, 80];

const LandscapeCustomer: React.FC<LandscapeCustomerProps> = ({ customer }) => {
  const leftPosition = customer.position;

  const getDisplay = () => {
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

  const topPercent = LANDSCAPE_LANE_POSITIONS[customer.lane];

  return (
    <>
      <div
        className="absolute w-[8%] aspect-square transition-transform duration-100 ease-linear flex items-center justify-center"
        style={{
          left: 0,
          top: 0,
          transform: `translate3d(${leftPosition}vw, ${topPercent}cqh, 0)`,
          willChange: 'transform',
        }}
      >
        {display.type === 'image' ? (
          <img
            src={display.value}
            alt={display.alt}
            className="w-full h-full object-contain"
            style={{
              transform: customer.flipped ? 'scaleX(-1)' : 'none',
            }}
          />
        ) : (
          <div style={{ fontSize: 'clamp(1rem, 2vw, 1.5rem)' }}>
            {display.value}
          </div>
        )}
      </div>
      {customer.textMessage && (
        <div
          className="absolute px-2 py-1 bg-white text-black rounded border-2 border-black text-xs font-bold whitespace-nowrap transition-transform duration-100 ease-linear"
          style={{
            left: 0,
            top: 0,
            transform: `translate3d(calc(${leftPosition}vw - 50%), ${topPercent + 12}cqh, 0)`,
            willChange: 'transform',
          }}
        >
          {customer.textMessage}
        </div>
      )}
    </>
  );
};

export default LandscapeCustomer;
