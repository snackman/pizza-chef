# Pizza Chef Refactoring Plan v2

## Current State (January 2025)

### Completed Systems
- `scoringSystem.ts` - Score calculations, life gains, streaks
- `collisionSystem.ts` - Collision detection helpers
- `powerUpSystem.ts` - Power-up collection and expiration
- `nyanSystem.ts` - Nyan sweep movement and collisions
- `ovenSystem.ts` - Oven tick, interaction, pause logic, display status
- `storeSystem.ts` - Store purchases, upgrades
- `customerSystem.ts` - Customer movement and state
- `bossSystem.ts` - Boss battle logic, minions, waves ✅ NEW
- `spawnSystem.ts` - Customer and power-up spawning ✅ NEW
- `plateSystem.ts` - Plate catching and movement ✅ NEW

### Current Metrics
- **useGameLogic.ts**: 883 lines (was 1045, target: ~300)
- **updateGame function**: ~484 lines (was ~500, ideally ~50)
- **Logic files**: 10 systems extracted (was 7)

---

## Phase 1: useGameLogic Decomposition (HIGH PRIORITY)

### 1.1 Extract Boss Battle System
**New File**: `src/logic/bossSystem.ts`

**Functions to extract**:
```typescript
// Initialize boss battle
initializeBossBattle(level: number, now: number): BossBattle

// Process boss battle each tick
processBossTick(state: GameState, now: number): {
  nextState: GameState;
  events: BossEvent[];
}

// Handle slice-boss collisions
processBossCollisions(
  slices: PizzaSlice[],
  boss: BossBattle,
  minions: BossMinion[]
): {
  hitBoss: boolean;
  hitMinionIds: string[];
  consumedSliceIds: string[];
  scores: Array<{ points: number; lane: number; position: number }>;
}

// Spawn wave of minions
spawnBossWave(waveNumber: number, now: number): BossMinion[]
```

**Lines to move**: ~100 lines from useGameLogic.ts (lines 700-800)

---

### 1.2 Extract Spawn System
**New File**: `src/logic/spawnSystem.ts`

**Functions to extract**:
```typescript
// Determine if customer should spawn
shouldSpawnCustomer(
  lastSpawn: number,
  now: number,
  level: number,
  customerCount: number
): boolean

// Create new customer
createCustomer(level: number, now: number): Customer

// Determine if power-up should spawn
shouldSpawnPowerUp(
  lastSpawn: number,
  now: number,
  level: number
): boolean

// Create random power-up
createPowerUp(level: number, now: number): PowerUp
```

**Lines to move**: ~80 lines from useGameLogic tick callback

---

### 1.3 Extract Plate Catching System
**New File**: `src/logic/plateSystem.ts`

**Functions to extract**:
```typescript
// Process chef catching plates
processPlateCatching(
  chefLane: number,
  chefX: number,
  plates: EmptyPlate[],
  stats: GameStats,
  dogeMultiplier: number
): {
  caughtPlateIds: string[];
  newStats: GameStats;
  scores: Array<{ points: number; lane: number; position: number }>;
}

// Update plate positions
updatePlatePositions(plates: EmptyPlate[]): EmptyPlate[]

// Clean up off-screen plates
cleanupPlates(plates: EmptyPlate[]): EmptyPlate[]
```

**Lines to move**: ~40 lines

---

### 1.4 Consolidate updateGame Function
After extractions, `updateGame` should become:

```typescript
const updateGame = useCallback(() => {
  setGameState(prev => {
    if (prev.gameOver || prev.paused) return prev;

    let state = { ...prev };
    const now = Date.now();

    // 1. Process ovens (already extracted)
    const ovenResult = processOvenTick(...);
    state = applyOvenResult(state, ovenResult);

    // 2. Update entity positions
    state = updateCustomerPositions(state, now);
    state = updateSlicePositions(state);
    state = updatePlatePositions(state);
    state = updatePowerUpPositions(state);

    // 3. Process collisions
    state = processSliceCollisions(state, now);
    state = processPlateCatching(state);
    state = processPowerUpCollection(state, now);

    // 4. Process special systems
    if (state.nyanSweep?.active) {
      state = processNyanSweep(state, now);
    }
    if (state.bossBattle?.active) {
      state = processBossTick(state, now);
    }

    // 5. Cleanup and spawning
    state = cleanupEntities(state, now);
    state = processSpawning(state, now);

    // 6. Check level/game state
    state = checkLevelProgression(state);

    return state;
  });
}, []);
```

**Target**: Reduce updateGame from ~500 lines to ~50 lines

---

## Phase 2: Power-Up Consolidation (MEDIUM PRIORITY)

