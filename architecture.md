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
│   │   ├── PizzaSlice.tsx           # Pizza slice entity
│   │   ├── EmptyPlate.tsx           # Empty plate entity
│   │   ├── PowerUp.tsx              # Power-up entity
│   │   ├── ScoreBoard.tsx           # Score display
│   │   ├── GameControls.tsx         # Desktop controls
│   │   ├── MobileGameControls.tsx   # Mobile controls
│   │   ├── LandscapeControls.tsx    # Landscape controls
│   │   ├── ItemStore.tsx            # Upgrade shop
│   │   ├── HighScores.tsx           # Leaderboard display
│   │   ├── SubmitScore.tsx          # Score submission form
│   │   ├── SplashScreen.tsx         # Game intro
│   │   └── InstructionsModal.tsx    # Help modal
│   │
│   ├── hooks/
│   │   └── useGameLogic.ts          # Core game loop and state management
│   │
│   ├── services/
│   │   └── highScores.ts            # Supabase API for high scores
│   │
│   ├── lib/
│   │   └── supabase.ts              # Supabase client configuration
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
│       └── 20251023024902_allow_anon_sprite_upload.sql
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
- **Customer.tsx**: Customer sprite with state-based emoji (hungry, served, disappointed, frozen, woozy)
- **PizzaSlice.tsx**: Animated pizza slice projectile
- **EmptyPlate.tsx**: Returning plate that chef must catch
- **PowerUp.tsx**: Power-up items (honey, ice cream, beer, star)
- **PizzaSliceStack.tsx**: Visual indicator of slices held by chef or in oven

### 2. State Management

#### Custom Hook: `useGameLogic.ts`
The game's state machine and core logic engine.

**Game State Structure** (`GameState` interface):
```typescript
{
  customers: Customer[]              // All active customers
  pizzaSlices: PizzaSlice[]          // Flying pizza slices
  emptyPlates: EmptyPlate[]          // Plates returning to chef
  powerUps: PowerUp[]                // Active power-ups on field
  activePowerUps: ActivePowerUp[]    // Currently active power-up effects
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
  fallingPizza?: { lane: number; y: number }   // Death animation
  starPowerActive?: boolean          // Star power-up effect active
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

**Game Loop** (50ms tick interval):
1. Update entity positions (customers, slices, plates, power-ups)
2. Check collision detection
3. Update oven cooking timers and states
4. Manage power-up durations and effects
5. Spawn new customers (rate increases with level)
6. Spawn random power-ups
7. Handle burning pizzas and life loss
8. Process level progression

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
- **Movement**: Spawn at right (90%), move left toward chef (15%)
- **Speed**: Increases with level
- **States**:
  - Hungry: Moving toward chef, needs pizza
  - Served: Received pizza, moving right, drops plate
  - Disappointed: Reached chef without pizza (lose life)
  - Frozen: Stopped by ice cream power-up
  - Woozy: Affected by beer (needs 2 pizzas or honey)
  - Vomit: Woozy customer given second beer (lose life)

#### Power-Ups
- **Hot Honey** (🍯): Slows customers to 50% speed, satisfies woozy in 1 slice
- **Ice Cream** (🍨): Freezes all customers in place for 5 seconds
- **Beer** (🍺): Makes customers woozy (need 2 pizzas), vomit if already woozy
- **Star** (⭐): Auto-feeds customers on contact, gives 8 slices, lasts 5 seconds

#### Scoring System
- Serve customer: +150 points + 1 coin
- Catch plate: +50 points
- Collect power-up: +100 points
- Life gained: Every 8 happy customers (max 5 lives)
- Level up: Every 500 points
- Shop opens: Every 5 levels

#### Lives System
- Start with 3 lives (stars)
- Lose life when:
  - Customer reaches chef (disappointed)
  - Woozy customer given beer (vomits)
  - Pizza burns in oven
- Gain life: Every 8 satisfied customers (max 5 lives)
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
  created_at timestamptz DEFAULT now()
)
```

**Row Level Security**:
- Public SELECT: Anyone can view leaderboard
- Public INSERT: Anyone can submit scores (anonymous gameplay)
- No UPDATE or DELETE (score integrity)

**Indexes**:
- `idx_high_scores_score_desc` on `(score DESC, created_at DESC)` for leaderboard queries

#### API Service (`services/highScores.ts`)
- `getTopScores(limit)`: Fetch top N scores ordered by score (desc), then date (asc)
- `submitScore(playerName, score)`: Insert new score entry

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
- `plateCaught()` - Short high ping
- `plateDropped()` - Cascading down tones
- `powerUpCollected(type)` - Unique melody per power-up type
- `ovenStart()` - Oven activation
- `ovenReady()` - Double ping notification
- `ovenWarning()` - Alert tone
- `ovenBurning()` - Harsh warning
- `ovenBurned()` - Deep loss sound
- `lifeLost()` - Descending failure melody
- `lifeGained()` - Ascending success melody
- `gameOver()` - Dramatic descending sequence

**Features**:
- Mute toggle support
- Volume normalization (20% base volume)
- Timed sequences with delays

### 7. Type System

#### Core Types (`types/game.ts`)

**Entity Types**:
- `Customer`: Position, state, effects
- `PizzaSlice`: Projectile data
- `EmptyPlate`: Returning plate data
- `PowerUp`: Type and position
- `ActivePowerUp`: Duration-tracked effect

**Game State**:
- `GameState`: Complete game state (see State Management section)

**Enums/Unions**:
- `PowerUpType`: 'honey' | 'ice-cream' | 'beer' | 'star'
- `WoozyState`: 'normal' | 'drooling' | 'satisfied'

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
Game Over → SubmitScore Component → User Input →
highScores.submitScore() → Supabase API →
Database Insert → HighScores Component → Leaderboard Display
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

### Technical Debt
1. Chef distortion in landscape mode (known issue)
2. Transition blur during lane changes (known issue)
3. No automated tests (unit, integration, E2E)
4. Limited error handling in API calls
5. No loading states for async operations
6. Hard-coded game constants (should be configurable)
7. Component size (some exceed recommended line count)
8. Duplicate code between portrait/landscape layouts

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

**Last Updated**: October 25, 2025
**Version**: 1.0.0
**Maintainer**: PizzaDAO Team
