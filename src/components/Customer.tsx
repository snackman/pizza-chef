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

interface CustomerProps {
  customer: CustomerType;
}

const Customer: React.FC<CustomerProps> = ({ customer }) => {
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

  return (
    <>
      <div
        className="absolute w-[8%] aspect-square transition-all duration-100 flex items-center justify-center"
        style={{
          left: `${leftPosition}%`,
          top: `${customer.lane * 25 + 6}%`,
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
          <div style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)' }}>
            {display.value}
          </div>
        )}
      </div>
      {customer.textMessage && (
        <div
          className="absolute px-2 py-1 bg-white text-black rounded border-2 border-black text-xs font-bold whitespace-nowrap"
          style={{
            left: `${leftPosition}%`,
            top: `${customer.lane * 25 + 18}%`,
            transform: 'translateX(-50%)',
          }}
        >
          {customer.textMessage}
        </div>
      )}
    </>
  );
};

export default Customer;