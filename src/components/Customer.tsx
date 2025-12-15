import React from 'react';
import { Customer as CustomerType } from '../types/game';
import { getCustomerDisplay, getCustomerTopPosition } from '../utils/customerDisplay';

interface CustomerProps {
  customer: CustomerType;
  variant?: 'portrait' | 'landscape';
}

const Customer: React.FC<CustomerProps> = ({ customer, variant = 'portrait' }) => {
  const display = getCustomerDisplay(customer);
  const topPosition = getCustomerTopPosition(customer.lane, variant);
  const emojiSize = variant === 'landscape'
    ? 'clamp(1rem, 2vw, 1.5rem)'
    : 'clamp(2rem, 5vw, 3.5rem)';

  return (
    <div
      className="absolute w-[8%] aspect-square transition-all duration-100 flex items-center justify-center"
      style={{
        left: `${customer.position}%`,
        top: topPosition,
      }}
    >
      {display.type === 'image' ? (
        <img src={display.value} alt={display.alt} className="w-full h-full object-contain" />
      ) : (
        <div style={{ fontSize: emojiSize }}>
          {display.value}
        </div>
      )}
    </div>
  );
};

export default Customer;
