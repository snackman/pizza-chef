# Pizza Chef Game - Architecture Document

## Project Overview

Pizza Chef is a fast-paced arcade-style game built with React, TypeScript, and Vite. Players manage a pizza chef who must cook pizzas in ovens, serve customers moving across four lanes, and catch empty plates before they hit the counter. The game features a comprehensive upgrade system, power-ups, and a global high score leaderboard.

## Technology Stack

### Frontend
- **React 18.3.1** - UI framework with hooks-based architecture
- **TypeScript 5.5.3** - Type-safe development
- **Vite 5.4.2** - Build tool and development server
- **Tailwind CSS 3.4.1** - Utility-first CSS framework
- **Lucide React 0.344.0** - Icon library

### Backend & Database
- **Supabase** - Backend-as-a-Service
  - PostgreSQL database for high scores
  - Row Level Security (RLS) for data access control
  - Storage buckets for sprites

### Audio
- **Web Audio API** - Procedural sound generation for game events

## Project Structure

```a
project/
├── public/                          # Static assets
│   ├── sprites/                     # Game sprite images
│   │   ├── chefemoji.png
│   │   ├── fullpizza.png
│   │   ├── *slicepizzapan.png       # 1-8 slice variations
│   │   ├── beer.png, hothoney.png   # Power-up sprites
│   │   └── ...                      # Emoji sprites
│   └── *.png                        # Background images
│
├── src/
│   ├── components/                  # React components
│   │   ├── GameBoard.tsx            # Portrait game board
│   │   ├── LandscapeGameBoard.tsx   # Landscape game board
│   │   ├── Customer.tsx             # Customer entity
│   │   ├── LandscapeCustomer.tsx   # Landscape customer variant
│   │   ├── PizzaSlice.tsx             # Pizza slice entity
│   │   ├── PizzaSliceStack.tsx      # Visual slice stack indicator
│   │   ├── EmptyPlate.tsx           # Empty plate entity
│   │   ├── DroppedPlate.tsx         # Dropped plate entity
│   │   ├── PowerUp.tsx              # Power-up entity
│   │   ├── ScoreBoard.tsx           # Portrait score display
│   │   ├── LandscapeScoreBoard.tsx  # Landscape score display
│   │   ├── MobileGameControls.tsx   # Mobile controls
│   │   ├── LandscapeControls.tsx    # Landscape controls
│   │   ├── ItemStore.tsx            # Upgrade shop
│   │   ├── HighScores.tsx           # Leaderboard display
│   │   ├── SubmitScore.tsx          # Score submission form
│   │   ├── GameOverScreen.tsx       # Game over screen with stats
│   │   ├── SplashScreen.tsx         # Game intro
│   │   ├── InstructionsModal.tsx    # Help modal
│   │   ├── PowerUpAlert.tsx         # Power-up activation alerts
│   │   ├── StreakDisplay.tsx        # Streak counter display
│   │   ├── FloatingScore.tsx        # Floating score animations
│   │   ├── ScorecardImageView.tsx   # Scorecard image viewer
│   │   ├── DebugPanel.tsx           # Debug controls (optional)
│   │   └── Boss.tsx                 # Boss battle entity
│   │
│   ├── hooks/
│   │   └── useGameLogic.ts          # Core game loop and state management
│   │
│   ├── logic/                       # Modular game logic systems
│   │   ├── ovenSystem.ts            # Oven cooking and interaction logic
│   │   ├── customerSystem.ts        # Customer movement and hit processing
│   │   └── powerUpSystem.ts         # Power-up effects (if separated)
│   │
│   ├── services/
│   │   └── highScores.ts            # Supabase API for scores and sessions
│   │
│   ├── lib/
│   │   ├── supabase.ts              # Supabase client configuration
│   │   ├── constants.ts             # Game configuration constants
│   │   └── assets.ts                # Asset path management
│   │
│   ├── utils/
│   │   └── sounds.ts                # Sound manager (Web Audio API)
│   │
│   ├── types/
│   │   └── game.ts                  # TypeScript type definitions
│   │
│   ├── App.tsx                      # Root component with routing logic
│   ├── main.tsx                     # Application entry point
│   └── index.css                    # Global styles
│
├── supabase/
│   └── migrations/                  # Database schema migrations
│       ├── 20251021190739_create_high_scores_table.sql
│       ├── 20251023024826_create_sprites_bucket.sql
│       ├── 20251023024902_allow_anon_sprite_upload.sql
│       ├── 20251217053318_create_game_sessions_table.sql
│       ├── 20251220094239_add_game_session_id_to_high_scores.sql
│       ├── 20251220094935_add_scorecard_image_url_to_game_sessions.sql
│       ├── 20251220094947_create_scorecards_bucket.sql
│       └── 20251220100612_add_game_sessions_update_policy.sql
│
├── package.json                     # Dependencies and scripts
├── tsconfig.json                    # TypeScript configuration
├── vite.config.ts                   # Vite build configuration
├── tailwind.config.js               # Tailwind CSS configuration
└── .env                             # Environment variables (Supabase keys)
```

