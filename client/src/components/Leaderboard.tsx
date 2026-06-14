import { useState, useEffect, useCallback } from "react";

interface LeaderboardEntry {
    uid: string;
    displayName: string;
    wins: number;
    gamesPlayed: number;
    winRate: number;
}

interface LeaderboardProps {
    apiUrl: string;
    onBack: () => void;
}

const Leaderboard = ({ apiUrl, onBack }: LeaderboardProps) => {
    const [entries, setEntries] = useState<LeaderboardEntry[]>([]);

    const fetchLeaderboard = useCallback(() => {
        fetch(`${apiUrl}?limit=50`)
            .then(r => r.json())
            .then(data => setEntries(data))
            .catch(() => {});
    }, [apiUrl]);

    useEffect(() => {
        fetchLeaderboard();
    }, [fetchLeaderboard]);

    return (
        <div className="leaderboard-full">
            <div className="leaderboard-full-header">
                <h2>LEADERBOARD</h2>
                <p>Top players ranked by wins. Sign in with Google to appear here.</p>
            </div>
            <button className="btn" onClick={onBack} style={{ marginBottom: 'var(--space-lg)' }}>
                &larr; BACK TO LOBBY
            </button>
            {entries.length === 0 ? (
                <p style={{ color: 'var(--muted)', textAlign: 'center', padding: 'var(--space-xl)' }}>
                    No players yet. Win a game to be the first!
                </p>
            ) : (
                <div className="leaderboard-table">
                    <div className="leaderboard-table-header">
                        <span className="lb-col-rank">#</span>
                        <span className="lb-col-name">PLAYER</span>
                        <span className="lb-col-wins">WINS</span>
                        <span className="lb-col-games">GAMES</span>
                        <span className="lb-col-rate">WIN %</span>
                    </div>
                    {entries.map((entry, i) => (
                        <div key={entry.uid} className={`leaderboard-table-row${i === 0 ? ' top-player' : ''}`}>
                            <span className="lb-col-rank">{i + 1}</span>
                            <span className="lb-col-name">{entry.displayName}</span>
                            <span className="lb-col-wins">{entry.wins}</span>
                            <span className="lb-col-games">{entry.gamesPlayed}</span>
                            <span className="lb-col-rate">{entry.winRate}%</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Leaderboard;
