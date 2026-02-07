import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ScoreBoard from '../ScoreBoard';
import { createGameState } from '../../test/factories';

describe('ScoreBoard', () => {
  it('displays the current score', () => {
    const state = createGameState({ score: 1500 });
    render(<ScoreBoard gameState={state} onPauseClick={() => {}} />);
    expect(screen.getByText('1,500')).toBeInTheDocument();
  });

  it('displays the current level', () => {
    const state = createGameState({ level: 5 });
    render(<ScoreBoard gameState={state} onPauseClick={() => {}} />);
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('displays bank amount', () => {
    const state = createGameState({ bank: 42 });
    render(<ScoreBoard gameState={state} onPauseClick={() => {}} />);
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('displays correct number of filled stars for lives', () => {
    const state = createGameState({ lives: 3 });
    const { container } = render(<ScoreBoard gameState={state} onPauseClick={() => {}} />);
    const filledStars = container.querySelectorAll('.fill-current');
    expect(filledStars.length).toBe(3);
  });

  it('calls onPauseClick when pause button is clicked', async () => {
    const user = userEvent.setup();
    const onPause = vi.fn();
    const state = createGameState();
    render(<ScoreBoard gameState={state} onPauseClick={onPause} />);
    await user.click(screen.getByRole('button', { name: /pause/i }));
    expect(onPause).toHaveBeenCalledOnce();
  });
});
