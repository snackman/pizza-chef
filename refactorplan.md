# Pizza Chef Refactoring Plan

## Current State Analysis

### Primary Issues

1. **`useGameLogic.ts` is 1062 lines** - Violates single responsibility, hard to maintain
2. **Game loop contains 9 major sections** - Difficult to understand and test
3. **Scoring logic duplicated** - Appears in 5+ places with similar patterns
4. **Power-up system partially extracted** - `powerUpSystem.ts` exists but logic reimplemented in hook
5. **Collision detection embedded** - Mixed with game logic, not reusable
6. **Boss battle logic embedded** - ~100 lines in main game loop
7. **Nyan cat sweep embedded** - ~95 lines in main game loop
8. **Event handling scattered** - Sound calls mixed with state updates

### Code Metrics

- **useGameLogic.ts**: 1062 lines
- **Game loop sections**: 9 major blocks
- **Scoring calculations**: ~200 lines duplicated
- **Power-up handling**: ~150 lines (partially duplicated)
- **Boss battle logic**: ~100 lines
- **Nyan sweep logic**: ~95 lines

---

## Refactoring Strategy

### Phase 1: Extract Scoring System ⭐ (HIGH PRIORITY)

**Goal**: Centralize all scoring calculations and life management

**New File**: `src/logic/scoringSystem.ts`

**Functions to Create**:
```typescript
// Calculate scores for different actions
calculateCustomerScore(
  customer: Customer,
  dogeMultiplier: number,
  streakMultiplier: number
): { points: number; bank: number }

calculatePlateScore(
  dogeMultiplier: number,
  streakMultiplier: number
): number

// Process life gains
processLifeGain(
  state: GameState,
  happyCustomers: number,
  dogeMultiplier: number
): { newLives: number; shouldPlaySound: boolean }

// Apply scoring to state
applyCustomerScoring(
  state: GameState,
  customer: Customer,
  event: CustomerHitEvent,
  dogeMultiplier: number
): GameState
```

**Benefits**:
- Eliminates ~200 lines of duplicated scoring code
- Makes scoring rules easy to adjust
- Enables unit testing of scoring logic
- Single source of truth for scoring calculations

**Lines Removed**: ~200
**Estimated Effort**: 4-6 hours

---

### Phase 2: Extract Collision System ⭐ (HIGH PRIORITY)

**Goal**: Separate collision detection from game logic

**New File**: `src/logic/collisionSystem.ts`

**Functions to Create**:
```typescript
// Collision detection helpers
checkSliceCustomerCollision(
  slice: PizzaSlice,
  customer: Customer,
  threshold?: number
): boolean

checkSlicePowerUpCollision(
  slice: PizzaSlice,
  powerUp: PowerUp,
  threshold?: number
): boolean

checkChefPowerUpCollision(
  chefLane: number,
  chefX: number,
  powerUp: PowerUp
): boolean

checkChefPlateCollision(
  chefLane: number,
  chefX: number,
  plate: EmptyPlate,
  threshold?: number
): boolean

checkNyanSweepCollision(
  nyanSweep: NyanSweep,
  entity: { lane: number; position: number }
): boolean
```

**Benefits**:
- Makes collision detection testable
- Allows easy adjustment of collision thresholds
- Separates physics from game rules
- Reusable across different systems

**Lines Removed**: ~50 (but enables other refactors)
**Estimated Effort**: 3-4 hours

---

### Phase 3: Integrate Power-Up System ⭐ (HIGH PRIORITY)

**Goal**: Use existing `powerUpSystem.ts` instead of reimplementing

**Changes**:
1. Replace power-up collection logic (lines 492-583) with `processPowerUpCollection()`
2. Replace power-up expiration logic (lines 444-451) with `processPowerUpExpirations()`
3. Extract star power auto-feed to separate function
4. Extract nyan sweep to `nyanSystem.ts`

**New File**: `src/logic/nyanSystem.ts`
```typescript
processNyanSweep(
  state: GameState,
  now: number
): GameState

checkNyanCollisions(
  nyanSweep: NyanSweep,
  customers: Customer[],
  minions?: BossMinion[]
): {
  hitCustomers: Customer[];
  hitMinions: BossMinion[];
  scores: Array<{ points: number; lane: number; position: number }>;
}
```

**Benefits**:
- Removes ~150 lines of duplicated power-up logic
- Makes power-up effects consistent
- Enables easier addition of new power-ups
- Uses existing tested code

**Lines Removed**: ~150
**Estimated Effort**: 4-5 hours

---

### Phase 4: Extract Boss Battle System (MEDIUM PRIORITY)