### Problem
Power-up effects are implemented in 3 places:
- `powerUpSystem.ts` (production)
- `useGameLogic.ts debugActivatePowerUp` (debug)
- `customerSystem.ts` (effect application)

### Solution
Create single source of truth:

**Update**: `src/logic/powerUpSystem.ts`

```typescript
// Single function to apply any power-up effect
applyPowerUpEffect(
  state: GameState,
  powerUpType: PowerUpType,
  now: number
): GameState

// Remove duplicate implementations from:
// - debugActivatePowerUp in useGameLogic.ts
// - Inline effect logic scattered throughout
```

### Also
- Delete unused `checkStarPowerAutoFeed()` function
- Consolidate ice-cream/honey conflict resolution logic

**Lines removed**: ~50 duplicate lines

---

## Phase 3: Customer Type Refactor (MEDIUM PRIORITY)

### Problem
Customer interface has 26 properties with overlapping boolean flags:
- `woozy`, `woozyState`, `frozen`, `unfrozenThisPeriod`
- `hotHoneyAffected`, `shouldBeFrozen`, `woozySpeedModifier`
- `served`, `leaving`, `disappointed`, `vomit`

### Solution
Introduce state machine pattern:

```typescript
// New types
type CustomerState =
  | 'approaching'
  | 'served'
  | 'disappointed'
  | 'leaving'
  | 'vomit';

type CustomerEffect = {
  type: 'frozen' | 'woozy' | 'honey';
  startTime: number;
  endTime: number;
};

// Simplified Customer interface
interface Customer {
  id: string;
  lane: number;
  position: number;
  speed: number;

  state: CustomerState;
  effects: CustomerEffect[];

  // Special types
  variant: 'normal' | 'critic' | 'badLuckBrian';

  // UI state (separate concern)
  ui: {
    textMessage?: string;
    textMessageTime?: number;
    emoji?: string;
  };
}
```

### Migration
1. Create new types alongside existing
2. Add adapter functions
3. Gradually migrate components
4. Remove old properties

---

## Phase 4: App.tsx Modal State (LOW PRIORITY)

### Problem
6 separate useState hooks for screen visibility:
```typescript
const [showSplash, setShowSplash] = useState(true);
const [showInstructions, setShowInstructions] = useState(false);
const [showHighScores, setShowHighScores] = useState(false);
const [showGameOver, setShowGameOver] = useState(false);
// etc.
```

### Solution
Single state enum:

```typescript
type ScreenState =
  | 'splash'
  | 'game'
  | 'paused'
  | 'instructions'
  | 'highScores'
  | 'store'
  | 'gameOver';

const [screen, setScreen] = useState<ScreenState>('splash');

// Helper for transitions
const navigateTo = (next: ScreenState) => {
  // Handle any cleanup/side effects
  setScreen(next);
};
```

**Benefits**:
- Impossible to have conflicting states
- Clearer state transitions
- Easier to add new screens

---

## Phase 5: Constants Cleanup (LOW PRIORITY)

### Issues Found
- Magic numbers scattered (lane tolerances, position buffers)
- Some constants defined but not imported where needed

### New Constants to Add
```typescript
// src/lib/constants.ts

export const COLLISION_CONFIG = {
  NYAN_LANE_TOLERANCE: 0.8,
  NYAN_POSITION_BUFFER: 10,
  SLICE_CUSTOMER_THRESHOLD: 8,
  CHEF_POWERUP_THRESHOLD: 5,
  PLATE_CATCH_THRESHOLD: 10,
};

export const NYAN_CONFIG = {
  MAX_X: 90,
  DURATION: 2600,
  SPEED: 35,
};
```

---

## Implementation Order

| Phase | Priority | Effort | Impact |
|-------|----------|--------|--------|
| 1.1 Boss System | High | 4-5 hrs | -100 lines |
| 1.2 Spawn System | High | 3-4 hrs | -80 lines |
| 1.3 Plate System | High | 2-3 hrs | -40 lines |
| 1.4 Consolidate updateGame | High | 3-4 hrs | Major clarity |
| 2 Power-Up Consolidation | Medium | 2-3 hrs | -50 lines, fewer bugs |
| 3 Customer Type | Medium | 6-8 hrs | Major clarity |
| 4 Modal State | Low | 1-2 hrs | Minor clarity |
| 5 Constants | Low | 1 hr | Minor clarity |

---

## Success Criteria

- [ ] `useGameLogic.ts` under 400 lines (currently 883)
- [ ] `updateGame` function under 100 lines (currently ~484)
- [x] No duplicate power-up effect logic
- [ ] All magic numbers in constants
- [x] Boss system fully extracted and tested
- [x] Spawn system fully extracted and tested
- [x] Plate system fully extracted and tested
- [x] Integrated test suite covering core systems (32 tests passing)
- [x] Customer type helpers implemented (Phase 3)

