import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuthState } from "react-firebase-hooks/auth";

import NavBar from './components/NavBar';
import Login from './components/Login';
import Lobby from './components/Lobby';
import WaitingRoom from './components/WaitingRoom';
import GameSetup from './components/GameSetup';
import Game from './components/Game';
import Leaderboard from './components/Leaderboard';
import ErrorBoundary from './components/ErrorBoundary';
import { useWebSocket } from './hooks/useWebSocket';
import { auth } from "./firebase";

function getAnonUid() {
    let uid = localStorage.getItem('bingolfy-anon-uid');
    if (!uid) {
        uid = crypto.randomUUID();
        localStorage.setItem('bingolfy-anon-uid', uid);
    }
    return uid;
}

interface Player {
    name: string;
    ready: boolean;
}

const socketUrl = import.meta.env.VITE_SOCKET_URL as string;
if (!socketUrl) {
    throw new Error("Build failed: VITE_SOCKET_URL is missing!");
}

type Screen = 'login' | 'lobby' | 'waiting' | 'setup' | 'game' | 'leaderboard';

function App() {
    const [user] = useAuthState(auth);
    const [anonUser, setAnonUser] = useState<string | null>(() => localStorage.getItem('bingolfy-anon-name'));
    const [userDetails, setUserDetails] = useState({ name: '', email: '', photo: '', uid: '' });
    const [screen, setScreen] = useState<Screen>('login');
    const [room, setRoom] = useState(() => localStorage.getItem('bingolfy-room') || '');
    const [grid, setGrid] = useState<number[][] | null>(() => {
        try {
            const raw = localStorage.getItem('bingolfy-grid');
            return raw ? JSON.parse(raw) as number[][] : null;
        } catch {
            return null;
        }
    });
    const [playingUsers, setPlayingUsers] = useState<Player[]>([]);
    const [currentPlayer, setCurrentPlayer] = useState('');
    const [winner, setWinner] = useState<string | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const gridRef = useRef<number[][] | null>(null);

    const socket = useWebSocket(socketUrl);
    const apiUrl = socketUrl.replace(/^ws/, 'http').replace(/\/game$/, '') + '/api/rooms';
    const leaderboardApiUrl = socketUrl.replace(/^ws/, 'http').replace(/\/game$/, '') + '/api/leaderboard';

    useEffect(() => {
        gridRef.current = grid;
    }, [grid]);

    useEffect(() => {
        if (anonUser) localStorage.setItem('bingolfy-anon-name', anonUser);
        else localStorage.removeItem('bingolfy-anon-name');
    }, [anonUser]);

    useEffect(() => {
        if (room) localStorage.setItem('bingolfy-room', room);
        else localStorage.removeItem('bingolfy-room');
    }, [room]);

    useEffect(() => {
        if (grid) localStorage.setItem('bingolfy-grid', JSON.stringify(grid));
        else localStorage.removeItem('bingolfy-grid');
    }, [grid]);

    useEffect(() => {
        if (user || anonUser) {
            setUserDetails({
                name: user?.displayName || anonUser || '',
                email: user?.email || '',
                photo: user?.photoURL || '',
                uid: user?.uid || getAnonUid(),
            });
            if (screen === 'login') setScreen('lobby');
        }
    }, [user, anonUser, screen]);

    useEffect(() => {
        const unsubJoined = socket.subscribe("user_joined", (data: unknown) => {
            setPlayingUsers(data as Player[]);
        });
        const unsubNext = socket.subscribe("next_player", (data: unknown) => {
            setCurrentPlayer(data as string);
        });
        const unsubReady = socket.subscribe("all_ready", (data: unknown) => {
            const d = data as { firstPlayer: string };
            setCurrentPlayer(d.firstPlayer);
            setScreen('setup');
        });
        const unsubStarted = socket.subscribe("game_started", (data: unknown) => {
            const d = data as { firstPlayer: string };
            setCurrentPlayer(d.firstPlayer);
            setScreen('game');
        });
        const unsubGameState = socket.subscribe("game_state", (data: unknown) => {
            const d = data as { phase: string; calledNumbers: number[]; currentPlayer: string; lines: number; grid?: number[][]; winner?: string };
            if (d.currentPlayer) setCurrentPlayer(d.currentPlayer);
            if (d.grid && d.grid.length > 0) {
                setGrid(d.grid);
                gridRef.current = d.grid;
            }
            if (d.winner) setWinner(d.winner);
            if (d.phase === 'PLAYING' && gridRef.current) {
                setScreen('game');
            } else if (d.phase === 'FINISHED') {
                setScreen('game');
            } else if (d.phase === 'SETUP') {
                setScreen('setup');
            } else if (d.phase === 'WAITING') {
                setScreen('waiting');
            }
        });
        const unsubGameOver = socket.subscribe("game_over", (data: unknown) => {
            setWinner((data as Record<string, string>).user);
        });
        const unsubGameReset = socket.subscribe("game_reset", (data: unknown) => {
            const d = data as { firstPlayer: string };
            if (d.firstPlayer) setCurrentPlayer(d.firstPlayer);
            setWinner(null);
        });
        const unsubUserLeft = socket.subscribe("user_left", (data: unknown) => {
            const d = data as { user: string };
            setErrorMsg(`${d.user} left the game`);
            setTimeout(() => setErrorMsg(null), 4000);
        });
        const unsubAborted = socket.subscribe("game_aborted", (data: unknown) => {
            const reason = (data as { reason?: string }).reason;
            if (reason === 'setup') {
                setErrorMsg('Setup cancelled — waiting for players');
                setScreen('waiting');
            } else {
                setErrorMsg('Game ended — not enough players');
                setRoom('');
                setGrid(null);
                setPlayingUsers([]);
                setCurrentPlayer('');
                setScreen('lobby');
            }
            setTimeout(() => setErrorMsg(null), 4000);
        });
        const unsubError = socket.subscribe("error", (data: unknown) => {
            setErrorMsg(data as string);
            setTimeout(() => setErrorMsg(null), 4000);
        });
        return () => {
            unsubJoined(); unsubNext(); unsubReady();
            unsubStarted(); unsubGameState(); unsubGameOver(); unsubGameReset();
            unsubUserLeft(); unsubAborted(); unsubError();
        };
    }, [socket]);

    const [inviteRoom, setInviteRoom] = useState(() => new URLSearchParams(window.location.search).get('room') || '');

    const wasReadyRef = useRef(false);
    const wasEverReadyRef = useRef(false);
    useEffect(() => {
        if (socket.ready && !wasReadyRef.current && room && userDetails.name && !inviteRoom) {
            socket.send("join_room", { room, name: userDetails.name, uid: userDetails.uid });
            socket.send("request_state");
        }
        if (socket.ready) wasEverReadyRef.current = true;
        wasReadyRef.current = socket.ready;
    }, [socket.ready, room, userDetails.name, userDetails.uid, socket, inviteRoom]);

    const handleJoinRoom = useCallback((name: string) => {
        setRoom(name);
        socket.send("join_room", { room: name, name: userDetails.name, uid: userDetails.uid });
        setPlayingUsers([]);
        setGrid(null);
        setCurrentPlayer('');
        setWinner(null);
        setScreen('waiting');
    }, [socket, userDetails.name, userDetails.uid]);

    useEffect(() => {
        if (inviteRoom && socket.ready && userDetails.name && screen === 'lobby') {
            handleJoinRoom(inviteRoom);
            setInviteRoom('');
            window.history.replaceState({}, '', window.location.pathname);
        }
    }, [inviteRoom, socket.ready, userDetails.name, screen, handleJoinRoom]);

    const handleLeaveRoom = useCallback(() => {
        socket.send("leave_room");
        setRoom('');
        setPlayingUsers([]);
        setCurrentPlayer('');
        setScreen('lobby');
    }, [socket]);

    const handleReady = useCallback(() => {
        socket.send("user_ready", { user: userDetails.name, room });
    }, [socket, userDetails.name, room]);

    const handleSetupComplete = useCallback((g: number[][]) => {
        setGrid(g);
        socket.send("setup_complete", { grid: g });
    }, [socket]);

    const handleGoHome = useCallback(() => {
        socket.send("leave_room");
        setRoom('');
        setGrid(null);
        setPlayingUsers([]);
        setCurrentPlayer('');
        setScreen('lobby');
    }, [socket]);

    const isSignedIn = !!(user || anonUser);

    const handleSignOut = useCallback(() => {
        if (room) socket.send("leave_room");
        if (user) auth.signOut();
        setAnonUser(null);
        setUserDetails({ name: '', email: '', photo: '', uid: '' });
        setRoom('');
        setGrid(null);
        setPlayingUsers([]);
        setCurrentPlayer('');
        setScreen('login');
    }, [user, socket, room]);

    return (
        <ErrorBoundary>
            <>
                <NavBar onSignOut={handleSignOut} signedIn={isSignedIn} onNavigateToLeaderboard={() => setScreen('leaderboard')} />
                {!socket.ready && wasEverReadyRef.current && <div className="reconnect-banner">Reconnecting...</div>}
                {errorMsg && <div className="error-banner" role="alert">{errorMsg}</div>}
                <div className="screen-container">
                {screen === 'login' && <Login setAnonUser={setAnonUser} />}

                {screen === 'lobby' && isSignedIn && (
                    <Lobby onJoinRoom={handleJoinRoom} getApiUrl={apiUrl} leaderboardApiUrl={leaderboardApiUrl} onViewLeaderboard={() => setScreen('leaderboard')} />
                )}

                {screen === 'leaderboard' && (
                    <Leaderboard apiUrl={leaderboardApiUrl} onBack={() => setScreen(isSignedIn ? 'lobby' : 'login')} />
                )}

                {screen === 'waiting' && (
                    <WaitingRoom
                        room={room}
                        players={playingUsers}
                        myName={userDetails.name}
                        onReady={handleReady}
                        onLeave={handleLeaveRoom}
                    />
                )}

                {screen === 'setup' && (
                    <GameSetup
                        room={room}
                        playerCount={playingUsers.length}
                        onContinue={handleSetupComplete}
                    />
                )}

                {screen === 'game' && grid && (
                    <Game
                        room={room}
                        grid={grid}
                        myName={userDetails.name}
                        playingUsers={playingUsers}
                        currentPlayer={currentPlayer}
                        initialWinner={winner}
                        socket={socket}
                        onGoHome={handleGoHome}
                    />
                )}
            </div>
            </>
        </ErrorBoundary>
    );
}

export default App;
