import { Blog } from '../services/blog.service';

/**
 * Curated, hardcoded blog articles and PGN games for all chess player monikers.
 */
export const MONIKER_BLOGS_DATA: Record<string, Blog> = {
  'the-magician-from-riga-mikhail-tal': {
    id: 1001,
    user_id: 1,
    title: 'The Magician from Riga: Mikhail Tal’s Hypnotic Sacrifices',
    slug: 'the-magician-from-riga-mikhail-tal',
    summary: 'Discover how Mikhail Tal stunned the chess world in 1960 to become the 8th World Champion through audacious piece sacrifices and psychological warfare.',
    status: 'published',
    published_at: '2026-05-10T10:00:00Z',
    created_at: '2026-05-10T10:00:00Z',
    updated_at: '2026-05-10T10:00:00Z',
    author: {
      id: 1,
      name: 'Vonchess',
      bio: 'Historical chess research & player chronicle archives.',
    },
    cover_image: 'assets/player-profiles/mikhail-tal.webp',
    content: `Mikhail Tal was not merely a grandmaster; he was a hurricane of creative energy. Known universally as **"The Magician from Riga"**, Tal possessed an unmatched talent for creating wild, chaotic complications that defied engine calculation.

### The Philosophy of the Forest
Tal famously described his aggressive psychological style:

> *"You must take your opponent into a deep dark forest where 2+2=5, and the path leading out is only wide enough for one."*

While classic chess grandmasters sought harmony and structural perfection, Tal sought maximum tension. He would willingly sacrifice knights, bishops, or rooks not for guaranteed checkmates, but for initiative and psychological intimidation.

### The 1960 World Championship Victory
At just 23 years old, Tal challenged the formidable Mikhail Botvinnik in Moscow. Botvinnik, known as the patriarch of Soviet chess, was a methodical strategist. However, Tal's unrelenting attacks threw Botvinnik off balance, securing Tal the World Championship title.

Below is one of Mikhail Tal's legendary games showcasing his dynamic attacking style:

[game:0]

### Legacy of the Magician
Tal's health problems hampered his later career, but his games remain among the most beloved in chess history. He taught generations of players that chess is not just a scientific calculation—it is an art form driven by passion and courage.`,
    games: [
      {
        id: 1,
        title: 'Mikhail Tal vs. Mikhail Botvinnik (World Championship 1960, Game 6)',
        pgn: `[Event "World Championship Match"]
[Site "Moscow URS"]
[Date "1960.03.26"]
[Round "6"]
[Result "1-0"]
[White "Mikhail Tal"]
[Black "Mikhail Botvinnik"]
[ECO "C99"]

1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 6. Re1 b5 7. Bb3 d6 8. c3 O-O 9. h3 Na5 10. Bc2 c5 11. d4 Qc7 12. Nbd2 Bb7 13. Nf1 cxd4 14. cxd4 Rac8 15. Bd3 Nc6 16. d5 Nb4 17. Bg5 Nbxd5 18. exd5 e4 19. Bxf6 Bxf6 20. Bxe4 Bxb2 21. Rb1 Bf6 22. Ng3 g6 23. Qd2 Qd8 24. Qh6 Bg7 25. Qf4 Qf6 26. Qd2 Qc3 27. Qf4 Qf6 28. Qd2 Qc3 29. Qe2 Qa3 30. Rbd1 Rc4 31. h4 Bc8 32. h5 Bg4 33. hxg6 hxg6 34. Rd3 Qc5 35. Re3 f5 36. Bxf5 gxf5 37. Re7 Qxd5 38. Qe3 f4 39. Qa7 Bb2 40. Ne4 Bf5 41. Nfd2 Rd4 42. Qc7 Rxd2 43. Nxd2 Qxd2 44. R1e2 Qd1+ 45. Re1 Qd5 46. Re8 Bg7 47. R1e7 Qd1+ 48. Re1 Qd5 49. R8e7 Qd4 50. Qc6 f3 51. Qxf3 Bg6 52. Qg3 Bf7 53. R1e4 Qa1+ 54. Kh2 d5 55. Rg4 Qf6 56. Ra7 Re8 57. Rf4 Qh6+ 58. Rh4 Qf6 59. Rf4 Qh6+ 60. Rh4 1-0`,
        order: 0,
      },
    ],
  },

  'the-beast-from-baku-garry-kasparov': {
    id: 1002,
    user_id: 1,
    title: 'The Beast from Baku: Garry Kasparov’s Relentless Dominance',
    slug: 'the-beast-from-baku-garry-kasparov',
    summary: 'How Garry Kasparov combined ferocious opening preparation, tactical fury, and mental dominance to rule international chess for over two decades.',
    status: 'published',
    published_at: '2026-05-11T10:00:00Z',
    created_at: '2026-05-11T10:00:00Z',
    updated_at: '2026-05-11T10:00:00Z',
    author: {
      id: 1,
      name: 'Vonchess',
      bio: 'Historical chess research & player chronicle archives.',
    },
    cover_image: 'assets/player-profiles/garry-kasparov.webp',
    content: `Garry Kasparov earned the nickname **"The Beast from Baku"** for his ferocious presence at the chessboard. Opponents described sitting across from Kasparov as feeling like a tidal wave of pressure crashing down move after move.

### Unmatched Preparation and Energy
Kasparov revolutionized chess opening theory through early adoption of computer database analysis and deep home preparation. Opponents frequently found themselves out-prepared before move 15.

His legendary five World Championship encounters against Anatoly Karpov during the 1980s represent the longest rivalry in sports history.

### Kasparov’s Immortal Game
In 1999 at Wijk aan Zee, Kasparov produced what many consider his greatest game of all time against Veselin Topalov, featuring a brilliant double rook sacrifice:

[game:0]

### A Legacy Untouched
Retiring from professional competitive chess in 2005 as the highest-rated player in the world, Kasparov left behind a benchmark of dominance and analytical rigor that defined modern grandmaster preparation.`,
    games: [
      {
        id: 1,
        title: 'Garry Kasparov vs. Veselin Topalov (Wijk aan Zee 1999)',
        pgn: `[Event "Hoogovens Group A"]
[Site "Wijk aan Zee NED"]
[Date "1999.01.20"]
[Round "4"]
[Result "1-0"]
[White "Garry Kasparov"]
[Black "Veselin Topalov"]
[ECO "B07"]

1. e4 d6 2. d4 Nf6 3. Nc3 g6 4. Be3 Bg7 5. Qd2 c6 6. f3 b5 7. Nge2 Nbd7 8. Bh6 Bxh6 9. Qxh6 Bb7 10. a3 e5 11. O-O-O Qe7 12. Kb1 a6 13. Nc1 O-O-O 14. Nb3 exd4 15. Rxd4 c5 16. Rd1 Nb6 17. g3 Kb8 18. Na5 Ba8 19. Bh3 d5 20. Qf4+ Ka7 21. Rhe1 d4 22. Nd5 Nbxd5 23. exd5 Qd6 24. Rxd4 cxd4 25. Re7+ Kb6 26. Qxd4+ Kxa5 27. b4+ Ka4 28. Qc3 Qxd5 29. Ra7 Bb7 30. Rxb7 Qc4 31. Qxf6 Kxa3 32. Qxa6+ Kxb4 33. c3+ Kxc3 34. Qa1+ Kd2 35. Qb2+ Kd1 36. Bf1 Rd2 37. Rd7 Rxd7 38. Bxc4 bxc4 39. Qxh8 Rd3 40. Qa8 c3 41. Qa4+ Ke1 42. f4 f5 43. Kc1 Rd2 44. Qa7 1-0`,
        order: 0,
      },
    ],
  },

  'the-mozart-of-chess-magnus-carlsen': {
    id: 1003,
    user_id: 1,
    title: 'The Mozart of Chess: Magnus Carlsen’s Universal Endgame Genius',
    slug: 'the-mozart-of-chess-magnus-carlsen',
    summary: 'An in-depth look at Magnus Carlsen’s journey from child prodigy to peak 2882 rating and 5-time World Champion.',
    status: 'published',
    published_at: '2026-05-12T10:00:00Z',
    created_at: '2026-05-12T10:00:00Z',
    updated_at: '2026-05-12T10:00:00Z',
    author: {
      id: 1,
      name: 'Vonchess',
      bio: 'Historical chess research & player chronicle archives.',
    },
    cover_image: 'assets/player-profiles/magnus-carlsen.webp',
    content: `When Magnus Carlsen became a Grandmaster at age 13, The Washington Post dubbed him **"The Mozart of Chess"** for his natural, effortless understanding of complex positions.

### Grinding Out Equal Endgames
Unlike tactical specialists who rely on sudden tactical strikes, Carlsen's superpower is his ability to create winning chances out of completely dead-equal positions. He grinds down world-class opponents over 80+ moves through sheer stamina and technical perfection.

In 2014, Carlsen achieved an all-time peak FIDE rating of **2882**, the highest standard rating in human history.

[game:0]

### The Supreme Universalist
Carlsen's flexibility in opening choices and total lack of clear weaknesses make him one of the most complete grandmasters to ever play the game.`,
    games: [
      {
        id: 1,
        title: 'Magnus Carlsen vs. Viswanathan Anand (World Championship 2013, Game 9)',
        pgn: `[Event "World Championship Match"]
[Site "Chennai IND"]
[Date "2013.11.21"]
[Round "9"]
[Result "1-0"]
[White "Magnus Carlsen"]
[Black "Viswanathan Anand"]
[ECO "E25"]

1. d4 Nf6 2. c4 e6 3. Nc3 Bb4 4. f3 d5 5. a3 Bxc3+ 6. bxc3 c5 7. cxd5 exd5 8. e3 c4 9. Ne2 Nc6 10. g4 O-O 11. Bg2 Na5 12. O-O Nb3 13. Ra2 b5 14. Ng3 a5 15. g5 Ne8 16. e4 Nxc1 17. Qxc1 Ra6 18. e5 Nc7 19. f4 b4 20. axb4 axb4 21. Rxa6 Nxa6 22. f5 b3 23. Qf4 Nc7 24. f6 g6 25. Qh4 Ne8 26. Qh6 b2 27. Rf4 b1=Q+ 28. Nf1 Qe1 29. Rh4 Qxh4 30. Qxh4 Qa5 31. Qg3 Nc7 32. Qh4 Ne8 33. Qe1 Bf5 34. Ne3 Bd3 35. Bxd5 Nc7 36. Bc6 Ne6 37. Nd5 Nxd4 38. Ne7+ Kh8 39. Qh4 Qa1+ 40. Kf2 Qf1+ 1-0`,
        order: 0,
      },
    ],
  },

  'the-iron-tigran-petrosian': {
    id: 1004,
    user_id: 1,
    title: 'The Iron Tigran: Prophylaxis and the Art of Impenetrable Defense',
    slug: 'the-iron-tigran-petrosian',
    summary: 'How Tigran Petrosian revolutionized defensive chess strategy using exchange sacrifices and deep prophylactic thinking.',
    status: 'published',
    published_at: '2026-05-13T10:00:00Z',
    created_at: '2026-05-13T10:00:00Z',
    updated_at: '2026-05-13T10:00:00Z',
    author: {
      id: 1,
      name: 'Vonchess',
      bio: 'Historical chess research & player chronicle archives.',
    },
    cover_image: 'assets/player-profiles/tigran-petrosian.webp',
    content: `Tigran Petrosian earned the moniker **"The Iron Tigran"** because attacking him was like trying to punch a brick wall. He was the 9th World Chess Champion and the pioneer of prophylactic chess thinking.

### Prophylaxis: Stopping Threats Before They Form
While most grandmasters plan their own attacks, Petrosian asked first: *"What does my opponent want to do?"* He would disarm enemy tactical ideas three to four moves before they could even materialize.

Petrosian also popularized the **positional exchange sacrifice**—giving up a rook for a knight or bishop to permanently restrict the opponent's counterplay.

[game:0]

### Defensive Masterclass
Petrosian proved to the world that defense is an active art form, laying the groundwork for modern positional theory.`,
    games: [
      {
        id: 1,
        title: 'Tigran Petrosian vs. Boris Spassky (World Championship 1966, Game 10)',
        pgn: `[Event "World Championship Match"]
[Site "Moscow URS"]
[Date "1966.05.02"]
[Round "10"]
[Result "1-0"]
[White "Tigran Petrosian"]
[Black "Boris Spassky"]
[ECO "A04"]

1. Nf3 Nf6 2. g3 g6 3. c4 Bg7 4. Bg2 O-O 5. O-O Nc6 6. Nc3 d6 7. d3 e5 8. Rb1 a5 9. a3 h6 10. b4 axb4 11. axb4 Be6 12. b5 Ne7 13. Bb2 Qd7 14. Qc2 Bh3 15. Ra1 Bxg2 16. Kxg2 Nh5 17. e4 f5 18. Qe2 f4 19. Nd2 Rf7 20. Rxa8+ Kh7 21. Rf1 Bf6 22. Nd5 Bg5 23. Nxe7 Qxe7 24. Nf3 Qf6 25. g4 Ng7 26. h3 Ne6 27. Rh1 Bh4 28. b6 c6 29. Rc8 c5 30. Ra1 1-0`,
        order: 0,
      },
    ],
  },

  'the-chess-machine-capablanca': {
    id: 1005,
    user_id: 1,
    title: 'The Chess Machine: José Raúl Capablanca’s Flawless Elegance',
    slug: 'the-chess-machine-capablanca',
    summary: 'The story of 3rd World Champion Capablanca, who played chess with effortless intuition and went 8 years undefeated.',
    status: 'published',
    published_at: '2026-05-14T10:00:00Z',
    created_at: '2026-05-14T10:00:00Z',
    updated_at: '2026-05-14T10:00:00Z',
    author: {
      id: 1,
      name: 'Vonchess',
      bio: 'Historical chess research & player chronicle archives.',
    },
    cover_image: 'assets/player-profiles/jose-raul-capablanca.webp',
    content: `Cuban grandmaster José Raúl Capablanca was hailed as **"The Chess Machine"** because he rarely spent time calculating long variations. Instead, he saw the correct positional move almost instantaneously.

### 8 Years Without a Loss
From 1916 to 1924, Capablanca did not lose a single tournament or match game—a streak of 63 consecutive top-level games without defeat.

His endgames are studied by players around the world as masterclasses in simplicity, harmony, and pawn structure control.

[game:0]

### Natural Master
Capablanca proved that chess at its highest level could look elegant, clean, and effortless.`,
    games: [
      {
        id: 1,
        title: 'José Raúl Capablanca vs. Emanuel Lasker (World Championship 1921, Game 10)',
        pgn: `[Event "World Championship Match"]
[Site "Havana CUB"]
[Date "1921.04.08"]
[Round "10"]
[Result "1-0"]
[White "Jose Raul Capablanca"]
[Black "Emanuel Lasker"]
[ECO "D63"]

1. d4 d5 2. Nf3 Nf6 3. c4 e6 4. Bg5 Be7 5. e3 O-O 6. Nc3 Nbd7 7. Rc1 b6 8. cxd5 exd5 9. Qa4 c5 10. Qc6 Rb8 11. Nxd5 Bb7 12. Nxe7+ Qxe7 13. Qa4 Rbc8 14. Qa3 Qe6 15. Bxf6 Qxf6 16. Be2 cxd4 17. Nxd4 Rxc1+ 18. Bd1 Nc5 19. O-O Qg6 20. f3 Re8 21. b4 Ne6 22. Qxc1 Nxd4 23. exd4 Qd6 24. Qc3 Rd8 25. Re1 g6 26. Bb3 Qxd4+ 27. Qxd4 Rxd4 28. Re7 Bd5 29. Rd7 Bxb3 30. Rxd4 Bxa2 31. Rd8+ Kg7 32. Ra8 Bc4 33. Rxa7 b5 34. Kf2 Kf6 35. Ke3 Ke5 36. f4+ Kd6 37. Kd4 h5 38. g3 Ke6 39. Rc7 Bf1 40. Rc5 Be2 41. Re5+ 1-0`,
        order: 0,
      },
    ],
  },

  'the-boa-constrictor-anatoly-karpov': {
    id: 1006,
    user_id: 1,
    title: 'The Boa Constrictor: Anatoly Karpov’s Suffocating Control',
    slug: 'the-boa-constrictor-anatoly-karpov',
    summary: 'How Anatoly Karpov mastered positional restriction to squeeze victory from the smallest advantages.',
    status: 'published',
    published_at: '2026-05-15T10:00:00Z',
    created_at: '2026-05-15T10:00:00Z',
    updated_at: '2026-05-15T10:00:00Z',
    author: {
      id: 1,
      name: 'Vonchess',
      bio: 'Historical chess research & player chronicle archives.',
    },
    cover_image: 'assets/player-profiles/anatoly-karpov.webp',
    content: `Anatoly Karpov, the 12th World Champion, was nicknamed **"The Boa Constrictor"**. His style was not about explosive checkmates; it was about taking away every square, file, and active diagonal until his opponent had no valid moves left.

### Squeezing Opponents
Karpov described his ideal game as one where the opponent gets no counterplay at all. Grandmasters playing against Karpov often felt paralyzed, unable to execute any active plans.

[game:0]

### Tournament Record Legend
Karpov won over 160 international tournaments, cementing his status as one of history's most successful grandmasters.`,
    games: [
      {
        id: 1,
        title: 'Anatoly Karpov vs. Garry Kasparov (World Championship 1985, Game 4)',
        pgn: `[Event "World Championship Match"]
[Site "Moscow URS"]
[Date "1985.09.12"]
[Round "4"]
[Result "1-0"]
[White "Anatoly Karpov"]
[Black "Garry Kasparov"]
[ECO "QGD"]

1. d4 d5 2. c4 e6 3. Nc3 Be7 4. cxd5 exd5 5. Bf4 c6 6. Qc2 g6 7. e3 Bf5 8. Qd2 Nd7 9. f3 Nb6 10. e4 Be6 11. e5 h5 12. Bd3 Qd7 13. b3 Bf5 14. Nge2 Bxd3 15. Qxd3 Nh6 16. O-O Nf5 17. Nd1 a5 18. Ne3 Nxe3 19. Bxe3 a4 20. h3 Qe6 21. g4 hxg4 22. hxg4 Kd7 23. Kg2 axb3 24. axb3 Rxa1 25. Rxa1 Kc7 26. Bd2 Ra8 27. Rxa8 Nxa8 28. Kg3 Qc8 29. f4 Qh8 30. Kg2 Qh4 31. Qg3 Qxg3+ 32. Kxg3 Kd7 33. f5 gxf5 34. gxf5 Nc7 35. Kg4 Nb5 36. Kh5 Ke8 37. Kh6 Bf8+ 38. Kh7 Be7 39. Kg8 Bf8 40. e6 fxe6 41. fxe6 Bd6 42. Bg5 Nc7 43. Nf4 Bxf4 44. Bxf4 Nxe6 45. Be5 1-0`,
        order: 0,
      },
    ],
  },

  'the-lone-wolf-bobby-fischer': {
    id: 1007,
    user_id: 1,
    title: 'The Lone Wolf of Brooklyn: Bobby Fischer and the Match of the Century',
    slug: 'the-lone-wolf-bobby-fischer',
    summary: 'The thrilling story of Bobby Fischer’s solitary crusade against Soviet chess domination culminating in the 1972 World Championship.',
    status: 'published',
    published_at: '2026-05-16T10:00:00Z',
    created_at: '2026-05-16T10:00:00Z',
    updated_at: '2026-05-16T10:00:00Z',
    author: {
      id: 1,
      name: 'Vonchess',
      bio: 'Historical chess research & player chronicle archives.',
    },
    cover_image: 'assets/player-profiles/robert-james-fischer.webp',
    content: `Robert James "Bobby" Fischer was **"The Lone Wolf of Brooklyn"**. At a time when Soviet grandmasters worked in teams with analysts and coaches, Fischer studied alone in his room, memorizing thousands of opening variations.

### The Game of the Century
At just 13 years old, Fischer played a game against Donald Byrne featuring a knight sacrifice that became known as *"The Game of the Century"*:

[game:0]

### 1972 World Championship
Fischer's 1972 victory over Boris Spassky in Reykjavík captivated the world and brought unprecedented global media attention to chess.`,
    games: [
      {
        id: 1,
        title: 'Donald Byrne vs. Robert James Fischer (Rosenwald Memorial 1956)',
        pgn: `[Event "Third Rosenwald Trophy"]
[Site "New York, NY USA"]
[Date "1956.10.17"]
[Round "8"]
[Result "0-1"]
[White "Donald Byrne"]
[Black "Robert James Fischer"]
[ECO "D92"]

1. Nf3 Nf6 2. c4 g6 3. Nc3 Bg7 4. d4 O-O 5. Bf4 d5 6. Qb3 dxc4 7. Qxc4 c6 8. e4 Nbd7 9. Rd1 Nb6 10. Qc5 Bg4 11. Bg5 Na4 12. Qa3 Nxc3 13. bxc3 Nxe4 14. Bxe7 Qb6 15. Bc4 Nxc3 16. Bc5 Rfe8+ 17. Kf1 Be6 18. Bxb6 Bxc4+ 19. Kg1 Ne2+ 20. Kf1 Nxd4+ 21. Kg1 Ne2+ 22. Kf1 Nc3+ 23. Kg1 axb6 24. Qb4 Ra4 25. Qxb6 Nxd1 26. h3 Rxa2 27. Kh2 Nxf2 28. Re1 Rxe1 29. Qd8+ Bf8 30. Nxe1 Bd5 31. Nf3 Ne4 32. Qb8 b5 33. h4 h5 34. Ne5 Kg7 35. Kg1 Bc5+ 36. Kf1 Ng3+ 37. Ke1 Bb4+ 38. Kd1 Bb3+ 39. Kc1 Ne2+ 40. Kb1 Nc3+ 41. Kc1 Rc2# 0-1`,
        order: 0,
      },
    ],
  },

  'the-pride-and-sorrow-paul-morphy': {
    id: 1008,
    user_id: 1,
    title: 'The Pride and Sorrow of Chess: Paul Morphy’s Romantic Genius',
    slug: 'the-pride-and-sorrow-paul-morphy',
    summary: 'How 19th-century American prodigy Paul Morphy mastered rapid piece development and created timeless tactical masterpieces.',
    status: 'published',
    published_at: '2026-05-17T10:00:00Z',
    created_at: '2026-05-17T10:00:00Z',
    updated_at: '2026-05-17T10:00:00Z',
    author: {
      id: 1,
      name: 'Vonchess',
      bio: 'Historical chess research & player chronicle archives.',
    },
    cover_image: 'assets/player-profiles/paul-morphy.webp',
    content: `Paul Morphy is remembered as **"The Pride and Sorrow of Chess"**. Born in New Orleans in 1837, Morphy understood principles of rapid piece development, open lines, and king safety long before they were formalized in chess literature.

### The Opera Game
During a performance of the opera *Norma* in Paris in 1858, Morphy played against the Duke of Brunswick and Count Isouard, producing the most famous instructional game in chess history:

[game:0]

### Sudden Retirement
After defeating every European master at age 21, Morphy retired from chess to practice law, leaving a short but immortal legacy.`,
    games: [
      {
        id: 1,
        title: 'Paul Morphy vs. Duke of Brunswick & Count Isouard (Paris Opera 1858)',
        pgn: `[Event "Paris Opera"]
[Site "Paris FRA"]
[Date "1858.11.02"]
[Round "1"]
[Result "1-0"]
[White "Paul Morphy"]
[Black "Duke of Brunswick & Count Isouard"]
[ECO "C41"]

1. e4 e5 2. Nf3 d6 3. d4 Bg4 4. dxe5 Bxf3 5. Qxf3 dxe5 6. Bc4 Nf6 7. Qb3 Qe7 8. Nc3 c6 9. Bg5 b5 10. Nxb5 cxb5 11. Bxb5+ Nbd7 12. O-O-O Rd8 13. Rxd7 Rxd7 14. Rd1 Qe6 15. Bxd7+ Nxd7 16. Qb8+ Nxb8 17. Rd8# 1-0`,
        order: 0,
      },
    ],
  },

  'the-tiger-of-madras-viswanathan-anand': {
    id: 1009,
    user_id: 1,
    title: 'The Tiger of Madras: Viswanathan Anand’s Lightning Calculation',
    slug: 'the-tiger-of-madras-viswanathan-anand',
    summary: 'The story of India’s first Grandmaster and 5-time World Champion Viswanathan Anand.',
    status: 'published',
    published_at: '2026-05-18T10:00:00Z',
    created_at: '2026-05-18T10:00:00Z',
    updated_at: '2026-05-18T10:00:00Z',
    author: {
      id: 1,
      name: 'Vonchess',
      bio: 'Historical chess research & player chronicle archives.',
    },
    cover_image: 'assets/player-profiles/vishwanathan-anand.webp',
    content: `Viswanathan Anand, known as **"The Tiger of Madras"**, became India's first Grandmaster in 1988 and went on to win 5 World Chess Championship titles.

### Speed and Calculation
Early in his career, Anand was famous for playing full classical games in under 15 minutes of clock time, calculating tactical variations at blinding speed.

[game:0]

### Inspiring a Nation
Anand sparked a chess boom in India, laying the foundation for India's current generation of super grandmasters.`,
    games: [
      {
        id: 1,
        title: 'Viswanathan Anand vs. Levon Aronian (Wijk aan Zee 2013)',
        pgn: `[Event "Tata Steel"]
[Site "Wijk aan Zee NED"]
[Date "2013.01.16"]
[Round "4"]
[Result "1-0"]
[White "Viswanathan Anand"]
[Black "Levon Aronian"]
[ECO "D47"]

1. d4 d5 2. c4 c6 3. Nf3 Nf6 4. Nc3 e6 5. e3 Nbd7 6. Bd3 dxc4 7. Bxc4 b5 8. Bd3 Bd6 9. O-O O-O 10. Qc2 Bb7 11. a3 Rc8 12. Ng5 c5 13. Nxh7 Ng4 14. f4 cxd4 15. exd4 Bc5 16. Be2 Nde5 17. Bxg4 Bxd4+ 18. Kh1 Nxg4 19. Ng5 g6 20. Qe2 Nf2+ 21. Rxf2 Bxf2 22. Qxf2 Rxc3 23. bxc3 Qd1+ 24. Qg1 Rd8 25. Be3 Qe2 26. Re1 Qb2 27. Bd4 1-0`,
        order: 0,
      },
    ],
  },

  'the-queen-of-chess-judit-polgar': {
    id: 1010,
    user_id: 1,
    title: 'The Queen of Chess: Judit Polgár’s Fearless Attacking Legacy',
    slug: 'the-queen-of-chess-judit-polgar',
    summary: 'How Judit Polgár shattered records, entered the world top 10, and defeated 11 world champions.',
    status: 'published',
    published_at: '2026-05-19T10:00:00Z',
    created_at: '2026-05-19T00:00:00Z',
    updated_at: '2026-05-19T00:00:00Z',
    author: {
      id: 1,
      name: 'Vonchess',
      bio: 'Historical chess research & player chronicle archives.',
    },
    cover_image: 'assets/player-profiles/judit-polgar.webp',
    content: `Judit Polgár is universally recognized as **"The Queen of Chess"**. She is the only woman in history to break into the FIDE top 10 rankings, reaching a peak rating of 2735.

### Aggressive Mindset
Polgár broke Bobby Fischer's record for youngest Grandmaster at age 15. She refused to play women-only events, competing exclusively in open grandmaster tournaments and defeating champions such as Kasparov, Karpov, and Carlsen.

[game:0]

### Historical Victory
Her victory against Garry Kasparov in 2002 remains one of the defining moments in modern chess history.`,
    games: [
      {
        id: 1,
        title: 'Judit Polgár vs. Garry Kasparov (Russia vs. Rest of World 2002)',
        pgn: `[Event "Russia vs. Rest of World"]
[Site "Moscow RUS"]
[Date "2002.09.09"]
[Round "5"]
[Result "1-0"]
[White "Judit Polgar"]
[Black "Garry Kasparov"]
[ECO "C42"]

1. e4 e5 2. Nf3 Nf6 3. Nxe5 d6 4. Nf3 Nxe4 5. d4 d5 6. Bd3 Nc6 7. O-O Be7 8. c4 Nb4 9. Be2 O-O 10. Nc3 Bf5 11. a3 Nxc3 12. bxc3 Nc6 13. Re1 Re8 14. cxd5 Qxd5 15. Bf4 Rac8 16. h3 Be4 17. Nd2 Bf5 18. Nc4 Qd7 19. Ne3 Bg6 20. Bg4 f5 21. Bf3 Kh8 22. Nc4 Bf6 23. Qd2 Bf7 24. Ne3 g5 25. Bh2 h5 26. Qd3 Ne7 27. Bxb7 Rb8 28. Rab1 f4 29. Qa6 Kg7 30. Nf1 c6 31. Nd2 Bd5 32. Ne4 Nf5 33. Nc5 Rxe1+ 34. Rxe1 Re8 35. Qf1 Qf7 36. Rxe8 Qxe8 37. Ba6 g4 38. Bxf4 gxh3 39. g3 Bg2 40. Qe2 Qxe2 41. Bxe2 h4 42. Bg4 1-0`,
        order: 0,
      },
    ],
  },

  'the-speed-demon-hikaru-nakamura': {
    id: 1011,
    user_id: 1,
    title: 'The Speed Demon: Hikaru Nakamura’s Blitz & Creative Resourcefulness',
    slug: 'the-speed-demon-hikaru-nakamura',
    summary: 'Exploring Hikaru Nakamura’s blitz mastery, trickiness under pressure, and modern grandmaster dominance.',
    status: 'published',
    published_at: '2026-05-20T10:00:00Z',
    created_at: '2026-05-20T10:00:00Z',
    updated_at: '2026-05-20T10:00:00Z',
    author: {
      id: 1,
      name: 'Vonchess',
      bio: 'Historical chess research & player chronicle archives.',
    },
    cover_image: 'assets/player-profiles/hikaru-nakamura.webp',
    content: `Hikaru Nakamura earned his moniker **"The Speed Demon"** for his superhuman calculation speed in blitz and bullet chess.

### Resilience Under Pressure
Nakamura is famed for saving lost positions under extreme time pressure, utilizing clever tactical traps and high-speed defensive technique.

[game:0]

### Modern Pioneer
A 5-time US Champion and World Fischer Random Champion, Nakamura pioneered modern online chess broadcasting while maintaining his status as one of the world's top classical grandmasters.`,
    games: [
      {
        id: 1,
        title: 'Hikaru Nakamura vs. Magnus Carlsen (London Chess Classic 2011)',
        pgn: `[Event "London Chess Classic"]
[Site "London ENG"]
[Date "2011.12.04"]
[Round "2"]
[Result "1-0"]
[White "Hikaru Nakamura"]
[Black "Magnus Carlsen"]
[ECO "E60"]

1. d4 Nf6 2. c4 g6 3. f3 c5 4. d5 d6 5. e4 e6 6. Ne2 exd5 7. cxd5 Bg7 8. Nec3 O-O 9. Be2 b6 10. O-O Ba6 11. Na3 Bxe2 12. Qxe2 a6 13. Rb1 Nbd7 14. b4 Re8 15. Qd2 b5 16. Nc2 Nb6 17. bxc5 Nc4 18. Qf2 dxc5 19. Ne3 Ng4 20. Nxg4 Bxc3 21. Nh6+ Kg7 22. Kh1 Bd4 23. Qg3 f6 24. Nf5+ Kh8 25. Nxd4 cxd4 26. Rd1 Qb6 27. Qf2 Rac8 28. Qxd4 Qxd4 29. Rxd4 Kg7 30. Kg1 g5 31. a4 Nd6 32. Ba3 1-0`,
        order: 0,
      },
    ],
  },

  'the-stormy-petrel-alexander-alekhine': {
    id: 1012,
    user_id: 1,
    title: 'The Stormy Petrel: Alexander Alekhine’s Wild Combination Wonders',
    slug: 'the-stormy-petrel-alexander-alekhine',
    summary: 'How 4th World Champion Alexander Alekhine created some of the most complex multi-piece combinations in chess history.',
    status: 'published',
    published_at: '2026-05-21T10:00:00Z',
    created_at: '2026-05-21T10:00:00Z',
    updated_at: '2026-05-21T10:00:00Z',
    author: {
      id: 1,
      name: 'Vonchess',
      bio: 'Historical chess research & player chronicle archives.',
    },
    cover_image: 'assets/player-profiles/alexander-alekhine.webp',
    content: `Alexander Alekhine was nicknamed **"The Stormy Petrel of Chess"** for his passionate, turbulent tactical style. He defeated José Raúl Capablanca in 1927 to become the 4th World Champion.

### Complex Tactical Wonders
Alekhine's games feature deep combinations where pieces on both sides are under attack simultaneously, demanding precise, deep calculation.

[game:0]

### Eternal Influence
Kasparov cited Alekhine as his greatest tactical role model, praising his capacity for relentless attacking initiative.`,
    games: [
      {
        id: 1,
        title: 'Alexander Alekhine vs. Richard Réti (Baden-Baden 1925)',
        pgn: `[Event "Baden-Baden"]
[Site "Baden-Baden GER"]
[Date "1925.04.28"]
[Round "10"]
[Result "1-0"]
[White "Alexander Alekhine"]
[Black "Richard Reti"]
[ECO "C90"]

1. g3 e5 2. Bg2 d5 3. Nf3 e4 4. Nd4 Nd7 5. d3 exd3 6. Qxd3 Ngf6 7. O-O Be7 8. c4 Ne5 9. Qc2 dxc4 10. Rd1 Bd7 11. Bf4 Ng6 12. Qxc4 Nxf4 13. gxf4 c6 14. Nc3 Qc8 15. Rd3 O-O 16. Rg3 Nh5 17. Re3 Bd8 18. f5 Bxf5 19. Nxf5 Qxf5 20. Be4 Qg5+ 21. Kh1 Bc7 22. Rh3 g6 23. Rg1 Qe5 24. Bxg6 hxg6 25. Rxg6+ Ng7 26. Qh4 fxg6 27. Qh7+ Kf7 28. Rf3+ Ke7 29. Re3 Qxe3 30. fxe3 Rf7 31. Qxg6 Ne6 32. Ne4 Rh8 33. Ng5 Rf1+ 34. Kg2 Rf6 35. Qe4 Rxh2+ 36. Kg1 Rf6 37. Nf3 Rh5 38. b4 a6 39. a4 Rff5 40. Qd3 Rd5 41. Qc3 Rh7 42. Kf2 Rf7 43. Qc4 Bb6 44. Ke1 Bxe3 45. Qe4 Bf4 46. e3 Bg3+ 47. Ke2 Rdf5 48. Nd4 Re5 49. Qg4 Nxd4+ 50. Qxd4 Bf2 1-0`,
        order: 0,
      },
    ],
  },
};
