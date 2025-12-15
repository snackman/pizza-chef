export type LayoutVariant = 'portrait' | 'landscape';

export interface LayoutConfig {
  backgroundImage: string;
  containerClassName: string;
  oven: {
    width: string;
    height?: string;
    left: string;
    getTop: (lane: number) => string;
    fontSize: string;
    sliceStackStyle: React.CSSProperties;
  };
  chef: {
    containerWidth: string;
    containerLeft: string;
    getTop: (lane: number) => string;
    imageScale: string;
    sliceStackStyle: React.CSSProperties;
    gameOverFontSize: string;
  };
  nyanCat: {
    width: string;
    height?: string;
    getTop: (lane: number) => string;
    imageScale: string;
  };
  fallingPizza: {
    left: string;
    getTop: (lane: number, y: number) => string;
    fontSize: string;
  };
}

const PORTRAIT_BG = '/pizza shop background v2.png';
const LANDSCAPE_BG = 'https://i.imgur.com/f2a5vFx.jpeg';

export const layoutConfigs: Record<LayoutVariant, LayoutConfig> = {
  portrait: {
    backgroundImage: `url(${PORTRAIT_BG})`,
    containerClassName: 'relative w-full aspect-[5/3] border-4 border-amber-600 rounded-lg overflow-hidden',
    oven: {
      width: '8%',
      left: '1%',
      getTop: (lane) => `${lane * 25 + 6}%`,
      fontSize: 'clamp(1.25rem, 2.5vw, 1.75rem)',
      sliceStackStyle: { width: '75%', height: '75%', top: '40%', left: '70%', transform: 'translate(-50%, -50%)', zIndex: 1 },
    },
    chef: {
      containerWidth: '7.5%',
      containerLeft: '9%',
      getTop: (lane) => `${lane * 25 + 13}%`,
      imageScale: 'scale(15)',
      sliceStackStyle: { width: '1360%', height: '1360%', top: '-10%', left: '100%' },
      gameOverFontSize: 'clamp(2rem, 5vw, 3.5rem)',
    },
    nyanCat: {
      width: '8%',
      getTop: (lane) => `${lane * 25 + 13}%`,
      imageScale: 'scale(1.5)',
    },
    fallingPizza: {
      left: '13%',
      getTop: (lane, y) => `calc(${lane * 25 + 6}% + ${y}px)`,
      fontSize: 'clamp(1.5rem, 4vw, 2.5rem)',
    },
  },
  landscape: {
    backgroundImage: `url("${LANDSCAPE_BG}")`,
    containerClassName: 'relative w-full h-full overflow-hidden',
    oven: {
      width: '4%',
      height: '4%',
      left: '12vw',
      getTop: (lane) => `${30 + lane * 20}%`,
      fontSize: 'clamp(0.75rem, 1.5vw, 1rem)',
      sliceStackStyle: { width: '200%', height: '200%', top: '50%', left: '100%', transform: 'translate(-50%, -50%)', zIndex: 1 },
    },
    chef: {
      containerWidth: '3%',
      containerLeft: '20%',
      getTop: (lane) => `${30 + lane * 20}%`,
      imageScale: 'scale(5)',
      sliceStackStyle: { width: '400%', height: '400%', top: '10%', left: '-30%' },
      gameOverFontSize: 'clamp(1rem, 2vw, 1.5rem)',
    },
    nyanCat: {
      width: '3%',
      height: '3%',
      getTop: (lane) => `${30 + lane * 20}%`,
      imageScale: 'scale(0.5)',
    },
    fallingPizza: {
      left: '22%',
      getTop: (lane, y) => `calc(${23.5 + lane * 18.5}% + ${y}px)`,
      fontSize: 'clamp(0.75rem, 2vw, 1.25rem)',
    },
  },
};

export function getLayoutConfig(variant: LayoutVariant): LayoutConfig {
  return layoutConfigs[variant];
}
