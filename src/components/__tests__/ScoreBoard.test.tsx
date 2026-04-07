import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ScoreBoard from '../ScoreBoard';
import { createGameState } from '../../test/factories';

describe('ScoreBoard', () => {
  const defaultOnPause = vi.fn();

  it('renders the score', () => {
    const state = createGameState({ score: 4200 });
    render(<ScoreBoard gameState={state} onPauseClick={defaultOnPause} />);

    expect(screen.getByText('4,200')).toBeInTheDocument();
  });

  it('renders the bank balance', () => {
    const state = createGameState({ bank: 42 });
    render(<ScoreBoard gameState={state} onPauseClick={defaultOnPause} />);

    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('renders the level', () => {
    const state = createGameState({ level: 7 });
    render(<ScoreBoard gameState={state} onPauseClick={defaultOnPause} />);

    expect(screen.getByText('7')).toBeInTheDocument();
  });

  it('renders 5 star icons for the rating', () => {
    const state = createGameState({ lives: 3 });
    render(<ScoreBoard gameState={state} onPauseClick={defaultOnPause} />);

    // There should be exactly 5 stars rendered (the Star icons from lucide)
    // Each star is an svg element
    const svgs = document.querySelectorAll('svg');
    // ScoreBoard renders: Trophy, 5 Stars, DollarSign, Layers, Pause = 9 svgs
    expect(svgs.length).toBe(9);
  });

  it('renders filled stars equal to lives count', () => {
    const state = createGameState({ lives: 3 });
    render(<ScoreBoard gameState={state} onPauseClick={defaultOnPause} />);

    // Stars with "fill-current" class are filled
    const filledStars = document.querySelectorAll('.fill-current');
    expect(filledStars.length).toBe(3);
  });

  it('calls onPauseClick when pause button is pressed', async () => {
    const onPause = vi.fn();
    const state = createGameState();
    render(<ScoreBoard gameState={state} onPauseClick={onPause} />);

    const pauseButton = screen.getByRole('button', { name: /pause/i });
    await userEvent.click(pauseButton);

    expect(onPause).toHaveBeenCalledTimes(1);
  });

  it('renders in compact mode without errors', () => {
    const state = createGameState({ score: 100, lives: 5, level: 2, bank: 10 });
    const { container } = render(
      <ScoreBoard gameState={state} onPauseClick={defaultOnPause} compact />
    );

    // Compact mode uses py-1 px-3 instead of p-3
    expect(container.firstChild).toHaveClass('py-1');
  });
});