## Core Architecture

### 1. Component Architecture

The application follows a component-based architecture with clear separation of concerns:

#### App Component (`App.tsx`)
- **Role**: Root orchestrator
- **Responsibilities**:
  - Manages application-level state (splash screen, modals, high scores)
  - Detects device orientation and screen size
  - Routes between portrait/landscape layouts
  - Handles keyboard input
  - Coordinates game controls with game logic hook

#### Game Boards
- **GameBoard.tsx**: Portrait/desktop layout
- **LandscapeGameBoard.tsx**: Mobile landscape layout
- Both render:
  - Four-lane playing field
  - Ovens (one per lane)
  - Chef character positioned on current lane
  - Game entities (customers, pizza slices, plates, power-ups)
  - Visual status indicators

#### Entity Components
Presentational components that render individual game objects:
- **Customer.tsx**: Customer sprite with state-based emoji (hungry, served, disappointed, frozen, woozy, critic, Bad Luck Brian)
- **LandscapeCustomer.tsx**: Landscape-optimized customer rendering
- **PizzaSlice.tsx**: Animated pizza slice projectile
- **EmptyPlate.tsx**: Returning plate that chef must catch
- **DroppedPlate.tsx**: Plate dropped by Bad Luck Brian
- **PowerUp.tsx**: Power-up items (honey, ice cream, beer, star, doge, nyan, moltobenny)
- **PizzaSliceStack.tsx**: Visual indicator of slices held by chef or in oven
- **Boss.tsx**: Boss battle entity rendering
- **FloatingScore.tsx**: Floating score animation display

#### UI Components
- **GameOverScreen.tsx**: Comprehensive game over screen with statistics, scorecard generation, and score submission
- **StreakDisplay.tsx**: Real-time streak counter display during gameplay
- **PowerUpAlert.tsx**: Visual alerts for special power-up activations (doge, nyan)
- **ScorecardImageView.tsx**: Viewer for shareable scorecard images
- **DebugPanel.tsx**: Optional debug controls for testing (can be enabled via flag)

### 2. State Management

#### Custom Hook: `useGameLogic.ts`
The game's state machine and core logic engine.

**Game State Structure** (`GameState` interface):
```typescript
{
  customers: Customer[]              // All active customers
  pizzaSlices: PizzaSlice[]          // Flying pizza slices
  emptyPlates: EmptyPlate[]          // Plates returning to chef
  droppedPlates: DroppedPlate[]      // Plates dropped by Bad Luck Brian
  powerUps: PowerUp[]                // Active power-ups on field
  activePowerUps: ActivePowerUp[]    // Currently active power-up effects
  floatingScores: FloatingScore[]    // Floating score animations
  chefLane: number                   // Current chef position (0-3)
  score: number                      // Player score
  lives: number                      // Remaining stars (0-5)
  level: number                      // Current level
  gameOver: boolean                  // Game over state
  paused: boolean                    // Pause state
  availableSlices: number            // Slices chef is holding (max 8)
  ovens: {                           // Oven state per lane
    [key: number]: {
      cooking: boolean
      startTime: number
      burned: boolean
      cleaningStartTime: number
      pausedElapsed?: number
      sliceCount: number
    }
  }
  ovenUpgrades: { [key: number]: number }       // Slice count upgrades (0-7)
  ovenSpeedUpgrades: { [key: number]: number }  // Cooking speed upgrades (0-3)
  happyCustomers: number             // Total satisfied customers
  bank: number                       // Currency for upgrades
  showStore: boolean                 // Shop modal visibility
  lastStoreLevelShown: number        // Track when shop was last shown
  pendingStoreShow: boolean          // Defer store during nyan sweep
  fallingPizza?: { lane: number; y: number }   // Death animation
  starPowerActive?: boolean          // Star power-up effect active
  powerUpAlert?: {                   // Power-up activation alert
    type: PowerUpType
    endTime: number
    chefLane: number
  }
  nyanSweep?: {                      // Nyan cat power-up sweep state
    active: boolean
    xPosition: number
    laneDirection: 1 | -1
    startTime: number
    lastUpdateTime: number
    startingLane: number
  }
  bossBattle?: BossBattle            // Boss battle state
  defeatedBossLevels: number[]       // Track defeated boss levels
  lastStarLostReason?: StarLostReason // Reason for last life lost
  stats: GameStats                   // Comprehensive game statistics
}
```

