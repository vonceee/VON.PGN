import { WorldChampionshipGame } from '../models/world-championship.model';
import { OPERA_GAME_DATA } from './wcc-games/opera-game.data';
import { WCC_2024_GAMES } from './wcc-games/wcc-2024.data';
import { WCC_2023_GAMES } from './wcc-games/wcc-2023.data';
import { WCC_1972_GAMES } from './wcc-games/wcc-1972.data';

export * from './wcc-games/opera-game.data';
export * from './wcc-games/wcc-2024.data';
export * from './wcc-games/wcc-2023.data';
export * from './wcc-games/wcc-1972.data';

/**
 * Registry of featured annotated World Championship games.
 * Modularized across match files for code clarity and effortless authoring.
 */
export const FEATURED_WCC_GAMES: Record<string, WorldChampionshipGame[]> = {
  'opera-game': OPERA_GAME_DATA,
  'wcc-2024': WCC_2024_GAMES,
  'wcc-2023': WCC_2023_GAMES,
  'wcc-1972': WCC_1972_GAMES,
};
