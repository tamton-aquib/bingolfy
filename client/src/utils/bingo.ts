export function countLines(grid: number[][], marked: Set<number>): number {
    let lines = 0;
    for (let r = 0; r < 5; r++) {
        if (grid[r].every(n => marked.has(n))) lines++;
    }
    for (let c = 0; c < 5; c++) {
        let all = true;
        for (let r = 0; r < 5; r++) {
            if (!marked.has(grid[r][c])) { all = false; break; }
        }
        if (all) lines++;
    }
    let d1 = true, d2 = true;
    for (let i = 0; i < 5; i++) {
        if (!marked.has(grid[i][i])) d1 = false;
        if (!marked.has(grid[i][4 - i])) d2 = false;
    }
    if (d1) lines++;
    if (d2) lines++;
    return lines;
}
