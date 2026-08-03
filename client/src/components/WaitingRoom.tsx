import { useState, useEffect, useCallback } from "react";

interface Player {
    name: string;
    ready: boolean;
}

interface WaitingRoomProps {
    room: string;
    players: Player[];
    myName: string;
    onReady: () => void;
    onLeave: () => void;
}

const WaitingRoom = ({ room, players, myName, onReady, onLeave }: WaitingRoomProps) => {
    const me = players.find(p => p.name === myName);
    const [iAmReady, setIAmReady] = useState(false);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        setIAmReady(false);
    }, [room, myName]);

    useEffect(() => {
        if (me && !me.ready) setIAmReady(false);
    }, [me]);

    const handleReady = useCallback(() => {
        setIAmReady(r => !r);
        onReady();
    }, [onReady]);

    const handleCopyInvite = useCallback(() => {
        const link = `${window.location.origin}?room=${encodeURIComponent(room)}`;
        navigator.clipboard.writeText(link)
            .then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); })
            .catch(() => {});
    }, [room]);

    return (
        <div className="waiting-room">
            <p style={{ fontSize: '.75rem', color: 'var(--muted)', textTransform: 'uppercase' }}>ROOM</p>
            <div className="room-code">{room.toUpperCase()}</div>
            <p style={{ marginTop: 'var(--space-sm)', fontSize: '.875rem', color: 'var(--muted)' }}>Waiting for players</p>
            <div className="waiting-players" role="list" aria-label="Players in room">
                {players.map(p => (
                    <div key={p.name} className="player-card" role="listitem">
                        <div className="avatar">{p.name.charAt(0).toUpperCase()}</div>
                        <span className="player-name">{p.name}</span>
                        <span className={`ready-badge${p.ready ? '' : ' not-ready'}`}>
                            {p.ready ? 'READY' : 'NOT READY'}
                        </span>
                    </div>
                ))}
            </div>
            <div className="waiting-actions">
                <button className="btn" onClick={handleCopyInvite}>{copied ? 'COPIED!' : 'COPY INVITE LINK'}</button>
                <button className="btn" onClick={onLeave}>LEAVE</button>
                <button className="btn btn-primary" onClick={handleReady}>
                    {iAmReady ? 'UNREADY' : 'READY'}
                </button>
            </div>
        </div>
    );
};

export default WaitingRoom;
