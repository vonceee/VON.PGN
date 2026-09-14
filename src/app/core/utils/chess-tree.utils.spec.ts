import {
  buildTreeFromMoves,
  updateNodeInTree,
  serializeShapesToComment,
} from './chess-tree.utils';
import { MoveNode } from '../models/study.model';

describe('ChessTreeUtils - Shapes & Annotations', () => {
  describe('serializeShapesToComment', () => {
    it('returns empty string for null or empty shapes', () => {
      expect(serializeShapesToComment([])).toBe('');
      expect(serializeShapesToComment(null as any)).toBe('');
    });

    it('serializes square highlights into [%csl ...]', () => {
      const shapes = [
        { orig: 'e4', brush: 'green' },
        { orig: 'd5', brush: 'red' },
      ];
      expect(serializeShapesToComment(shapes)).toBe('[%csl Ge4,Rd5]');
    });

    it('serializes arrows into [%cal ...]', () => {
      const shapes = [
        { orig: 'e2', dest: 'e4', brush: 'green' },
        { orig: 'g1', dest: 'f3', brush: 'yellow' },
      ];
      expect(serializeShapesToComment(shapes)).toBe('[%cal Ge2e4,Yg1f3]');
    });

    it('serializes mixed circles and arrows into standard PGN tags', () => {
      const shapes = [
        { orig: 'e4', brush: 'blue' },
        { orig: 'c1', dest: 'g5', brush: 'red' },
      ];
      expect(serializeShapesToComment(shapes)).toBe('[%csl Be4] [%cal Rc1g5]');
    });
  });

  describe('buildTreeFromMoves with shapes', () => {
    it('preserves shapes and preShapes on normalized MoveNodes', () => {
      const rawNodes = [
        {
          san: 'e4',
          uci: 'e2e4',
          fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
          ply: 1,
          variations: [],
          preShapes: [{ orig: 'e2', dest: 'e4', brush: 'green' }],
          shapes: [{ orig: 'e4', brush: 'yellow' }],
        },
      ];

      const tree = buildTreeFromMoves(rawNodes);
      expect(tree.length).toBe(1);
      expect(tree[0].preShapes).toEqual([{ orig: 'e2', dest: 'e4', brush: 'green' }]);
      expect(tree[0].shapes).toEqual([{ orig: 'e4', brush: 'yellow' }]);
    });

    it('parses shapes from PGN comments correctly', () => {
      const pgn = '{ [%csl Ge4] } 1. e4 { [%cal Ge2e4] Good opening }';
      const tree = buildTreeFromMoves({ pgn });

      expect(tree.length).toBe(1);
      expect(tree[0].san).toBe('e4');
      expect(tree[0].preShapes).toEqual([{ orig: 'e4', brush: 'green' }]);
      expect(tree[0].shapes).toEqual([{ orig: 'e2', dest: 'e4', brush: 'green' }]);
      expect(tree[0].comments).toContain('Good opening');
    });
  });

  describe('updateNodeInTree', () => {
    it('updates shapes on target node matching fen and ply', () => {
      const tree: MoveNode[] = [
        {
          san: 'e4',
          uci: 'e2e4',
          fen: 'fen_e4',
          ply: 1,
          variations: [],
        },
        {
          san: 'e5',
          uci: 'e7e5',
          fen: 'fen_e5',
          ply: 2,
          variations: [],
        },
      ];

      const updated = updateNodeInTree(tree, 'fen_e4', 1, {
        shapes: [{ orig: 'e4', brush: 'green' }],
      });

      expect(updated[0].shapes).toEqual([{ orig: 'e4', brush: 'green' }]);
      expect(updated[1].shapes).toBeUndefined();
    });

    it('allows clearing shapes to an empty array', () => {
      const tree: MoveNode[] = [
        {
          san: 'e4',
          uci: 'e2e4',
          fen: 'fen_e4',
          ply: 1,
          variations: [],
          shapes: [{ orig: 'e4', brush: 'green' }],
        },
      ];

      const cleared = updateNodeInTree(tree, 'fen_e4', 1, {
        shapes: [],
      });

      expect(cleared[0].shapes).toEqual([]);
    });
  });

  describe('buildTreeFromMoves with empty / cleared markings', () => {
    it('preserves empty preShapes and shapes array on normalized MoveNodes', () => {
      const rawNodes = [
        {
          san: 'e4',
          uci: 'e2e4',
          fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
          ply: 1,
          variations: [],
          preShapes: [],
          shapes: [],
        },
      ];

      const tree = buildTreeFromMoves(rawNodes);
      expect(tree.length).toBe(1);
      expect(tree[0].preShapes).toEqual([]);
      expect(tree[0].shapes).toEqual([]);
    });
  });
});
