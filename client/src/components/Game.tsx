import { useState, useEffect, useCallback, useRef } from "react";
import BingoProgress from "./BingoProgress";
import WinOverlay from "./WinOverlay";

interface Player {
    name: string;
    ready: boolean;
}

interface GameProps {
    room: string;
    grid: number[][];
    myName: string;
    playingUsers: Player[];
    currentPlayer: string;
    socket: {
        send: (type: string, data?: Record<string, unknown>) => void;
        subscribe: (type: string, handler: (payload: unknown) => void) => () => void;
    };
    onGoHome: () => void;
}

function countLines(grid: number[][], marked: Set<number>): number {
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

const Game = ({ room, grid, myName, playingUsers, currentPlayer, socket, onGoHome }: GameProps) => {
    const [marked, setMarked] = useState<Set<number>>(new Set());
    const [lines, setLines] = useState(0);
    const [wonUser, setWonUser] = useState<string | null>(null);
    const [bingoReady, setBingoReady] = useState(false);
    const isMyTurn = currentPlayer === myName;
    const markedRef = useRef(marked);

    markedRef.current = marked;

    useEffect(() => {
        const unsubFlush = socket.subscribe("flush", (data: unknown) => {
            const arr = data as number[];
            const s = new Set(arr);
            setMarked(s);
            setLines(countLines(grid, s));
        });

        const unsubGameOver = socket.subscribe("game_over", (data: unknown) => {
            setWonUser((data as Record<string, string>).user);
        });

        return () => { unsubFlush(); unsubGameOver(); };
    }, []);

    const passTurn = useCallback(() => {
        const idx = playingUsers.findIndex(p => p.name === currentPlayer);
        const nextPlayer = playingUsers[(idx + 1) % playingUsers.length];
        if (nextPlayer) {
            socket.send("set_next_player", { user: nextPlayer.name, room });
        }
    }, [playingUsers, currentPlayer, socket, room]);

    const handleTileClick = useCallback((n: number) => {
        if (!isMyTurn || marked.has(n) || wonUser) return;
        const next = new Set(marked);
        next.add(n);
        setMarked(next);
        const l = countLines(grid, next);
        setLines(l);
        socket.send("tile_clicked", { tiles: [...next], room });
        if (l >= 5) { setBingoReady(true); }
        passTurn();
    }, [isMyTurn, marked, wonUser, grid, socket, room, passTurn]);

    const handleCallBingo = useCallback(() => {
        if (!bingoReady || wonUser) return;
        socket.send("user_won", { user: myName, room });
        setWonUser(myName);
    }, [bingoReady, wonUser, socket, myName, room]);

    const handlePlayAgain = useCallback(() => {
        setWonUser(null);
        setMarked(new Set());
        setLines(0);
        setBingoReady(false);
    }, []);

    const currentIdx = playingUsers.findIndex(p => p.name === currentPlayer);
    const flat = grid.flat();

    return (
        <>
            <div className="game-layout">
                <div className="game-main">
                    {isMyTurn ? (
                        <div className="game-turn-banner player-turn">
                            YOUR TURN — Pick a number!
                        </div>
                    ) : (
                        <div className="game-turn-banner other-turn">
                            {currentPlayer}'s Turn
                        </div>
                    )}
                    <div className="game-grid" role="grid" aria-label="Game board">
                        {flat.map((n, i) => {
                            const m = marked.has(n);
                            return (
                                <div
                                    key={i}
                                    className={`tile${m ? ' marked' : ''}${!isMyTurn ? ' disabled' : ''}`}
                                    role="gridcell"
                                    tabIndex={m ? -1 : 0}
                                    aria-label={`Number ${n}${m ? ', marked' : ''}`}
                                    onClick={() => handleTileClick(n)}
                                    onKeyDown={e => { if (e.key === 'Enter') handleTileClick(n); }}
                                >
                                    {n}
                                </div>
                            );
                        })}
                    </div>
                    <p className="tiles-counter">{marked.size}/25 called</p>
                    <BingoProgress lines={lines} />
                    <div className="game-actions">
                        <button
                            className={`bingo-call-btn${bingoReady ? ' enabled' : ''}`}
                            onClick={handleCallBingo}
                            disabled={!bingoReady}
                        >
                            CALL BINGO!
                        </button>
                    </div>
                </div>
                <aside className="game-sidebar" aria-label="Player list">
                    <h3>PLAYERS</h3>
                    <div className="player-list" role="list">
                        {playingUsers.map((p, i) => (
                            <div
                                key={p.name}
                                className={`game-player${p.name === myName ? ' is-you' : ''}${i === currentIdx ? ' is-current' : ''}`}
                                role="listitem"
                            >
                                <div className="avatar">{p.name.charAt(0).toUpperCase()}</div>
                                <div className="player-info">
                                    <div className="name">{p.name}{p.name === myName ? ' (you)' : ''}</div>
                                    <div className="status">
                                        {i === currentIdx ? 'Current turn' : 'Waiting'}
                                    </div>
                                </div>
                                {i === currentIdx && <span className="turn-arrow">&#9668;</span>}
                            </div>
                        ))}
                    </div>
                </aside>
            </div>
            <WinOverlay
                winnerName={wonUser || ''}
                onPlayAgain={handlePlayAgain}
                onGoHome={onGoHome}
                visible={!!wonUser}
            />
        </>
    );
};

export default Game;
