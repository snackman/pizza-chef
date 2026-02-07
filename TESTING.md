# Testing Guide - Pizza Chef

## Running Tests

```bash
# Run all tests once
npm test

# Run tests in watch mode (re-runs on file changes)
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run tests with Vitest UI (browser-based test explorer)
npm run test:ui
```

## Test Structure

Tests are organized by layer:

### Unit Tests (Logic)

Location: `src/logic/*.test.ts`

Test pure functions from game logic modules. These run in Node/jsdom and have no UI dependencies.

```typescript
import { describe, it, expect } from 'vitest';
import { checkSliceCustomerCollision } from './collisionSystem';
import { createPizzaSlice, createCustomer } from '../test/factories';

describe('checkSliceCustomerCollision', () => {
  it('detects collision in same lane', () => {
    const slice = createPizzaSlice({ lane: 1, position: 50 });
    const customer = createCustomer({ lane: 1, position: 52 });
    expect(checkSliceCustomerCollision(slice, customer)).toBe(true);
  });
});
```

### Component Tests

Location: `src/components/__tests__/*.test.tsx`

Test React components using React Testing Library. These render components in jsdom and assert on DOM output and user interactions.

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ScoreBoard from '../ScoreBoard';
import { createGameState } from '../../test/factories';

describe('ScoreBoard', () => {
  it('displays the score', () => {
    const state = createGameState({ score: 1500 });
    render(<ScoreBoard gameState={state} onPauseClick={() => {}} />);
    expect(screen.getByText('1,500')).toBeInTheDocument();
  });
});
```

### Integration Tests

For testing interactions between multiple systems (e.g., power-up collection triggering scoring), create tests that exercise multiple modules together using shared factories to set up realistic game states.

## Using Test Factories

All factories live in `src/test/factories.ts`. Each factory returns a valid default object and accepts `Partial<T>` overrides.

```typescript
import { createGameState, createCustomer, createPowerUp } from '../test/factories';

// Use defaults
const state = createGameState();
const customer = createCustomer();

// Override specific fields
const critic = createCustomer({ critic: true, position: 60 });
const bossState = createGameState({ level: 10, score: 5000 });
```

Available factories:

| Factory | Type | Key Defaults |
|---------|------|-------------|
| `createGameState` | `GameState` | Based on `INITIAL_GAME_STATE` |
| `createCustomer` | `Customer` | lane: 0, position: 80, speed: 0.5 |
| `createPizzaSlice` | `PizzaSlice` | lane: 0, position: 50, speed: 3 |
| `createPowerUp` | `PowerUp` | lane: 0, position: 50, type: 'honey' |
| `createBossMinion` | `BossMinion` | lane: 0, position: 50, defeated: false |
| `createNyanSweep` | `NyanSweep` | active: true, xPosition: 10 |
| `createEmptyPlate` | `EmptyPlate` | lane: 0, position: 50, speed: 2 |
| `createActivePowerUp` | `ActivePowerUp` | type: 'honey', endTime: now + 5000 |

Helper functions in `src/test/helpers.ts`:

- `createCustomersInLanes([0, 1, 2])` - Quick array of customers in specified lanes
- `createGameStateWithCustomers([{ critic: true }, { lane: 2 }])` - GameState with custom customers

## File Naming Conventions

- Logic unit tests: `src/logic/<module>.test.ts`
- Component tests: `src/components/__tests__/<Component>.test.tsx`
- Test utilities: `src/test/` directory (factories, helpers, setup)

## Test Setup

The global setup file (`src/test/setup.ts`) handles:

- Importing `@testing-library/jest-dom` for DOM matchers (e.g., `toBeInTheDocument`)
- Mocking the `soundManager` module so tests do not require AudioContext

## Coverage

Run `npm run test:coverage` to generate a coverage report. Coverage is configured to track:

- `src/logic/**` - Game logic modules
- `src/components/**` - React components

The HTML report is output to `coverage/` in the project root.