**Key Methods**:
- `servePizza()` - Launch pizza slice from chef's current lane
- `moveChef(direction)` - Move chef up/down between lanes
- `useOven()` - Start cooking pizza or extract cooked pizza
- `cleanOven()` - Begin cleaning burned oven
- `upgradeOven(lane)` - Purchase oven upgrade (more slices)
- `upgradeOvenSpeed(lane)` - Purchase speed upgrade (faster cooking)
- `bribeReviewer()` - Purchase extra life
- `buyPowerUp(type)` - Purchase power-up from shop
- `togglePause()` - Pause/unpause with oven timer preservation
- `resetGame()` - Reset to initial state
- `debugActivatePowerUp(type)` - Debug function to activate power-ups

**Game Loop** (50ms tick interval):
1. Process oven states and timers (via `ovenSystem.processOvenTick`)
2. Update customer positions and AI (via `customerSystem.updateCustomerPositions`)
3. Update pizza slice positions
4. Check collisions: slices vs customers, slices vs power-ups, chef vs power-ups, chef vs plates
5. Process customer hits (via `customerSystem.processCustomerHit`)
6. Handle power-up activations and effects
7. Process star power auto-feed
8. Process nyan cat sweep
9. Process boss battle mechanics
10. Cleanup expired entities (floating scores, dropped plates, text messages)
11. Spawn new customers (rate increases with level)
12. Spawn random power-ups
13. Handle level progression and boss triggers
14. Update game statistics

### 2.1 Game Configuration (`lib/constants.ts`)

All game configuration values are centralized in a single constants file for easy tuning:

- **GAME_CONFIG**: Core game settings (lives, levels, lanes, chef position)
- **OVEN_CONFIG**: Oven timing and upgrade limits
- **ENTITY_SPEEDS**: Movement speeds for all entities
- **SPAWN_RATES**: Customer and power-up spawn probabilities
- **PROBABILITIES**: Special customer and power-up spawn chances
- **SCORING**: Point values for all actions
- **COSTS**: Shop item prices
- **BOSS_CONFIG**: Boss battle configuration
- **POWERUPS**: Power-up durations and types
- **TIMINGS**: Animation and effect lifetimes
- **POSITIONS**: Screen position constants
- **INITIAL_GAME_STATE**: Default game state template

This centralization makes it easy to balance gameplay and adjust difficulty.

### 2.2 Modular Logic Systems

The game logic has been refactored into modular systems for better maintainability:

#### Oven System (`logic/ovenSystem.ts`)
- **`processOvenTick()`**: Processes all ovens for a single game tick
  - Handles cooking timers, burn detection, cleaning completion
  - Returns oven state updates, sound state changes, and events
  - Manages pause/unpause state preservation
- **`tryInteractWithOven()`**: Handles user interaction with ovens
  - Starts cooking or serves pizza based on oven state
  - Validates slice capacity before serving
  - Returns action type and state updates
- **`calculateOvenPauseState()`**: Manages pause/unpause transitions
  - Preserves elapsed cooking time during pause
  - Adjusts start times when unpausing

#### Customer System (`logic/customerSystem.ts`)
- **`updateCustomerPositions()`**: Handles customer movement and AI
  - Processes status effects (frozen, hot honey, woozy)
  - Handles special customer types (critic, Bad Luck Brian)
  - Detects life loss conditions
  - Returns updated customers and events
- **`processCustomerHit()`**: Processes pizza slice collisions with customers
  - Handles different customer states (normal, frozen, woozy, Bad Luck Brian)
  - Returns updated customer, events, and new entities (plates)
  - Manages two-step woozy satisfaction process

### 3. Game Mechanics

