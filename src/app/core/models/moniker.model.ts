/**
 * Represents a chess player's moniker (nickname / epithet) record.
 */
export interface PlayerMoniker {
  id: string;
  moniker: string;          // Famous moniker/nickname, e.g. "The Magician from Riga"
  playerName: string;       // Full player name, e.g. "Mikhail Tal"
  fideTitle: string;        // Title or achievement, e.g. "8th World Champion"
  years: string;            // Active years / birth-death, e.g. "1936 – 1992"
  imageUrl: string;         // Portrait picture of the player
  shortDescription: string; // Concise summary of why they earned this moniker
  blogSlug: string;         // Slug to the linked blog article
  category: 'World Champions' | 'Tactical Masters' | 'Positional Legends' | 'Modern Super GMs' | 'Historical Icons';
  tags: string[];
  featured?: boolean;
}
