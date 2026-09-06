import { WorldChampionshipGame } from '../../models/world-championship.model';

export const WCC_2023_GAMES: WorldChampionshipGame[] = [
  {
    id: 'wcc-2023-tb4',
    matchId: 'wcc-2023',
    gameNumber: 18,
    title: 'Rapid Tiebreak Game 4: The Immortal 48...Ke7',
    subtitle: 'Ian Nepomniachtchi vs. Ding Liren – Astana, 2023',
    white: 'Ian Nepomniachtchi',
    black: 'Ding Liren',
    result: '0-1',
    date: '2023.04.30',
    eco: 'C84',
    opening: 'Ruy Lopez, Closed',
    pgn: `[Event "FIDE World Championship 2023"]
[Site "Astana KAZ"]
[Date "2023.04.30"]
[Round "18"]
[White "Nepomniachtchi, Ian"]
[Black "Ding, Liren"]
[Result "0-1"]
[ECO "C84"]

1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 6. d3 b5 7. Bb3 d6 8. a4 Bd7 9. h3 O-O 10. Be3 Na5 11. Ba2 c5 12. Nc3 b4 13. Nd5 Nxd5 14. Bxd5 Bc6 15. Bxc6 Nxc6 16. c3 Rb8 17. d4 bxc3 18. bxc3 cxd4 19. cxd4 exd4 20. Nxd4 Nxd4 21. Bxd4 Rb4 22. a5 Qc8 23. Re1 Qe6 24. Rc1 Rb5 25. Bb6 Bd8 26. Rc6 Bxb6 27. axb6 Rb8 28. Rxd6 Qe7 29. e5 R5xb6 30. Rd7 Qe8 31. Qd5 Re6 32. Re3 Rb5 33. Qd4 Rb8 34. f4 g6 35. Kh2 a5 36. Ra7 Qd8 37. Qc4 Rc8 38. Qa2 Qd4 39. Rf3 a4 40. Rxa4 Qd8 41. Ra7 Rc7 42. Ra8 Rc8 43. Ra7 Rc7 44. Ra4 Qd7 45. Qf2 Rec6 46. Rd4 Qe7 47. Qg3 Rd7 48. Rxd7 Qxd7 49. f5 Rc5 50. e6 fxe6 51. fxg6 hxg6 52. Qxg6+ Qg7 53. Qxe6+ Kh8 54. Qe8+ 0-1`,
    totalPlies: 70,
    narrativeOverview:
      "Astana, 2023. With the classical match tied 7-7 and three rapid tiebreak games ending peacefully, game 4 looked destined for blitz. On move 46, rather than accepting a repetition, Ding played 46...Rg6 and later the immortal self-pin 48...Ke7, risking everything to play for the world crown.",
    sections: [
      {
        title: 'The Spanish confrontation',
        order: 1,
        startPly: 1,
        endPly: 30,
        content:
          "Nepomniachtchi opened **1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6**, entering the anti-Marshall lines. Ding maintained strong central harmony with **...d6** and active counterplay on the b-file.",
      },
      {
        title: 'The historic decision: Refusing the draw',
        order: 2,
        startPly: 30,
        endPly: 50,
        content:
          "As the clocks ticked down to seconds, White repeatedly offered drawing repetitions. Ding took a deep breath and pinned his own rook to his king with **46...Rg6**, declaring his intent to fight to the finish.",
      },
      {
        title: 'Victory and the crown',
        order: 3,
        startPly: 50,
        endPly: 70,
        content:
          "Ding's passed pawns surged forward. Ian's king was trapped in a mating net, and at move 68 Nepomniachtchi resigned, collapsing over the board in heartbreak as Ding Liren became China's first World Chess Champion.",
      },
    ],
  },
];
