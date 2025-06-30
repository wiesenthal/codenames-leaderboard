# Codenames Leaderboard

A web interface for LLMs to play Codenames with leaderboard tracking.

## Features

- **Human vs Human**: Classic Codenames gameplay in the browser
- **Game State Management**: Complete game engine with move validation
- **Real-time Updates**: Live game state synchronization
- **Leaderboard Ready**: Database schema for tracking game results and player stats
- **Extensible**: Designed to support multiple game types and AI integration

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL database
- `.env` file with database configuration

### Installation

```bash
npm install
```

### Database Setup

```bash
# Start the database (using provided script)
./start-database.sh

# Push the schema
npm run db:push
```

### Development

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to start playing!

## How to Play

### Creating a Game

1. Go to the homepage
2. Enter names for 4 players (Red Spymaster, Red Operative, Blue Spymaster, Blue Operative)
3. Click "Start Game"
4. Share the generated player links with each participant

### Gameplay

**Spymasters:**
- See all card colors on the 5x5 grid
- Give one-word clues with a number (e.g., "animal: 2")
- Help your team find your agents (red/blue cards)
- Avoid the assassin (black card) at all costs!

**Operatives:**
- Listen to your spymaster's clues
- Click cards to make guesses
- Correctly guessed cards reveal their true colors
- Pass your turn when unsure

### Winning

- First team to find all their agents wins
- Game ends immediately if a team hits the assassin (they lose)

## Game Engine

The core game engine (`src/lib/codenames/game-engine.ts`) handles:

- **Game Setup**: Random word selection, team assignment, key card generation
- **Move Validation**: Ensures clues and guesses follow Codenames rules
- **State Management**: Tracks turns, scores, and game history
- **Win Conditions**: Detects game end states

### Key Components

- `CodenamesGameEngine`: Main game logic class
- `GameState`: Complete game state interface
- `Card`, `Player`, `Clue`, `Guess`: Core game entities
- tRPC API: Server-side game operations

## Architecture

```
src/
  app/                    # Next.js pages
    page.tsx             # Homepage with game creation
    game/[id]/page.tsx   # Game interface
  lib/codenames/         # Game engine
    types.ts             # TypeScript interfaces
    game-engine.ts       # Core game logic
  server/
    api/routers/game.ts  # tRPC game API
    db/schema.ts         # Database schema
  data/
    words.txt            # Codenames word list
```

## Planned Features

- [ ] AI player integration with OpenRouter
- [ ] Tournament system
- [ ] ELO rating system
- [ ] Game replay and analysis
- [ ] Support for other games (Wavelength, Just One, etc.)
- [ ] Websocket support for real-time gameplay

## Database Schema

The app includes tables for:
- `games`: Game state and metadata
- `players`: Human and AI players
- `game_participants`: Player-game relationships
- `game_actions`: Move history
- `player_stats`: Performance tracking
- `tournaments`: Competition organization

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details
