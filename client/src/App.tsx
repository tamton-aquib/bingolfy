import Login from './components/Login';
import NavBar from './components/NavBar';
import GameSetup from './components/GameSetup';
import Game from './components/Game';
import Room from './components/Room';
import io from "socket.io-client";

import { auth } from "./firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { useEffect, useState } from 'react';

const socket = io.connect(
    import.meta.env.VITE_DEBUG ?
    "http://localhost:5174" :
    "https://bingolfy-backend.onrender.com/"
);

function App() {
    const [user] = useAuthState(auth);
    const [userDetails, setUserDetails] = useState({});
    const [anonUser, setAnonUser] = useState();
    const [grid, setGrid] = useState();
    const [room, setRoom] = useState();
    const [playingUsers, setPlayingUsers] = useState([]);

    useEffect(() => {
        if (user || anonUser) {
            setUserDetails({
                name: user?.displayName || anonUser,
                email: user?.email,
                photo: user?.photoURL,
                uid: user?.uid || (Math.random()*100)
            })
        }
    }, [user, anonUser]);

    useEffect(() => {
        socket.on("user_joined", setPlayingUsers);
    }, []);

    return (
        <div className="App">
            <NavBar />

            <div>
                {
                    (user || anonUser)
                        ?
                        (!room ?
                            <Room name={userDetails.name} room={room} setRoom={setRoom} socket={socket} /> :
                            (
                                !grid ?
                                    <GameSetup
                                        setGrid={setGrid}
                                    /> :
                                    <Game
                                        playingUsers={playingUsers}
                                        room={room}
                                        userDetails={userDetails}
                                        socket={socket}
                                        grid={grid}
                                        setGrid={setGrid}
                                    />
                            )
                        )
                        :
                        <Login setAnonUser={setAnonUser} />
                }
            </div>

        </div>
    )
}

export default App;
