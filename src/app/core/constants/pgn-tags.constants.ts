/**
 * @fileoverview PGN tag definitions, display labels, and presentation helpers matching Lichess conventions.
 */

export const CANONICAL_PGN_TAGS: readonly string[] = [
  // 1. Seven Tag Roster (STR)
  'Event',
  'Site',
  'Date',
  'Round',
  'White',
  'Black',
  'Result',
  // 2. Player Attributes
  'WhiteElo',
  'BlackElo',
  'WhiteTitle',
  'BlackTitle',
  'WhiteTeam',
  'BlackTeam',
  'WhiteFideId',
  'BlackFideId',
  // 3. Game Conditions & Metadata
  'TimeControl',
  'Termination',
  'ECO',
  'Board',
  'Annotator',
  'GameId',
  // 4. Setup & Variant
  'SetUp',
  'FEN',
  'Variant',
] as const;

export const PGN_TAG_LABELS: Record<string, string> = {
  Event: 'Event',
  Site: 'Site',
  Date: 'Date',
  Round: 'Round',
  White: 'White',
  Black: 'Black',
  Result: 'Result',
  WhiteElo: 'White Elo',
  BlackElo: 'Black Elo',
  WhiteTitle: 'White Title',
  BlackTitle: 'Black Title',
  WhiteTeam: 'White Team',
  BlackTeam: 'Black Team',
  WhiteFideId: 'White FIDE ID',
  BlackFideId: 'Black FIDE ID',
  TimeControl: 'Time Control',
  Termination: 'Termination',
  ECO: 'ECO',
  Board: 'Board',
  Annotator: 'Annotator',
  GameId: 'Game ID',
  SetUp: 'Set Up',
  FEN: 'FEN',
  Variant: 'Variant',
  StudyLink: 'Study Link',
  StudyName: 'Study Name',
  ChapterName: 'Chapter Name',
};

/**
 * Tags that are displayed in the dedicated player header card or internal state
 * and should not be duplicated in the metadata tags table.
 */
export const EXCLUDED_SIDEBAR_TAGS = new Set<string>([
  'White',
  'Black',
  'WhiteElo',
  'BlackElo',
  'WhiteTitle',
  'BlackTitle',
  '_shapes',
  'SetUp',
  'FEN',
]);

const CANONICAL_TAG_MAP = new Map<string, string>();
for (const tag of CANONICAL_PGN_TAGS) {
  CANONICAL_TAG_MAP.set(tag.toLowerCase(), tag);
}
CANONICAL_TAG_MAP.set('ecocode', 'ECO');
CANONICAL_TAG_MAP.set('tournament', 'Event');
CANONICAL_TAG_MAP.set('time_control', 'TimeControl');

/**
 * Returns canonical casing for a PGN tag key, or original if not recognized.
 */
export function normalizeTagKey(key: string): string {
  const trimmed = key.trim();
  const canonical = CANONICAL_TAG_MAP.get(trimmed.toLowerCase());
  return canonical || trimmed;
}

/**
 * Filters and sanitizes a tag value like Lichess:
 * - Discards placeholder / unknown values: '', '?', 'unknown'
 * - Trims whitespace
 * - Truncates to max 140 characters
 */
export function cleanTagValue(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const str = String(value).trim();
  if (str === '' || str === '?' || str.toLowerCase() === 'unknown') {
    return null;
  }
  return str.slice(0, 140);
}

/**
 * Returns the sorting rank for a tag key.
 * Canonical tags receive rank 0..N, custom tags receive 9999.
 */
export function getTagRank(key: string): number {
  const canonical = normalizeTagKey(key);
  const index = CANONICAL_PGN_TAGS.indexOf(canonical);
  return index !== -1 ? index : 9999;
}

/**
 * Comparator to sort PGN tag keys in canonical Lichess order.
 */
export function comparePgnTags(aKey: string, bKey: string): number {
  const rankA = getTagRank(aKey);
  const rankB = getTagRank(bKey);
  if (rankA !== rankB) return rankA - rankB;
  return aKey.localeCompare(bKey);
}

/**
 * Cleans, normalizes, and canonically sorts a dictionary of PGN headers.
 */
export function sanitizePgnHeaders(headers: Record<string, string | undefined>): Record<string, string> {
  const cleaned: Record<string, string> = {};

  const entries: [string, string][] = [];
  for (const [rawKey, rawValue] of Object.entries(headers)) {
    const key = normalizeTagKey(rawKey);
    const value = cleanTagValue(rawValue);
    if (value !== null) {
      entries.push([key, value]);
    }
  }

  // Sort canonical entries first, then alphabetical for custom tags
  entries.sort(([keyA], [keyB]) => comparePgnTags(keyA, keyB));

  for (const [key, value] of entries) {
    cleaned[key] = value;
  }

  return cleaned;
}

/**
 * Returns a human-readable display label for a PGN tag key.
 */
export function formatTagLabel(key: string): string {
  if (PGN_TAG_LABELS[key]) {
    return PGN_TAG_LABELS[key];
  }
  return key
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .trim();
}
