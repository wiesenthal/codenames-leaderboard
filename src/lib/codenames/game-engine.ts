import type { GameState, GameConfig, Card, CardType, Team, Clue, Guess, GameAction, Player, GamePhase } from './types';
import { readFileSync } from 'fs';
import path from 'path';

export class CodenamesGameEngine {
  private state: GameState;

  constructor(config: GameConfig) {
    this.state = this.initializeGame(config);
  }

  private initializeGame(config: GameConfig): GameState {
    // Select 25 random words
    const shuffledWords = [...config.words].sort(() => Math.random() - 0.5);
    const gameWords = shuffledWords.slice(0, 25);

    // Generate the key card - determine team assignments
    const startingTeam: Team = Math.random() < 0.5 ? 'red' : 'blue';
    const { cards, redCount, blueCount } = this.generateKeyCard(gameWords, startingTeam);

    // Create players with IDs
    const players: Player[] = config.players.map((player, index) => ({
      ...player,
      id: `player-${index + 1}`,
    }));

    return {
      id: `game-${Date.now()}`,
      cards,
      players,
      currentTeam: startingTeam,
      currentPhase: 'giving-clue',
      currentClue: null,
      remainingGuesses: 0,
      winner: null,
      startingTeam,
      redAgentsRemaining: redCount,
      blueAgentsRemaining: blueCount,
      gameHistory: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  private generateKeyCard(words: string[], startingTeam: Team): { cards: Card[], redCount: number, blueCount: number } {
    const cards: Card[] = [];
    const positions = Array.from({ length: 25 }, (_, i) => i);
    
    // Shuffle positions
    positions.sort(() => Math.random() - 0.5);
    
    // Starting team gets 9 agents, other team gets 8
    const redCount = startingTeam === 'red' ? 9 : 8;
    const blueCount = startingTeam === 'blue' ? 9 : 8;
    
    // Assign card types
    const cardTypes: CardType[] = [
      ...Array(redCount).fill('red') as CardType[],
      ...Array(blueCount).fill('blue') as CardType[],
      ...Array(7).fill('neutral') as CardType[], // 7 neutral cards
      'assassin' as CardType // 1 assassin
    ];
    
    // Shuffle card types
    cardTypes.sort(() => Math.random() - 0.5);
    
    // Create cards
    for (let i = 0; i < 25; i++) {
      cards.push({
        word: words[i]!,
        type: cardTypes[i]!,
        revealed: false,
        position: i,
      });
    }
    
    return { cards, redCount, blueCount };
  }

  public getState(): GameState {
    return { ...this.state };
  }

  public getPublicState(playerId: string): Partial<GameState> {
    const player = this.state.players.find(p => p.id === playerId);
    const isSpymaster = player?.role === 'spymaster';
    
    return {
      id: this.state.id,
      cards: this.state.cards.map(card => ({
        ...card,
        // Only spymasters can see unrevealed card types
        type: card.revealed || isSpymaster ? card.type : 'neutral' as CardType,
      })),
      players: this.state.players,
      currentTeam: this.state.currentTeam,
      currentPhase: this.state.currentPhase,
      currentClue: this.state.currentClue,
      remainingGuesses: this.state.remainingGuesses,
      winner: this.state.winner,
      redAgentsRemaining: this.state.redAgentsRemaining,
      blueAgentsRemaining: this.state.blueAgentsRemaining,
      gameHistory: this.state.gameHistory,
    };
  }

  public giveClue(playerId: string, word: string, count: number): { success: boolean; error?: string } {
    const player = this.state.players.find(p => p.id === playerId);
    
    if (!player) {
      return { success: false, error: 'Player not found' };
    }
    
    if (player.role !== 'spymaster') {
      return { success: false, error: 'Only spymasters can give clues' };
    }
    
    if (player.team !== this.state.currentTeam) {
      return { success: false, error: 'Not your turn' };
    }
    
    if (this.state.currentPhase !== 'giving-clue') {
      return { success: false, error: 'Not in clue-giving phase' };
    }
    
    const clueValidation = this.validateClue(word, count);
    if (!clueValidation.valid) {
      return { success: false, error: clueValidation.error };
    }
    
    const clue: Clue = {
      word: word.toLowerCase(),
      count,
      team: player.team,
      spymasterId: playerId,
    };
    
    const action: GameAction = {
      type: 'clue',
      timestamp: new Date(),
      playerId,
      team: player.team,
      data: clue,
    };
    
    this.state.currentClue = clue;
    this.state.currentPhase = 'guessing';
    this.state.remainingGuesses = count + 1; // Players get one extra guess
    this.state.gameHistory.push(action);
    this.state.updatedAt = new Date();
    
    return { success: true };
  }

  public makeGuess(playerId: string, cardIndex: number): { success: boolean; error?: string; gameOver?: boolean } {
    const player = this.state.players.find(p => p.id === playerId);
    
    if (!player) {
      return { success: false, error: 'Player not found' };
    }
    
    if (player.role !== 'operative') {
      return { success: false, error: 'Only operatives can make guesses' };
    }
    
    if (player.team !== this.state.currentTeam) {
      return { success: false, error: 'Not your turn' };
    }
    
    if (this.state.currentPhase !== 'guessing') {
      return { success: false, error: 'Not in guessing phase' };
    }
    
    if (cardIndex < 0 || cardIndex >= 25) {
      return { success: false, error: 'Invalid card index' };
    }
    
    const card = this.state.cards[cardIndex];
    if (!card) {
      return { success: false, error: 'Card not found' };
    }
    if (card.revealed) {
      return { success: false, error: 'Card already revealed' };
    }
    
    // Reveal the card
    card.revealed = true;
    
    const guess: Guess = {
      cardIndex,
      playerId,
      team: player.team,
    };
    
    const action: GameAction = {
      type: 'guess',
      timestamp: new Date(),
      playerId,
      team: player.team,
      data: guess,
    };
    
    this.state.gameHistory.push(action);
    this.state.updatedAt = new Date();
    
    // Check what type of card was revealed
    const result = this.processGuess(card, player.team);
    
    return result;
  }

  private processGuess(card: Card, guessingTeam: Team): { success: boolean; gameOver?: boolean; error?: string } {
    if (card.type === 'assassin') {
      // Game over - guessing team loses
      this.state.winner = guessingTeam === 'red' ? 'blue' : 'red';
      this.state.currentPhase = 'game-over';
      return { success: true, gameOver: true };
    }
    
    if (card.type === guessingTeam) {
      // Correct guess - update remaining agents and continue guessing
      if (guessingTeam === 'red') {
        this.state.redAgentsRemaining--;
      } else {
        this.state.blueAgentsRemaining--;
      }
      
      // Check for win condition
      if (this.state.redAgentsRemaining === 0) {
        this.state.winner = 'red';
        this.state.currentPhase = 'game-over';
        return { success: true, gameOver: true };
      }
      
      if (this.state.blueAgentsRemaining === 0) {
        this.state.winner = 'blue';
        this.state.currentPhase = 'game-over';
        return { success: true, gameOver: true };
      }
      
      // Continue guessing
      this.state.remainingGuesses--;
      if (this.state.remainingGuesses <= 0) {
        this.endTurn();
      }
      
      return { success: true };
    }
    
    // Wrong guess (neutral or enemy agent) - end turn
    if (card.type !== 'neutral' && card.type !== guessingTeam) {
      // Enemy agent - update their count
      if (card.type === 'red') {
        this.state.redAgentsRemaining--;
      } else if (card.type === 'blue') {
        this.state.blueAgentsRemaining--;
      }
      
      // Check for win condition
      if (this.state.redAgentsRemaining === 0) {
        this.state.winner = 'red';
        this.state.currentPhase = 'game-over';
        return { success: true, gameOver: true };
      }
      
      if (this.state.blueAgentsRemaining === 0) {
        this.state.winner = 'blue';
        this.state.currentPhase = 'game-over';
        return { success: true, gameOver: true };
      }
    }
    
    this.endTurn();
    return { success: true };
  }

  public passTurn(playerId: string): { success: boolean; error?: string } {
    const player = this.state.players.find(p => p.id === playerId);
    
    if (!player) {
      return { success: false, error: 'Player not found' };
    }
    
    if (player.team !== this.state.currentTeam) {
      return { success: false, error: 'Not your turn' };
    }
    
    if (this.state.currentPhase !== 'guessing') {
      return { success: false, error: 'Can only pass during guessing phase' };
    }
    
    const action: GameAction = {
      type: 'pass',
      timestamp: new Date(),
      playerId,
      team: player.team,
      data: {},
    };
    
    this.state.gameHistory.push(action);
    this.endTurn();
    
    return { success: true };
  }

  private endTurn(): void {
    this.state.currentTeam = this.state.currentTeam === 'red' ? 'blue' : 'red';
    this.state.currentPhase = 'giving-clue';
    this.state.currentClue = null;
    this.state.remainingGuesses = 0;
    this.state.updatedAt = new Date();
  }

  private validateClue(word: string, count: number): { valid: boolean; error?: string } {
    // Basic validation
    if (!word || word.trim().length === 0) {
      return { valid: false, error: 'Clue word cannot be empty' };
    }
    
    if (count < 0 || count > 9) {
      return { valid: false, error: 'Count must be between 0 and 9' };
    }
    
    const normalizedClue = word.toLowerCase().trim();
    
    // Check if clue matches any visible word
    const visibleWords = this.state.cards
      .filter(card => !card.revealed)
      .map(card => card.word.toLowerCase());
      
    if (visibleWords.includes(normalizedClue)) {
      return { valid: false, error: 'Clue cannot be the same as a visible word' };
    }
    
    // TODO: Add more sophisticated validation (compound words, etc.)
    
    return { valid: true };
  }

  public static loadWords(): string[] {
    try {
      const wordsPath = path.join(process.cwd(), 'data', 'words.txt');
      const wordsContent = readFileSync(wordsPath, 'utf-8');
      return wordsContent.trim().split('\n').map(word => word.trim()).filter(word => word.length > 0);
    } catch (error) {
      console.error('Error loading words:', error);
      // Fallback words if file can't be loaded
      return [
        'APPLE', 'BANANA', 'CHERRY', 'DOG', 'ELEPHANT', 'FIRE', 'GUITAR', 'HOUSE',
        'ICE', 'JUNGLE', 'KING', 'LION', 'MOON', 'NIGHT', 'OCEAN', 'PIANO',
        'QUEEN', 'ROBOT', 'STAR', 'TREE', 'UMBRELLA', 'VIOLIN', 'WATER', 'XRAY', 'YELLOW'
      ];
    }
  }
} 