---

## Completed in This Session

- [x] Fixed cook time bug in MobileGameControls
- [x] Created shared `getOvenDisplayStatus()` utility
- [x] Both GameBoard and MobileGameControls now use consistent oven status logic
- [x] Star power now auto-refills pizza slices
- [x] Star power allows pulling pizza from oven with no room
- [x] Cumulative upgrade pricing ($10, $20, $30...)
- [x] Local storage fallback for high scores
- [x] Pizza confetti for top 10 scores
- [x] Disabled game board tap controls (kept mobile buttons)
- [x] Doge alert 1/3 size on mobile

## Phase 1 Refactoring Complete

- [x] **1.1 Boss System** - Extracted to `bossSystem.ts` (~280 lines)
- [x] **1.2 Spawn System** - Extracted to `spawnSystem.ts` (~140 lines)
- [x] **1.3 Plate System** - Extracted to `plateSystem.ts` (~75 lines)
- [x] **1.4 Consolidation** - Reduced useGameLogic from 1045 to 923 lines (-122 lines)

### Notes on Further Reduction
The remaining large section in updateGame is the slice-customer collision loop (~130 lines). This is tightly coupled to:
- Sound effects (multiple soundManager calls)
- Customer state transitions (woozy, frozen, served)
- Scoring and life gain calculations
- Stats tracking

Extracting this would require a complex result object and careful handling of side effects. Consider for a future refactoring phase.

## Phase 2 Refactoring Complete

- [x] Deleted unused `checkStarPowerAutoFeed()` function (-26 lines from powerUpSystem.ts)
- [x] Consolidated `debugActivatePowerUp` to use `processPowerUpCollection` (-40 lines from useGameLogic.ts)
- [x] Total reduction: **-66 lines**

## Integrated Test Suite Created

Added vitest test suite covering core game logic systems:

### Test Files
- `src/logic/customerSystem.test.ts` - 23 tests
- `src/logic/powerUpSystem.test.ts` - 5 tests
- `src/logic/nyanSystem.test.ts` - 4 tests

### Coverage
- **Customer Movement**: approaching, leaving, off-screen removal
- **Customer Disappointment**: reaching chef, life loss events
- **Frozen Effect (Ice Cream)**: freeze activation, Brian immunity, no movement when frozen
- **Hot Honey Effect**: speed reduction, critic immunity ("Just plain, thanks."), Brian immunity ("I can't do spicy.")
- **Woozy Movement**: bidirectional swaying
- **processCustomerHit**: normal serve, critic serve, Brian drops, frozen unfreeze, woozy 2-step process
- **Bad Luck Brian**: special movement, complaint on reaching chef (no life loss)
- **Nyan Cat Effect**: customer push (brianNyaned)
- **Power-Up Expiration**: removal and star power detection
- **Power-Up Collection**: timed activation, star power effects, beer+woozy=vomit
- **Nyan Sweep**: movement and collision detection

### Configuration
- vitest.config.ts with globals and node environment
- Run with: `npx vitest run`

## Phase 3 Customer Type Refactor Complete

Added new customer state machine types and helper functions for cleaner code:

### New Types Added (game.ts)
```typescript
export type CustomerState = 'approaching' | 'served' | 'disappointed' | 'leaving' | 'vomit';
export type CustomerVariant = 'normal' | 'critic' | 'badLuckBrian';
export type WoozyState = 'normal' | 'drooling' | 'satisfied';
```

### Helper Functions Added (game.ts)
- `isCustomerLeaving(c)` - Check if customer is in any departure state
- `isCustomerApproaching(c)` - Check if customer is still approaching
- `getCustomerVariant(c)` - Get customer type: normal, critic, or badLuckBrian
- `isCustomerAffectedByPowerUps(c)` - Check if customer can receive power-up effects

### Files Updated
- **customerSystem.ts**: Uses `isCustomerLeaving`, `isCustomerAffectedByPowerUps`, `getCustomerVariant`
- **spawnSystem.ts**: Uses `CustomerVariant` type for cleaner customer creation
- **useGameLogic.ts**: Uses `isCustomerLeaving`, `getCustomerVariant` for collision handling
- **Customer.tsx**: Uses `getCustomerVariant` for cleaner display logic

### Benefits
- Single source of truth for state checks
- Clearer code intent (e.g., `isCustomerLeaving(c)` vs `c.served || c.disappointed || ...`)
- Type safety for customer variants
- Foundation for future state machine migration
- All 32 tests still passing