**Goal**: Move all boss battle logic to separate module

**New File**: `src/logic/bossSystem.ts`

**Functions to Create**:
```typescript
// Boss battle management
checkBossLevelTrigger(
  currentLevel: number,
  defeatedLevels: number[]
): number | null

initializeBossBattle(
  level: number,
  now: number
): BossBattle

processBossBattleTick(
  state: GameState,
  now: number
): GameState

processMinionMovement(
  minions: BossMinion[],
  speed: number
): BossMinion[]

processBossCollisions(
  state: GameState,
  slices: PizzaSlice[]
): {
  updatedState: GameState;
  consumedSliceIds: Set<string>;
  scores: Array<{ points: number; lane: number; position: number }>;
}

checkWaveCompletion(
  minions: BossMinion[],
  currentWave: number,
  maxWaves: number
): { nextWave?: number; bossVulnerable?: boolean }

spawnBossWave(
  waveNumber: number,
  now: number
): BossMinion[]
```

**Benefits**:
- Removes ~100 lines from main game loop
- Makes boss battles easier to extend
- Enables testing boss logic independently
- Clear separation of concerns

**Lines Removed**: ~100
**Estimated Effort**: 5-6 hours

---

### Phase 5: Extract Level & Progression System (MEDIUM PRIORITY)

**Goal**: Centralize level progression and store triggers

**New File**: `src/logic/progressionSystem.ts`

**Functions to Create**:
```typescript
// Level and progression
calculateLevel(score: number): number

checkLevelUp(
  oldLevel: number,
  newLevel: number
): { leveledUp: boolean; newLevel: number }

checkStoreTrigger(
  level: number,
  lastStoreLevel: number,
  storeInterval: number
): boolean

checkBossTrigger(
  level: number,
  defeatedLevels: number[],
  triggerLevels: number[]
): number | null
```

**Benefits**:
- Simplifies main game loop
- Makes progression rules configurable
- Easier to add new progression features
- Single place to adjust level thresholds

**Lines Removed**: ~30
**Estimated Effort**: 2-3 hours

---

### Phase 6: Extract Entity Management System (LOW PRIORITY)

**Goal**: Centralize entity spawning and cleanup

**New File**: `src/logic/entitySystem.ts`

**Functions to Create**:
```typescript
// Entity spawning
spawnCustomer(
  level: number,
  now: number,
  lastSpawn: number
): Customer | null

spawnPowerUp(
  now: number,
  lastSpawn: number
): PowerUp | null

// Entity cleanup
cleanupExpiredEntities(
  state: GameState,
  now: number
): GameState

// Entity movement
updateEntityPositions(
  state: GameState
): GameState
```

**Benefits**:
- Centralizes spawn logic
- Makes spawn rates easier to tune
- Cleaner main game loop
- Consistent entity management

**Lines Removed**: ~80
**Estimated Effort**: 3-4 hours

---

### Phase 7: Refactor useGameLogic Hook (FINAL PHASE)

**Goal**: Transform hook into orchestrator

**New Structure**:
```typescript
export const useGameLogic = (gameStarted: boolean) => {
  // State management (keep)
  const [gameState, setGameState] = useState<GameState>(...);
  const [ovenSoundStates, setOvenSoundStates] = useState(...);
  
  // Helper functions (keep minimal)
  const triggerGameOver = useCallback(...);
  const addFloatingScore = useCallback(...);
  
  // Main game loop - now much simpler
  const updateGame = useCallback(() => {
    setGameState(prev => {
      if (prev.gameOver) return handleGameOverState(prev);
      if (prev.paused) return prev;
      
      let state = { ...prev };
      const now = Date.now();
      
      // Orchestrate systems
      state = processOvenTick(state, ovenSoundStates, now);
      state = updateCustomerPositions(state, now);
      state = processCollisions(state, now);
      state = processPowerUps(state, now);
      state = processBossBattle(state, now);
      state = processLevelProgression(state);
      state = cleanupEntities(state, now);
      state = spawnEntities(state, now);
      
      return state;
    });
  }, [dependencies]);
  
  // Action handlers (keep)
  const servePizza = useCallback(...);
  const moveChef = useCallback(...);
  const useOven = useCallback(...);
  // etc.
  
  return { gameState, actions... };
};
```

**Target Size**: ~250-300 lines (down from 1062)

**Benefits**:
- Much easier to understand
- Each system can be tested independently
- Easier to add new features
- Better performance (smaller re-renders)
- Clear separation of concerns

**Lines Removed**: ~600-700 (after all extractions)
**Estimated Effort**: 4-6 hours

