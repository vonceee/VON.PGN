import { WorldChampionshipGame } from '../../models/world-championship.model';

export const WCC_2024_GAMES: WorldChampionshipGame[] = [
  {
    id: 'wcc-2024-g14',
    matchId: 'wcc-2024',
    gameNumber: 14,
    title: 'Game 14: The Crowning Moment',
    subtitle: 'Ding Liren vs. Gukesh Dommaraju – Singapore, 2024',
    white: 'Ding Liren',
    black: 'Gukesh Dommaraju',
    result: '0-1',
    date: '2024.12.12',
    eco: 'D37',
    opening: "Queen's Gambit Declined",
    pgn: `[Event "FIDE World Championship 2024"]
[Site "Resorts World Sentosa, Singapore"]
[Date "2024.12.12"]
[Round "14"]
[White "Ding Liren"]
[Black "Gukesh Dommaraju"]
[Result "0-1"]
[ECO "D37"]

1. d4 Nf6 2. c4 e6 3. Nf3 d5 4. Nc3 Be7 5. Bf4 O-O 6. e3 c5 7. dxc5 Bxc5 8. Qc2 Nc6 9. a3 Qa5 10. Rd1 Be7 11. Be2 dxc4 12. Bxc4 Nh5 13. O-O Nxf4 14. exf4 g6 15. g3 Rd8 16. Rxd8+ Qxd8 17. Rd1 Bd7 18. Ne4 Qc7 19. Qc3 Rd8 20. h4 Be8 21. Re1 Qa5 22. b4 Qf5 23. Kg2 a6 24. Bb3 h6 25. Bc2 Qd5 26. Rd1 Qb5 27. Rxd8 Nxd8 28. Ne5 Nc6 29. Ng4 e5 30. fxe5 h5 31. Ngf6+ Kf8 32. e6 Qe5 33. Qd2 Bxf6 34. Qh6+ Bg7 35. exf7 Bxf7 36. Qd2 Bd5 37. f3 Nd4 38. Bd3 Nxf3 39. Kxf3 Qf5+ 40. Ke3 Bh6+ 0-1`,
    totalPlies: 80,
    narrativeOverview:
      'Singapore, 2024. Tied 6.5-6.5 entering the final regulation classical game, the tension was suffocating. Defending champion Ding Liren pushed for active play with White, but 18-year-old Gukesh displayed nerves of steel to exploit tactical missteps and seal the world championship title.',
    sections: [
      {
        title: 'Opening probing in the QGD',
        order: 1,
        startPly: 1,
        endPly: 20,
        content:
          "Ding opened with **1. d4 Nf6 2. c4 e6 3. Nf3 d5 4. Nc3 Be7**, steering into a solid Queen's Gambit Declined. Gukesh responded with classic piece coordination, holding the center firmly with **...c5** and **...Be7**.",
      },
      {
        title: 'Central tension and tactical maneuvering',
        order: 2,
        startPly: 20,
        endPly: 50,
        content:
          "White gained space on the queenside with **b4** and central control, but Black's queen on **f5** remained a poised counter-attacker. Ding sought decisive piece activity with **28. Ne5** and **29. Ng4**.",
      },
      {
        title: 'The decisive breakthrough',
        order: 3,
        startPly: 50,
        endPly: 80,
        content:
          "Under severe clock pressure, Ding overextended with **32. e6?!**. Gukesh accurately countered with **33... Bxf6 34... Bg7 35... Bxf7**, neutralizing White's initiative. After **38... Nxf3! 39. Kxf3 Qf5+ 40. Ke3 Bh6+**, Ding resigned, making Gukesh the youngest classical World Chess Champion in history.",
      },
    ],
  },
  {
    id: 'wcc-2024-g3',
    matchId: 'wcc-2024',
    gameNumber: 3,
    title: 'Game 3: Gukesh Strikes Back',
    subtitle: 'Gukesh Dommaraju vs. Ding Liren – Singapore, 2024',
    white: 'Gukesh Dommaraju',
    black: 'Ding Liren',
    result: '1-0',
    date: '2024.11.27',
    eco: 'D37',
    opening: "Queen's Gambit Declined",
    pgn: `[Event "FIDE World Championship 2024"]
[Site "Resorts World Sentosa, Singapore"]
[Date "2024.11.27"]
[Round "3"]
[White "Gukesh Dommaraju"]
[Black "Ding Liren"]
[Result "1-0"]
[ECO "D37"]

1. d4 Nf6 2. c4 e6 3. Nf3 d5 4. Nc3 Be7 5. Bf4 O-O 6. e3 c5 7. dxc5 Bxc5 8. Qc2 Nc6 9. a3 Qa5 10. Nd2 Bb4 11. cxd5 exd5 12. Bd3 d4 13. O-O Bxc3 14. Nc4 Qh5 15. bxc3 dxc3 16. Qxc3 Be6 17. Nd6 Nd5 18. Qb2 Nxf4 19. exf4 Rad8 20. Be2 Qh6 21. Nxb7 Rd4 22. g3 Bd5 23. Rfd1 Qf6 24. Rxd4 Nxd4 25. Rd1 Nxe2+ 26. Qxe2 Bxb7 27. Qe5 Qc6 28. Qd5 Qxd5 29. Rxd5 Bxd5 1-0`,
    totalPlies: 57,
    narrativeOverview:
      'After suffering a shocking loss in Game 1, Gukesh rebounded immediately with White in Game 3, demonstrating positional clarity and deep preparation to level the match score.',
    sections: [
      {
        title: 'Preparation in the center',
        order: 1,
        startPly: 1,
        endPly: 24,
        content:
          "Gukesh employed **1. d4** and pressed the open d-file against Ding's isolated queen pawn.",
      },
      {
        title: 'Converting the advantage',
        order: 2,
        startPly: 24,
        endPly: 57,
        content:
          "With calm piece trades and dominant king safety, Gukesh smoothly steered into a winning endgame.",
      },
    ],
  },
];
