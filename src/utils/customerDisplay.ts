import { Customer } from '../types/game';

import droolfaceImg from '/Sprites/droolface.png';
import yumfaceImg from '/Sprites/yumface.png';
import frozenfaceImg from '/Sprites/frozenface.png';
import woozyfaceImg from '/Sprites/woozyface.png';

const spicyfaceImg = "https://i.imgur.com/MDS5EVg.png";

export interface CustomerDisplayResult {
  type: 'image' | 'emoji';
  value: string;
  alt?: string;
}

export function getCustomerDisplay(customer: Customer): CustomerDisplayResult {
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
}

export const PORTRAIT_LANE_OFFSET = 6;
export const PORTRAIT_LANE_MULTIPLIER = 25;

export const LANDSCAPE_LANE_POSITIONS = [20, 40, 60, 80];

export function getCustomerTopPosition(lane: number, variant: 'portrait' | 'landscape'): string {
  if (variant === 'landscape') {
    return `${LANDSCAPE_LANE_POSITIONS[lane]}%`;
  }
  return `${lane * PORTRAIT_LANE_MULTIPLIER + PORTRAIT_LANE_OFFSET}%`;
}
