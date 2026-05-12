import { useState, useRef, useEffect, useCallback } from "react";

const PRESETS = [
    "bingo-basement",
    "yeet-street",
    "meme-palace",
    "dab-central",
    "noob-lounge",
];

interface RoomInfo {
    name: string;
    playerCount: number;
    maxPlayers: number;
}

interface LobbyProps {
    onJoinRoom: (name: string) => void;
    getApiUrl: string;
}

const RoomCard = ({ name, playerCount, maxPlayers, onJoin }: { name: string; playerCount?: number; maxPlayers: number; onJoin: () => void }) => (
    <div
        className="room-card"
        role="listitem"
        tabIndex={0}
        aria-label={`Room ${name}${playerCount !== undefined ? `, ${playerCount} players` : ''}`}
        onClick={onJoin}
        onKeyDown={e => { if (e.key === 'Enter') onJoin(); }}
    >
        <h3>{name.toUpperCase()}</h3>
        <div className="room-meta">
            <span className="players-indicator">
                {playerCount !== undefined ? `${playerCount}/${maxPlayers} players` : '?/8 players'}
            </span>
            <div className="player-dots">
                {Array.from({ length: maxPlayers }, (_, i) => (
                    <span key={i} className={playerCount !== undefined && i < playerCount ? "filled" : ""} />
                ))}
            </div>
        </div>
    </div>
);

const Lobby = ({ onJoinRoom, getApiUrl }: LobbyProps) => {
    const [rooms, setRooms] = useState<RoomInfo[]>([]);
    const roomInputRef = useRef<HTMLInputElement>(null!);

    const fetchRooms = useCallback(() => {
        fetch(getApiUrl)
            .then(r => r.json())
            .then(data => setRooms(data))
            .catch(() => {});
    }, [getApiUrl]);

    useEffect(() => {
        fetchRooms();
        const id = setInterval(fetchRooms, 5000);
        return () => clearInterval(id);
    }, [fetchRooms]);

    const presetSet = new Set(PRESETS);

    const handleCreateRoom = (e: React.FormEvent) => {
        e.preventDefault();
        const name = roomInputRef.current?.value.trim();
        if (name && name.length >= 2) {
            onJoinRoom(name);
            roomInputRef.current.value = "";
        }
    };

    return (
        <div style={{ width: "100%" }}>
            <div className="lobby-header">
                <h2>ROOMS</h2>
                <p>Join a game or create your own room.</p>
            </div>
            <div className="create-room-section">
                <p style={{ fontSize: '.75rem', color: 'var(--muted)', textTransform: 'uppercase' }}>CREATE ROOM</p>
                <form className="create-room-form" onSubmit={handleCreateRoom} aria-label="Create or join a room">
                    <input
                        type="text"
                        ref={roomInputRef}
                        placeholder="Room name"
                        required
                        minLength={2}
                        maxLength={20}
                        aria-label="Room name"
                    />
                    <button className="btn btn-primary" type="submit">JOIN</button>
                </form>
            </div>
            {rooms.filter(r => !presetSet.has(r.name)).length > 0 && (
                <>
                    <p style={{ fontSize: '.75rem', color: 'var(--muted)', textTransform: 'uppercase', marginTop: 'var(--space-lg)', marginBottom: 'var(--space-md)' }}>
                        ACTIVE ROOMS
                    </p>
                    <div className="room-grid" role="list" aria-label="Active rooms">
                        {rooms.filter(r => !presetSet.has(r.name)).map(r => (
                            <RoomCard key={r.name} name={r.name} playerCount={r.playerCount} maxPlayers={r.maxPlayers} onJoin={() => onJoinRoom(r.name)} />
                        ))}
                    </div>
                </>
            )}
            <p style={{ fontSize: '.75rem', color: 'var(--muted)', textTransform: 'uppercase', marginTop: 'var(--space-lg)', marginBottom: 'var(--space-md)' }}>
                QUICK JOIN
            </p>
            <div className="room-grid" role="list" aria-label="Quick join rooms">
                {PRESETS.map(name => {
                    const live = rooms.find(r => r.name === name);
                    return (
                        <RoomCard key={name} name={name} playerCount={live?.playerCount} maxPlayers={8} onJoin={() => onJoinRoom(name)} />
                    );
                })}
            </div>
            <div className="create-room-section">
                <p style={{ fontSize: '.75rem', color: 'var(--muted)', textTransform: 'uppercase' }}>CREATE ROOM</p>
                <form className="create-room-form" onSubmit={handleCreateRoom} aria-label="Create or join a room">
                    <input
                        type="text"
                        ref={roomInputRef}
                        placeholder="Room name"
                        required
                        minLength={2}
                        maxLength={20}
                        aria-label="Room name"
                    />
                    <button className="btn btn-primary" type="submit">JOIN</button>
                </form>
            </div>
        </div>
    );
};

export default Lobby;
