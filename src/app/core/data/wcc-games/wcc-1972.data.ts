import { WorldChampionshipGame } from '../../models/world-championship.model';

export const WCC_1972_GAMES: WorldChampionshipGame[] = [
  {
    id: 'wcc-1972-g6',
    matchId: 'wcc-1972',
    gameNumber: 6,
    title: 'Game 6: The Standing Ovation',
    subtitle: 'Bobby Fischer vs. Boris Spassky – Reykjavik, 1972',
    white: 'Bobby Fischer',
    black: 'Boris Spassky',
    result: '1-0',
    date: '1972.07.23',
    eco: 'D59',
    opening: "Queen's Gambit Declined, Tartakower",
    pgn: `[Event "World Championship Match 1972"]
[Site "Reykjavik ISL"]
[Date "1972.07.23"]
[Round "6"]
[White "Fischer, Robert James"]
[Black "Spassky, Boris V"]
[Result "1-0"]
[ECO "D59"]

1. c4 e6 2. Nf3 d5 3. d4 Nf6 4. Nc3 Be7 5. Bg5 O-O 6. e3 h6 7. Bh4 b6 8. cxd5 Nxd5 9. Bxe7 Qxe7 10. Nxd5 exd5 11. Rc1 Be6 12. Qa4 c5 13. Qa3 Rc8 14. Bb5 a6 15. dxc5 bxc5 16. O-O Ra7 17. Be2 Nd7 18. Nd4 Qf8 19. Nxe6 fxe6 20. e4 d4 21. f4 Qe7 22. e5 Rb8 23. Bc4 Kh8 24. Qh3 Nf8 25. b3 a5 26. f5 exf5 27. Rxf5 Nh7 28. Rcf1 Qd8 29. Qg3 Re7 30. h4 Rbb7 31. e6 Rbc7 32. Qe5 Qe8 33. a4 Qd8 34. R1f2 Qe8 35. R2f3 Qd8 36. Bd3 Qe8 37. Qe4 Nf6 38. Rxf6 gxf6 39. Rxf6 Kg8 40. Bc4 Kh8 41. Qf4 1-0`,
    totalPlies: 81,
    narrativeOverview:
      "Reykjavik, 1972. Match of the Century. Fischer shocked the chess world by opening 1. c4 instead of his lifetime favorite 1. e4. What unfolded was an artistic symphony so pure that Boris Spassky stood up alongside the audience to applaud his conqueror.",
    sections: [
      {
        title: 'A psychological opening shock',
        order: 1,
        startPly: 1,
        endPly: 24,
        content:
          "Fischer opened with **1. c4!**, stepping into the English Opening and transposing into Spassky's beloved Tartakower Defense (**7... b6**). Fischer had prepared an exquisite positional squeeze.",
      },
      {
        title: 'The hanging pawns under siege',
        order: 2,
        startPly: 24,
        endPly: 50,
        content:
          "White provoked **...c5** and systematically blockaded Black's center. With **14. Bb5! a6 15. dxc5**, Fischer isolated Black's pawns and seized absolute command of the dark squares.",
      },
      {
        title: 'The unstoppable avalanche',
        order: 3,
        startPly: 50,
        endPly: 81,
        content:
          "Fischer launched **26. f5!**, tearing open Black's kingside. With **38. Rxf6!**, all defense collapsed. Spassky resigned on move 41 and joined the Icelandic audience in a standing ovation.",
      },
    ],
  },
];
