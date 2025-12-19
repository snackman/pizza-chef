import React from 'react';
import { Customer as CustomerType } from '../types/game';
import droolfaceImg from '/Sprites/droolface.png';
import yumfaceImg from '/Sprites/yumface.png';
import frozenfaceImg from '/Sprites/frozenface.png';
const spicyfaceImg = "https://i.imgur.com/MDS5EVg.png";
import woozyfaceImg from '/Sprites/woozyface.png';

interface LandscapeCustomerProps {
  customer: CustomerType;
}

const LANDSCAPE_LANE_POSITIONS = [20, 40, 60, 80];

const LandscapeCustomer: React.FC<LandscapeCustomerProps> = ({ customer }) => {
  const leftPosition = customer.position;

  const getDisplay = () => {
    if (customer.frozen) return { type: 'image', value: frozenfaceImg, alt: 'frozen' };
    if (customer.vomit) return { type: 'emoji', value: '🤮' };
    if (customer.woozy) {
      if (customer.woozyState === 'drooling') return { type: 'image', value: droolfaceImg, alt: 'drooling' };
      return { type: 'image', value: woozyfaceImg, alt: 'woozy' };
    }
    if (customer.served) return { type: 'image', value: yumfaceImg, alt: 'yum' };
    if (customer.disappointed) return { type: 'emoji', value: customer.disappointedEmoji || '😢' };
    if (customer.hotHoneyAffected) return { type: 'image', value: spicyfaceImg, alt: 'spicy' };
    return { type: 'image', value: droolfaceImg, alt: 'drool' };
  };

  const display = getDisplay();

  return (
    <div
      className="absolute w-[8%] aspect-square transition-all duration-100 flex items-center justify-center"
      style={{
        left: `${leftPosition}%`,
        top: `${LANDSCAPE_LANE_POSITIONS[customer.lane]}%`,
      }}
    >
      {display.type === 'image' ? (
        <img src={display.value} alt={display.alt} className="w-full h-full object-contain" />
      ) : (
        <div style={{ fontSize: 'clamp(1rem, 2vw, 1.5rem)' }}>
          {display.value}
        </div>
      )}
    </div>
  );
};

export default LandscapeCustomer;