---

## Implementation Order

### Recommended Sequence:

1. **Phase 1: Scoring System** ⭐ (Start here - biggest impact)
2. **Phase 2: Collision System** ⭐ (Enables other refactors)
3. **Phase 3: Power-Up System** ⭐ (Uses collision system)
4. **Phase 4: Boss Battle System** (Uses collision system)
5. **Phase 5: Progression System** (Quick win)
6. **Phase 6: Entity Management** (Cleanup)
7. **Phase 7: Refactor Hook** (Final integration)

---

## Testing Strategy

### For Each System:

1. **Unit Tests**: Test pure functions with various inputs
2. **Edge Cases**: Empty arrays, null values, boundary conditions
3. **Integration Tests**: Test system interactions
4. **Game State Tests**: Test with mock game states

### Example Test Structure:
```typescript
// logic/scoringSystem.test.ts
describe('scoringSystem', () => {
  describe('calculateCustomerScore', () => {
    it('calculates normal customer score correctly', () => {
      const result = calculateCustomerScore(
        normalCustomer,
        1, // no doge
        1  // no streak
      );
      expect(result.points).toBe(150);
      expect(result.bank).toBe(1);
    });
    
    it('applies doge multiplier', () => {
      const result = calculateCustomerScore(normalCustomer, 2, 1);
      expect(result.points).toBe(300);
    });
    
    it('applies streak multiplier', () => {
      const result = calculateCustomerScore(normalCustomer, 1, 1.5);
      expect(result.points).toBe(225);
    });
  });
});
```

---

## Migration Strategy

### Incremental Approach:

1. ✅ Create new system file
2. ✅ Write tests for new system
3. ✅ Extract logic from `useGameLogic.ts`
4. ✅ Update `useGameLogic.ts` to use new system
5. ✅ Test game still works
6. ✅ Remove old code
7. ✅ Repeat for next system

### Safety Measures:

- Keep old code until new system is proven
- Use feature flags if needed
- Test thoroughly after each phase
- Git commits after each working phase
- Test on both desktop and mobile

---

## Expected Outcomes

### Code Metrics:
- **useGameLogic.ts**: 1062 lines → ~250 lines (76% reduction)
- **New logic files**: ~800 lines total (well-organized)
- **Test coverage**: 0% → 60%+ (for logic systems)
- **Duplication**: ~200 lines → 0 lines

### Benefits:
- ✅ Easier to understand and maintain
- ✅ Easier to test individual systems
- ✅ Easier to add new features
- ✅ Better performance (smaller components)
- ✅ Better code reusability
- ✅ Easier onboarding for new developers
- ✅ Single source of truth for game rules

### Risks:
- ⚠️ Initial time investment (30-40 hours total)
- ⚠️ Potential bugs during migration
- ⚠️ Need to update tests
- ⚠️ Temporary code duplication during migration

---

## Timeline Estimate

### Conservative (with testing):
- Phase 1: 1 week
- Phase 2: 3-4 days
- Phase 3: 1 week
- Phase 4: 1 week
- Phase 5: 2-3 days
- Phase 6: 3-4 days
- Phase 7: 1 week

**Total**: ~6-7 weeks (part-time) or 2-3 weeks (full-time)

### Aggressive (minimal testing):
- All phases: 2-3 weeks (full-time)

---

## Alternative: Quick Wins

If full refactor is too much, prioritize:

1. **Extract Scoring System** (Phase 1) - Biggest impact, removes most duplication
2. **Integrate Power-Up System** (Phase 3) - Uses existing code
3. **Extract Boss System** (Phase 4) - Large chunk of code

These three alone would reduce `useGameLogic.ts` by ~400-500 lines.

---

## Code Quality Improvements

### After Refactoring:

- **Single Responsibility**: Each system has one clear purpose
- **DRY Principle**: No duplicated scoring/collision logic
- **Testability**: Pure functions easy to test
- **Maintainability**: Changes isolated to specific systems
- **Readability**: Clear system boundaries
- **Extensibility**: Easy to add new features

---

## Notes

- Keep `useGameLogic.ts` as the orchestrator - don't over-engineer
- Systems should be pure functions where possible
- Use TypeScript strictly - catch errors early
- Document each system's responsibilities
- Consider using a state machine library if complexity grows
- Maintain backward compatibility during migration

---

## Success Criteria

- ✅ `useGameLogic.ts` under 300 lines
- ✅ No duplicated scoring logic
- ✅ All systems have unit tests
- ✅ Game functionality unchanged
- ✅ Performance maintained or improved
- ✅ Code is easier to understand

