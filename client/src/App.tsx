import { useEffect, useState, useCallback } from 'react';
import { useAuthState } from "react-firebase-hooks/auth";

import NavBar from './components/NavBar';
import Login from './components/Login';
import Lobby from './components/Lobby';
import WaitingRoom from './components/WaitingRoom';
import GameSetup from './components/GameSetup';
import Game from './components/Game';
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

type Screen = 'login' | 'lobby' | 'waiting' | 'setup' | 'game';

function App() {
    const [user] = useAuthState(auth);
    const [anonUser, setAnonUser] = useState<string | null>(null);
    const [userDetails, setUserDetails] = useState({ name: '', email: '', photo: '', uid: '' });
    const [screen, setScreen] = useState<Screen>('login');
    const [room, setRoom] = useState('');
    const [grid, setGrid] = useState<number[][] | null>(null);
    const [playingUsers, setPlayingUsers] = useState<Player[]>([]);
    const [currentPlayer, setCurrentPlayer] = useState('');

    const socket = useWebSocket(socketUrl);
    const apiUrl = socketUrl.replace(/^ws/, 'http').replace(/\/game$/, '') + '/api/rooms';

    useEffect(() => {
        if (user || anonUser) {
            setUserDetails({
                name: user?.displayName || anonUser || '',
                email: user?.email || '',
                photo: user?.photoURL || '',
                uid: user?.uid || String(Math.random() * 100),
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
        return () => {
            unsubJoined(); unsubNext(); unsubReady();
            unsubStarted();
        };
    }, [socket]);

    const handleJoinRoom = useCallback((name: string) => {
        setRoom(name);
        socket.send("join_room", { room: name, name: userDetails.name });
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
        socket.send("setup_complete");
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
        if (user) {
            auth.signOut();
        }
        setAnonUser(null);
        setUserDetails({ name: '', email: '', photo: '', uid: '' });
        setRoom('');
        setGrid(null);
        setPlayingUsers([]);
        setCurrentPlayer('');
        setScreen('login');
    }, [user]);

    return (
        <>
            <NavBar onSignOut={handleSignOut} signedIn={isSignedIn} />
            <div className="screen-container">
            {screen === 'login' && <Login setAnonUser={setAnonUser} />}

            {screen === 'lobby' && (
                <Lobby onJoinRoom={handleJoinRoom} getApiUrl={apiUrl} />
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
    );
}

export default App;
