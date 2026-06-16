import { describe, it, expect } from 'vitest';
import { buildTreeFromMoves, findNodeContext } from './chess-tree.utils';
import { MoveNode } from '../models/study.model';

describe('Chess Tree Utils Move Verification', () => {
  it('should find existing move from initial position', () => {
    // Game with e4 c5
    const initialFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const moves = ['e4', 'c5'];
    const tree = buildTreeFromMoves(moves, initialFen);

    expect(tree.length).toBe(2);
    expect(tree[0].san).toBe('e4');
    expect(tree[1].san).toBe('c5');

    // Simulate manual move e4 played at initial position (current is null)
    const san = 'e4';
    const uci = 'e2e4';

    let existingNode: MoveNode | undefined;
    if (tree.length > 0) {
      const firstNode = tree[0];
      if (firstNode.san === san || firstNode.uci === uci) {
        existingNode = firstNode;
      }
    }

    expect(existingNode).toBeDefined();
    expect(existingNode!.san).toBe('e4');
    expect(existingNode!.ply).toBe(1);
  });

  it('should find existing move from intermediate position', () => {
    const initialFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const moves = ['e4', 'c5'];
    const tree = buildTreeFromMoves(moves, initialFen);

    const e4Node = tree[0];

    // Simulate manual move c5 played at e4 node
    const san = 'c5';
    const uci = 'c7c5';

    const context = findNodeContext(tree, e4Node.fen);
    const existingNode = context.next.find(n => n.san === san || n.uci === uci);

    expect(existingNode).toBeDefined();
    expect(existingNode!.san).toBe('c5');
    expect(existingNode!.ply).toBe(2);
  });

  it('should find variation moves as existing moves', () => {
    // e4 (d4 d5) c5
    const pgnData = {
      pgn: '1. e4 (1. d4 d5) 1... c5'
    };
    const tree = buildTreeFromMoves(pgnData);

    expect(tree.length).toBe(2); // e4 and c5
    expect(tree[0].san).toBe('e4');
    expect(tree[0].variations.length).toBe(1);
    expect(tree[0].variations[0][0].san).toBe('d4');

    // From initial position, play d4 manually
    const san = 'd4';
    const uci = 'd2d4';

    let existingNode: MoveNode | undefined;
    if (tree.length > 0) {
      const firstNode = tree[0];
      if (firstNode.san === san || firstNode.uci === uci) {
        existingNode = firstNode;
      } else if (firstNode.variations) {
        for (const variation of firstNode.variations) {
          if (variation.length > 0 && (variation[0].san === san || variation[0].uci === uci)) {
            existingNode = variation[0];
            break;
          }
        }
      }
    }

    expect(existingNode).toBeDefined();
    expect(existingNode!.san).toBe('d4');
    expect(existingNode!.ply).toBe(1);
  });
});
