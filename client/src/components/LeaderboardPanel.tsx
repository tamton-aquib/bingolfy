import { useState, useEffect, useCallback } from "react";

interface LeaderboardEntry {
    uid: string;
    displayName: string;
    wins: number;
    gamesPlayed: number;
    winRate: number;
}

interface LeaderboardPanelProps {
    apiUrl: string;
    onViewFull?: () => void;
}

const LeaderboardPanel = ({ apiUrl, onViewFull }: LeaderboardPanelProps) => {
    const [entries, setEntries] = useState<LeaderboardEntry[]>([]);

    const fetchLeaderboard = useCallback(() => {
        fetch(`${apiUrl}?limit=5`)
            .then(r => r.json())
            .then(data => setEntries(data))
            .catch(() => {});
    }, [apiUrl]);

    useEffect(() => {
        fetchLeaderboard();
    }, [fetchLeaderboard]);

    if (entries.length === 0) return null;

    return (
        <div className="leaderboard-panel">
            <p style={{ fontSize: '.75rem', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 'var(--space-md)' }}>
                TOP PLAYERS
            </p>
            <div className="leaderboard-list">
                {entries.map((entry, i) => (
                    <div key={entry.uid} className={`leaderboard-row${i === 0 ? ' top-player' : ''}`}>
                        <span className="leaderboard-rank">{i + 1}</span>
                        <span className="leaderboard-name">{entry.displayName}</span>
                        <span className="leaderboard-stats">
                            <span className="leaderboard-wins">{entry.wins}W</span>
                            <span className="leaderboard-rate">{entry.winRate}%</span>
                        </span>
                    </div>
                ))}
            </div>
            {onViewFull && (
                <button className="btn leaderboard-view-btn" onClick={onViewFull}>
                    VIEW FULL LEADERBOARD
                </button>
            )}
        </div>
    );
};

export default LeaderboardPanel;