#### Ovens
- **States**: Empty → Cooking → Ready → Warning → Burning → Burned
- **Timing**:
  - Base cooking time: 3 seconds
  - Speed upgrades: 2s → 1s → 0.5s
  - Ready window: 3-7 seconds (safe to extract)
  - Warning: 7-8 seconds (blinking indicators)
  - Burned: 8+ seconds (lose a life, requires cleaning)
  - Cleaning: 3 seconds
- **Upgrades**: Each oven can produce 1-8 slices (base: 1)

#### Customers
- **Movement**: Spawn at right (98%), move left toward chef (15%)
- **Speed**: Base 0.4, increases with level
- **Types**:
  - **Normal**: Standard customer, needs 1 pizza
  - **Critic**: 15% spawn chance, worth 2x points (300), loses 2 lives if disappointed, can give bonus life if served at position >= 50
  - **Bad Luck Brian**: 10% spawn chance (if not critic), immune to power-ups, drops plate when served, complains with text messages
- **States**:
  - Hungry: Moving toward chef, needs pizza
  - Served: Received pizza, moving right, drops plate
  - Disappointed: Reached chef without pizza (lose life)
  - Frozen: Stopped by ice cream power-up (5 seconds)
  - Woozy: Affected by beer (needs 2 pizzas or honey to satisfy)
  - Vomit: Woozy customer given second beer (lose life)
  - Leaving: Departing after being served or disappointed
  - Brian Nyaned: Special state when Bad Luck Brian hit by Nyan cat sweep
- **Text Messages**: Customers can display temporary text messages (3 second lifetime)

#### Power-Ups
- **Hot Honey** (🍯): Slows customers to 50% speed, satisfies woozy in 1 slice, lasts 5 seconds
- **Ice Cream** (🍨): Freezes all customers in place for 5 seconds
- **Beer** (🍺): Makes customers woozy (need 2 pizzas), vomit if already woozy, critics immune
- **Star** (⭐): Auto-feeds customers on contact, gives 8 slices, lasts 5 seconds
- **Doge** (🐕): 2x score multiplier for all actions, lasts 5 seconds, shows alert
- **Nyan Cat** (🌈): Sweeps across all lanes automatically serving customers, lasts ~2.6 seconds, prevents manual actions during sweep
- **Moltobenny** (💰): Instant 10,000 points + 69 coins, no duration

#### Boss Battles
- **Trigger Levels**: Level 30 and Level 50
- **Structure**: 3 waves of 4 minions each, then boss becomes vulnerable
- **Minions**: Move at 0.15 speed, worth 100 points when defeated
- **Boss Health**: 24 hits required to defeat
- **Boss Position**: 85% across screen
- **Rewards**: 
  - Minion defeat: +100 points
  - Boss hit: +100 points
  - Boss defeat: +5,000 points
- **Mechanics**: 
  - Boss vulnerable only after all minions in wave are defeated
  - Minions reaching chef cause life loss
  - Boss battles reduce customer spawn rate by 50%
  - Defeated boss levels tracked to prevent respawning

#### Scoring System
- **Customer Service**:
  - Normal customer: +150 points + 1 coin
  - Critic customer: +300 points + 1 coin (bonus life if served at position >= 50)
  - Woozy first slice: +50 points + 1 coin
  - Streak multipliers: Applied to customer scores (see Streak System)
- **Actions**:
  - Catch plate: +50 points (with streak multiplier)
  - Collect power-up: +100 points
  - Defeat minion: +100 points
  - Hit boss: +100 points
  - Defeat boss: +5,000 points
  - Moltobenny: +10,000 points + 69 coins
- **Life System**:
  - Life gained: Every 8 happy customers (max 5 lives)
  - Critic bonus: 1 life if served at position >= 50
  - Doge multiplier: Can grant 2 lives per 8 customers (if active)
- **Progression**:
  - Level up: Every 500 points
  - Shop opens: Every 10 levels (starting at level 10)

#### Streak System
- **Customer Streak**: Tracks consecutive customers served
  - Multiplier increases with streak length
  - Resets on: disappointed customer, dropped plate, beer vomit, Bad Luck Brian plate drop
  - Displayed in UI during gameplay
- **Plate Streak**: Tracks consecutive plates caught
  - Multiplier increases with streak length
  - Resets on: missed plate, dropped plate, slice going off-screen

