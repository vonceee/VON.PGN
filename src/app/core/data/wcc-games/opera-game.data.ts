import { WorldChampionshipGame } from '../../models/world-championship.model';

export const OPERA_GAME_DATA: WorldChampionshipGame[] = [
  {
    id: 'game-opera-1858',
    matchId: 'opera-game',
    gameNumber: 1,
    title: 'The Opera Game',
    subtitle: 'Morphy vs. Duke of Brunswick & Count Isouard – Paris, 1858',
    white: 'Paul Morphy',
    black: 'Duke of Brunswick & Count Isouard',
    result: '1-0',
    date: '1858.10.21',
    eco: 'C41',
    opening: "Philidor's Defense",
    pgn: `[Event "Paris Opera"]
[Site "Paris FRA"]
[Date "1858.10.21"]
[Round "1"]
[White "Paul Morphy"]
[Black "Duke of Brunswick & Count Isouard"]
[Result "1-0"]
[ECO "C41"]

1. e4 e5 2. Nf3 d6 3. d4 Bg4 4. dxe5 Bxf3 5. Qxf3 dxe5 6. Bc4 Nf6 7. Qb3 Qe7 8. Nc3 c6 9. Bg5 b5 10. Nxb5 cxb5 11. Bxb5+ Nbd7 12. O-O-O Rd8 13. Rxd7 Rxd7 14. Rd1 Qe6 15. Bxd7+ Nxd7 16. Qb8+ Nxb8 17. Rd8# 1-0`,
    totalPlies: 33,
    narrativeOverview:
      'Paris, 1858. Paul Morphy is at the opera, seated in a private box, playing chess without looking away from the stage for long. His opponents, the Duke of Brunswick and Count Isouard, are consulting together on the other side of the board. Neither the setting nor the opposition matters much in hindsight — what survives is seventeen moves that read like a short lesson in why development wins games.',
    sections: [
      {
        title: 'Grabbing the center',
        order: 1,
        startPly: 1,
        endPly: 10,
        content:
          "The game opens plainly: **1. e4 e5 2. Nf3 d6 3. d4 Bg4?!**. Black's pin on the knight looks natural, but it costs a tempo Morphy is happy to exploit.\n\n**4. dxe5** strikes the center pawn, and after **Bxf3** White recaptures with **5. Qxf3**, arriving on f3 with the bishop pair, an open center, and a lead in development that never really goes away.",
      },
      {
        title: 'Development over material',
        order: 2,
        startPly: 10,
        endPly: 14,
        content:
          '**dxe5 6. Bc4 Nf6 7. Qb3** — Morphy keeps bringing pieces out while his opponents shuffle their queen. By move nine both sides look reasonable, but only one side is actually finishing development.',
      },
      {
        title: 'The rapid dismantling',
        order: 3,
        startPly: 14,
        endPly: 22,
        content:
          "Black tries **7... Qe7 8. Nc3 c6 9. Bg5 b5**. The Duke and the Count attempt to push Morphy's bishop away, but Morphy refuses to retreat. Instead comes **10. Nxb5! cxb5 11. Bxb5+ Nbd7 12. O-O-O Rd8** — White castled queenside, activating his heavy artillery directly into the pin.",
      },
      {
        title: 'The final sacrifice & checkmate',
        order: 4,
        startPly: 22,
        endPly: 33,
        content:
          '**13. Rxd7! Rxd7 14. Rd1 Qe6 15. Bxd7+ Nxd7 16. Qb8+! Nxb8 17. Rd8#** — Morphy offers his queen to deflect the knight, delivering checkmate with his remaining two minor pieces while all of Black\'s kingside pieces remain asleep on their home squares.',
      },
    ],
  },
];
