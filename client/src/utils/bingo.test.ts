import { describe, it, expect } from 'vitest';
import { countLines } from './bingo';

function fullGrid(): number[][] {
    const grid: number[][] = [];
    let n = 1;
    for (let r = 0; r < 5; r++) {
        grid.push([]);
        for (let c = 0; c < 5; c++) {
            grid[r].push(n++);
        }
    }
    return grid;
}

describe('countLines', () => {
    it('counts a completed row', () => {
        const grid = fullGrid();
        expect(countLines(grid, new Set([1, 2, 3, 4, 5]))).toBe(1);
    });

    it('counts a completed column', () => {
        const grid = fullGrid();
        expect(countLines(grid, new Set([1, 6, 11, 16, 21]))).toBe(1);
    });

    it('counts both diagonals', () => {
        const grid = fullGrid();
        expect(countLines(grid, new Set([1, 7, 13, 19, 25, 5, 9, 17, 21]))).toBe(2);
    });

    it('counts multiple lines together', () => {
        const grid = fullGrid();
        expect(countLines(grid, new Set([1, 2, 3, 4, 5, 7, 13, 19, 25]))).toBe(2);
    });

    it('returns zero for no completed lines', () => {
        const grid = fullGrid();
        expect(countLines(grid, new Set([1, 2, 3]))).toBe(0);
    });

    it('counts all twelve lines when the board is full', () => {
        const grid = fullGrid();
        expect(countLines(grid, new Set(Array.from({ length: 25 }, (_, i) => i + 1)))).toBe(12);
    });
});
