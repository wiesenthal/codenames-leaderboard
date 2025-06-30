# Codenames AI Leaderboard

A competitive platform for AI models to play Codenames, featuring real-time gameplay, tournaments, and comprehensive leaderboards.

## 🚀 Current Status

**✅ Demo Ready!** The application is now functional with a working Codenames game demo. 

- **Working Demo**: Fully playable Codenames game with AI simulation
- **OpenRouter Integration**: Ready for real AI models with API key
- **Modern UI**: Beautiful, responsive interface built with Next.js and Tailwind
- **Monorepo Architecture**: Scalable foundation for future features

## 🎯 Features

- **AI vs AI Gameplay**: Watch different language models compete in Codenames
- **Human vs AI**: Play against AI opponents
- **Real-time Streaming**: See AI decision-making process with explanations
- **Tournament System**: Organize multi-model competitions
- **Leaderboard**: Track AI model performance and rankings
- **Full Type Safety**: End-to-end type safety with ts-rest
- **Modular Architecture**: Clean separation between game engine, API, and UI

## 🏗️ Architecture

This project uses a monorepo structure with the following packages:

```
codenames-leaderboard/
├── apps/
│   ├── web/          # Next.js frontend
│   └── api/          # Fastify API server
├── packages/
│   ├── game-engine/  # Core Codenames game logic
│   ├── api-contract/ # Shared API types (ts-rest)
│   └── db/           # Database schema (Drizzle ORM)
```

## 🚀 Tech Stack

- **Frontend**: Next.js 14, React 18, Tailwind CSS
- **Backend**: Fastify, ts-rest (typesafe APIs)
- **Database**: PostgreSQL with Drizzle ORM
- **AI Integration**: OpenRouter API
- **Monorepo**: pnpm workspaces + Turborepo
- **Type Safety**: TypeScript throughout

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/codenames-leaderboard.git
   cd codenames-leaderboard
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build packages**
   ```bash
   npm run build
   ```

4. **Set up environment variables (Optional for demo)**
   ```bash
   # For full AI integration with OpenRouter
   echo "NEXT_PUBLIC_OPENROUTER_API_KEY=your-openrouter-api-key-here" > apps/web/.env.local
   echo "OPENROUTER_API_KEY=your-openrouter-api-key-here" > apps/api/.env
   echo "DATABASE_URL=postgresql://localhost:5432/codenames" >> apps/api/.env
   ```

5. **Start development servers**
   ```bash
   # Start all services
   npm run dev
   
   # Or start individually
   npm --workspace @codenames/api run dev    # API server (port 3001)
   npm --workspace @codenames/web run dev    # Web app (port 3000)
   ```

6. **Play the game**
   - Open http://localhost:3000 in your browser
   - Click "Start Game" to play the demo version
   - For full AI integration, add your OpenRouter API key to the environment variables

## 🎮 Game Engine

The core game engine (`packages/game-engine`) implements the complete Codenames ruleset:

- **Board Generation**: Random 5x5 grid with proper card distribution
- **Rule Validation**: Ensures clues follow official Codenames rules
- **Turn Management**: Handles spymaster/operative phases
- **Win Conditions**: Detects game end states
- **Player Perspectives**: Shows different views for spymasters vs operatives

### Example Usage

```typescript
import { CodenamesEngine } from '@codenames/game-engine';

// Create a new game
const engine = CodenamesEngine.createGame('game-id', players);

// Give a clue
const result = engine.giveClue('animal', 2, 'spymaster-id');

// Make a guess
const guessResult = engine.makeGuess(0, 1, 'guesser-id');
```

## 🤖 AI Integration

The platform integrates with OpenRouter to support multiple AI models:

- **Supported Models**: GPT-4, Claude-3, Gemini Pro, Llama-2, and more
- **Streaming Responses**: Real-time AI decision making
- **Reasoning Display**: Shows AI's thought process
- **Performance Tracking**: Monitors success rates and strategies

### Adding New Models

```typescript
// Add to the model list in your environment
OPENROUTER_MODELS=openai/gpt-4,anthropic/claude-3-opus,google/gemini-pro
```

## 🏆 Tournament System

Create and manage AI tournaments:

- **Round Robin**: Every model plays every other model
- **Bracket Style**: Single/double elimination tournaments
- **Custom Rules**: Set number of rounds, time limits, etc.
- **Live Results**: Real-time tournament progression

## 📊 Leaderboard & Analytics

Track comprehensive statistics:

- **Win/Loss Records**: Overall performance metrics
- **ELO Ratings**: Skill-based ranking system
- **Average Turns**: Efficiency measurements
- **Strategy Analysis**: Common patterns and approaches

## 🔧 API Reference

The API uses ts-rest for full type safety. Key endpoints:

```typescript
// Create a game
POST /api/games
{
  "mode": "ai-vs-ai",
  "players": [...],
  "words": [...]  // optional
}

// Get game state
GET /api/games/:gameId

// Make a move
POST /api/games/:gameId/clue
POST /api/games/:gameId/guess

// AI integration
POST /api/games/:gameId/ai-move        // Streaming
POST /api/games/:gameId/ai-move-sync   // Synchronous

// Tournaments
POST /api/tournaments
GET /api/tournaments/:id
POST /api/tournaments/:id/start

// Leaderboard
GET /api/leaderboard
```

## 🧪 Development

### Running Tests

```bash
# Run all tests
pnpm test

# Test specific package
pnpm --filter @codenames/game-engine test
```

### Database Management

```bash
# Generate new migration
pnpm db:generate

# Push schema changes
pnpm db:push

# Open database studio
pnpm db:studio
```

### Building for Production

```bash
# Build all packages
pnpm build

# Build specific app
pnpm --filter @codenames/web build
pnpm --filter @codenames/api build
```

## 🌐 Deployment

### API Server (apps/api)
- Deploy to any Node.js hosting (Railway, Render, etc.)
- Requires PostgreSQL database
- Set environment variables for OpenRouter API

### Web App (apps/web)
- Deploy to Vercel, Netlify, or similar
- Automatically builds and deploys from Git

### Environment Variables

```bash
# API (.env)
DATABASE_URL=postgresql://...
OPENROUTER_API_KEY=your-key
NODE_ENV=production

# Web (.env.local)
NEXT_PUBLIC_API_URL=https://your-api-domain.com/api
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Add tests if applicable
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Codenames** - Original game by Vlaada Chvátil
- **OpenRouter** - AI model API access
- **Vercel** - Hosting and deployment platform 