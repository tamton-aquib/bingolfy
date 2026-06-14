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
    const [anonUser, setAnonUser] = useState<string | null>(null);
    const [userDetails, setUserDetails] = useState({ name: '', email: '', photo: '', uid: '' });
    const [screen, setScreen] = useState<Screen>('login');
    const [room, setRoom] = useState('');
    const [grid, setGrid] = useState<number[][] | null>(null);
    const [playingUsers, setPlayingUsers] = useState<Player[]>([]);
    const [currentPlayer, setCurrentPlayer] = useState('');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const gridRef = useRef<number[][] | null>(null);

    const socket = useWebSocket(socketUrl);
    const apiUrl = socketUrl.replace(/^ws/, 'http').replace(/\/game$/, '') + '/api/rooms';
    const leaderboardApiUrl = socketUrl.replace(/^ws/, 'http').replace(/\/game$/, '') + '/api/leaderboard';

    useEffect(() => {
        gridRef.current = grid;
    }, [grid]);

    useEffect(() => {
        if (user || anonUser) {
            setUserDetails({
                name: user?.displayName || anonUser || '',
                email: user?.email || '',
                photo: user?.photoURL || '',
                uid: user?.uid || '',
            });
            if (screen === 'login') setScreen('lobby');
        }
    }, [user, anonUser]);

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
            const d = data as { phase: string; calledNumbers: number[]; currentPlayer: string; lines: number };
            if (d.currentPlayer) setCurrentPlayer(d.currentPlayer);
            if (d.phase === 'PLAYING' && gridRef.current) {
                setScreen('game');
            } else if (d.phase === 'FINISHED') {
                setScreen('game');
            }
        });
        const unsubError = socket.subscribe("error", (data: unknown) => {
            setErrorMsg(data as string);
            setTimeout(() => setErrorMsg(null), 4000);
        });
        return () => {
            unsubJoined(); unsubNext(); unsubReady();
            unsubStarted(); unsubGameState(); unsubError();
        };
    }, [socket]);

    const wasReadyRef = useRef(false);
    const wasEverReadyRef = useRef(false);
    useEffect(() => {
        if (socket.ready && !wasReadyRef.current && room && userDetails.name) {
            socket.send("join_room", { room, name: userDetails.name, uid: userDetails.uid });
            if (grid) {
                socket.send("request_state");
            }
        }
        if (socket.ready) wasEverReadyRef.current = true;
        wasReadyRef.current = socket.ready;
    }, [socket.ready, room, userDetails.name, grid]);

    const handleJoinRoom = useCallback((name: string) => {
        setRoom(name);
        socket.send("join_room", { room: name, name: userDetails.name, uid: userDetails.uid });
        setPlayingUsers([]);
        setGrid(null);
        setCurrentPlayer('');
        setScreen('waiting');
    }, [socket, userDetails.name]);

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

                {screen === 'lobby' && (
                    <Lobby onJoinRoom={handleJoinRoom} getApiUrl={apiUrl} leaderboardApiUrl={leaderboardApiUrl} onViewLeaderboard={() => setScreen('leaderboard')} />
                )}

                {screen === 'leaderboard' && (
                    <Leaderboard apiUrl={leaderboardApiUrl} onBack={() => setScreen('lobby')} />
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