#### Lives System
- Start with 3 lives (stars)
- Lose life when:
  - Normal customer reaches chef (disappointed): -1 life
  - Critic customer reaches chef: -2 lives
  - Woozy customer reaches chef: -1 life
  - Woozy critic reaches chef: -2 lives
  - Woozy customer given beer (vomits): -1 life
  - Bad Luck Brian given beer (hurled): -1 life
  - Pizza burns in oven: -1 life
  - Boss minion reaches chef: -1 life
- Gain life:
  - Every 8 satisfied customers (max 5 lives)
  - Critic served at position >= 50: +1 life (bonus)
  - Doge multiplier: Can grant 2 lives per 8 customers (if active)
- Game over at 0 lives

### 4. Responsive Design

The game adapts to three layout modes:

#### Portrait/Desktop Mode
- Vertical lane layout
- Chef on left side
- Ovens on far left
- Customers move left-to-right
- Full scoreboard at top
- On-screen controls for mobile

#### Landscape Mode (Mobile)
- Optimized for mobile landscape orientation
- Different chef and oven positioning
- Touch-friendly button controls on left/right edges
- Compact scoreboard

#### Breakpoints
- Mobile detection: `width < 1000px`
- Landscape detection: `width > height`

### 5. Database Architecture

#### Supabase Configuration (`lib/supabase.ts`)
```typescript
createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
```

#### High Scores Table
```sql
high_scores (
  id uuid PRIMARY KEY,
  player_name text NOT NULL (1-50 chars),
  score integer NOT NULL (>= 0),
  game_session_id uuid REFERENCES game_sessions(id),
  created_at timestamptz DEFAULT now()
)
```

**Row Level Security**:
- Public SELECT: Anyone can view leaderboard
- Public INSERT: Anyone can submit scores (anonymous gameplay)
- No UPDATE or DELETE (score integrity)

**Indexes**:
- `idx_high_scores_score_desc` on `(score DESC, created_at DESC)` for leaderboard queries

#### Game Sessions Table
```sql
game_sessions (
  id uuid PRIMARY KEY,
  player_name text NOT NULL (1-50 chars),
  score integer NOT NULL (>= 0),
  level integer NOT NULL (>= 1),
  slices_baked integer NOT NULL (>= 0),
  customers_served integer NOT NULL (>= 0),
  longest_streak integer NOT NULL (>= 0),
  plates_caught integer NOT NULL (>= 0),
  largest_plate_streak integer NOT NULL (>= 0),
  oven_upgrades integer NOT NULL (>= 0),
  power_ups_used jsonb NOT NULL DEFAULT '{}',
  scorecard_image_url text,
  created_at timestamptz DEFAULT now()
)
```

**Row Level Security**:
- Public SELECT: Anyone can view game sessions
- Public INSERT: Anyone can create game sessions
- Public UPDATE: Anyone can update game sessions (for scorecard image URL)

**Indexes**:
- `idx_game_sessions_score_desc` on `(score DESC)` for leaderboard queries
- `idx_game_sessions_created_at` on `(created_at DESC)` for recent games

#### Storage Buckets
- **`sprites`**: Public read, anonymous upload for game sprite images
- **`scorecards`**: Public read, anonymous upload for scorecard images

#### API Service (`services/highScores.ts`)
- `getTopScores(limit)`: Fetch top N scores ordered by score (desc), then date (asc)
- `submitScore(playerName, score, gameSessionId?)`: Insert new score entry
- `createGameSession(playerName, score, level, stats)`: Create game session with full stats
- `getGameSession(id)`: Fetch game session by ID
- `uploadScorecardImage(gameSessionId, blob)`: Upload scorecard image to storage
- `updateGameSessionImage(gameSessionId, imageUrl)`: Update game session with image URL

### 6. Sound System

#### Sound Manager (`utils/sounds.ts`)
Singleton class using Web Audio API for procedural audio generation.

**Architecture**:
- `AudioContext` initialized on first sound
- Tone-based synthesis (oscillators)
- Configurable waveforms: sine, square, sawtooth, triangle
- Multi-tone sequences for complex sound effects

