import { useState } from "react";

interface GameSetupProps {
    room: string;
    playerCount: number;
    onContinue: (grid: number[][]) => void;
}

function generateGrid(): number[][] {
    const nums = Array.from({ length: 25 }, (_, i) => i + 1);
    for (let i = nums.length - 1; i > 0; i--) {
        const j = Math.random() * i | 0;
        [nums[i], nums[j]] = [nums[j], nums[i]];
    }
    const g: number[][] = [];
    for (let r = 0; r < 5; r++) g.push(nums.slice(r * 5, r * 5 + 5));
    return g;
}

const GameSetup = ({ room, playerCount, onContinue }: GameSetupProps) => {
    const [grid, setGrid] = useState(generateGrid);
    const [submitted, setSubmitted] = useState(false);

    const handleShuffle = () => {
        if (submitted) return;
        setGrid(generateGrid());
    };

    const handleContinue = () => {
        if (submitted) return;
        setSubmitted(true);
        onContinue(grid);
    };

    const flat = grid.flat();

    return (
        <div className="setup-layout">
            <div className="setup-grid-area">
                <h2>YOUR GRID</h2>
                <p style={{ fontSize: '.75rem', color: 'var(--muted)', marginBottom: 'var(--space-lg)', textTransform: 'uppercase' }}>
                    Shuffle until you&apos;re happy, then continue.
                </p>
                <div className="grid-5x5" role="grid" aria-label="Your bingo grid">
                    {flat.map(n => (
                        <div key={n} className="tile" role="gridcell">{n}</div>
                    ))}
                </div>
                <div className="setup-actions">
                    <button className="btn" onClick={handleShuffle} disabled={submitted}>SHUFFLE</button>
                    <button className="btn btn-primary" onClick={handleContinue} disabled={submitted}>
                        {submitted ? 'WAITING...' : 'CONTINUE'}
                    </button>
                </div>
                {submitted && (
                    <p style={{ marginTop: 'var(--space-md)', fontSize: '.875rem', color: 'var(--accent)', textAlign: 'center' }}>
                        Waiting for other players to finish setup...
                    </p>
                )}
            </div>
            <div className="setup-info">
                <div>
                    <p style={{ fontSize: '.75rem', color: 'var(--muted)', textTransform: 'uppercase' }}>ROOM</p>
                    <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', marginTop: 'var(--space-xs)', fontWeight: 700 }}>
                        {room.toUpperCase()}
                    </p>
                </div>
                <div>
                    <p style={{ fontSize: '.75rem', color: 'var(--muted)', textTransform: 'uppercase' }}>PLAYERS</p>
                    <p style={{ fontSize: '1.25rem', marginTop: 'var(--space-xs)', fontWeight: 700 }}>
                        {playerCount} players
                    </p>
                </div>
                <p style={{ fontSize: '.75rem', color: 'var(--muted)' }}>
                    Numbers 1–25 are placed randomly. Once you continue, your grid is locked for the game.
                </p>
            </div>
        </div>
    );
};

export default GameSetup;