**Sound Events**:
- `servePizza()` - Quick tone when launching pizza
- `customerServed()` - Rising 3-note success melody
- `customerDisappointed()` - Descending negative sound
- `customerUnfreeze()` - Sound when frozen customer is served
- `woozyServed()` - Sound for first slice to woozy customer
- `plateCaught()` - Short high ping
- `plateDropped()` - Cascading down tones
- `powerUpCollected(type)` - Unique melody per power-up type
- `pizzaDestroyed()` - Sound when pizza hits power-up
- `ovenStart()` - Oven activation
- `ovenReady()` - Double ping notification
- `ovenWarning()` - Alert tone
- `ovenBurning()` - Harsh warning
- `ovenBurned()` - Deep loss sound
- `cleaningStart()` - Sound when starting oven cleaning
- `cleaningComplete()` - Sound when cleaning finishes
- `lifeLost()` - Descending failure melody
- `lifeGained()` - Ascending success melody
- `gameOver()` - Dramatic descending sequence
- `nyanCatPowerUp()` - Special sound for nyan cat activation

**Features**:
- Mute toggle support
- Volume normalization (20% base volume)
- Timed sequences with delays

### 7. Type System

#### Core Types (`types/game.ts`)

**Entity Types**:
- `Customer`: Position, lane, state, effects, special flags (critic, badLuckBrian)
- `PizzaSlice`: Projectile data with position and speed
- `EmptyPlate`: Returning plate data
- `DroppedPlate`: Plate dropped by Bad Luck Brian with timing
- `PowerUp`: Type, position, lane, and speed
- `ActivePowerUp`: Duration-tracked effect with endTime
- `FloatingScore`: Score animation with position and timing
- `BossMinion`: Boss battle minion entity
- `BossBattle`: Complete boss battle state

**Game State**:
- `GameState`: Complete game state (see State Management section)
- `GameStats`: Comprehensive statistics tracking

**Enums/Unions**:
- `PowerUpType`: 'honey' | 'ice-cream' | 'beer' | 'star' | 'doge' | 'nyan' | 'moltobenny'
- `WoozyState`: 'normal' | 'drooling' | 'satisfied'
- `StarLostReason`: Reason enum for life loss tracking
- `OvenSoundState`: 'idle' | 'cooking' | 'ready' | 'warning' | 'burning'

### 8. Input Handling

#### Keyboard Controls (Desktop)
- `Arrow Up/Down`: Move chef between lanes
- `Arrow Right`: Serve pizza
- `Arrow Left/Space`: Use oven or clean burned oven
- `P`: Pause/unpause
- `R`: Reset game

#### Touch Controls (Mobile)
- Portrait: On-screen buttons for all actions
- Landscape: Left/right side buttons for movement and actions
- Click/tap on game board for contextual actions

#### Input Architecture
- Global keyboard listeners in `App.tsx`
- Event delegation for click/touch handling
- Input disabled during:
  - Game over state
  - Paused state
  - Modal open (instructions, store, high scores)
  - Text input focus

## Data Flow

### Game Loop Cycle
```
User Input → useGameLogic Hook → State Update → React Re-render →
Component Update → Visual Feedback + Sound Effect
```

### Score Submission Flow
```
Game Over → GameOverScreen Component → User Input →
createGameSession() → Generate Scorecard Image →
uploadScorecardImage() → updateGameSessionImage() →
submitScore() → Supabase API →
Database Insert → HighScores Component → Leaderboard Display
```

### Game Session & Scorecard Flow
```
Game Over → Extract Game Stats →
createGameSession() → Generate Scorecard Canvas →
Convert to Blob → uploadScorecardImage() →
updateGameSessionImage() → Store URL in game_sessions →
Display in HighScores with Shareable Link
```

### Power-Up Activation Flow
```
Collision Detection → Power-Up Type Check →
Add to activePowerUps[] → Apply Effect →
Duration Timer → Remove from activePowerUps[]
```

## Performance Considerations

### Optimization Strategies
1. **Entity Culling**: Entities removed when off-screen (position > 95% or < -10%)
2. **Collision Detection**: Simple bounding box checks with distance threshold (< 5%)
3. **Re-render Optimization**: Force update at 100ms intervals for oven status
4. **Sound Throttling**: Volume normalization prevents audio clipping
5. **CSS Transitions**: Hardware-accelerated transforms where possible

### Performance Bottlenecks
- Frequent state updates (50ms game loop)
- Multiple `Array.map()` operations per frame
- CSS transitions on multiple elements simultaneously
- Oven timer calculations on each update

## Security Considerations

### Database Security
- Row Level Security (RLS) enabled on all tables
- Public read-only access to high scores (leaderboard use case)
- Public insert-only for score submission (anonymous gameplay)
- Input validation:
  - Player name: 1-50 characters
  - Score: non-negative integer
  - No SQL injection risk (Supabase client parameterizes queries)

### Client-Side Security
- No authentication required (public arcade game)
- No sensitive data stored client-side
- Environment variables for Supabase keys (Vite prefixed with `VITE_`)

## Deployment

### Build Process
```bash
npm run build          # Production build with Vite
npm run preview        # Preview production build
npm run typecheck      # TypeScript validation
```

### Environment Variables Required
```
VITE_SUPABASE_URL       # Supabase project URL
VITE_SUPABASE_ANON_KEY  # Supabase anonymous/public key
```

### Build Output
- Static site generated in `dist/`
- Optimized, minified JavaScript bundles
- CSS extracted and minified
- Assets with content-hash filenames for cache busting

## Future Enhancement Opportunities

### Potential Improvements
1. **Multiplayer Mode**: Real-time competitive gameplay via Supabase Realtime
2. **Daily Challenges**: Timed challenges with special conditions
3. **Achievement System**: Track milestones and badges in database
4. **Customization**: Unlock skins, themes, chef characters
5. **Sound Assets**: Replace procedural audio with recorded samples
6. **Mobile App**: Package as native app with Capacitor
7. **Analytics**: Track game metrics (avg survival time, popular upgrades)
8. **Tutorial Mode**: Interactive first-time user experience
9. **Difficulty Modes**: Easy/Normal/Hard with different parameters
10. **Save System**: Cloud save with user accounts
11. **Social Features**: Share scores, challenge friends
12. **Performance Mode**: Toggle effects for lower-end devices
13. **More Boss Battles**: Additional boss levels with unique mechanics
14. **Power-Up Combinations**: Synergistic effects when multiple power-ups active
15. **Seasonal Events**: Special events with unique customers and power-ups

### Technical Debt
1. Chef distortion in landscape mode (known issue)
2. Transition blur during lane changes (known issue)
3. No automated tests (unit, integration, E2E)
4. Limited error handling in API calls
5. No loading states for async operations
6. Some game constants in code (most moved to constants.ts)
7. Component size (some exceed recommended line count)
8. Duplicate code between portrait/landscape layouts
9. Power-up system could be further modularized (powerUpSystem.ts exists but not fully utilized)
10. Boss battle logic could be extracted to separate module

## Debugging

### Useful Commands
```bash
npm run dev           # Development server with hot reload
npm run lint          # ESLint code analysis
npm run typecheck     # TypeScript type checking
```

### Browser DevTools
- React DevTools: Inspect component state and props
- Console: Game loop events and errors
- Network: Supabase API calls
- Performance: Profile render cycles and frame rates

### Common Issues
1. **Sound not playing**: User interaction required to initialize AudioContext
2. **High scores not loading**: Check Supabase connection and RLS policies
3. **Chef movement lag**: Transition CSS may cause visual delay
4. **Oven timer drift**: Pause/unpause logic preserves elapsed time

## Contributing Guidelines

### Code Style
- TypeScript strict mode enabled
- ESLint configuration enforced
- Functional React components with hooks
- Tailwind utility classes for styling
- Clear component and function naming

### Component Structure
- Keep components under 300 lines
- Extract reusable logic to custom hooks
- Separate presentational and container components
- Use TypeScript interfaces for props

### Git Workflow
- Feature branches from main
- Descriptive commit messages
- Pull requests for code review
- No direct commits to main

---

**Last Updated**: December 20, 2025
**Version**: 2.0.0
**Maintainer**: PizzaDAO Team

## Recent Major Updates (v2.0.0)

### New Features
- **Boss Battle System**: Boss battles at levels 30 and 50 with minion waves
- **Enhanced Power-Ups**: Added Doge (2x multiplier), Nyan Cat (auto-sweep), and Moltobenny (instant rewards)
- **Special Customers**: Critics (2x points, 2x life loss) and Bad Luck Brian (immune to power-ups, drops plates)
- **Game Sessions**: Comprehensive game session tracking with full statistics
- **Scorecard Images**: Shareable scorecard images stored in Supabase
- **Streak System**: Customer and plate streak multipliers for enhanced scoring
- **Modular Logic**: Refactored oven and customer logic into separate systems
- **Enhanced Statistics**: Detailed game statistics tracking throughout gameplay

### Architecture Improvements
- Separated game logic into modular systems (`logic/ovenSystem.ts`, `logic/customerSystem.ts`)
- Centralized game constants in `lib/constants.ts`
- Enhanced type system with comprehensive game state types
- Improved database schema with game sessions and scorecard support
