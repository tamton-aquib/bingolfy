import './App.css';
import Login from './components/Login';
import NavBar from './components/NavBar';
import GameSetup from './components/GameSetup';
import Game from './components/Game';
import Room from './components/Room';
import io from "socket.io-client";

import { auth } from "./firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { useEffect, useState } from 'react';

const socket = io.connect("https://bingolfy.onrender.com/");

function App() {
    const [user] = useAuthState(auth);
    const [userDetails, setUserDetails] = useState({});
    const [grid, setGrid] = useState();
    const [room, setRoom] = useState();
    const [playingUsers, setPlayingUsers] = useState([]);

    useEffect(() => {
        if (user) {
            setUserDetails({
                name: user.displayName,
                email: user.email,
                photo: user.photoURL,
                uid: user.uid
            })
        }
    }, [user]);

    useEffect(() => {

        socket.on("user_joined", (users) => {
            console.log("Called user_joined: ", users);
            // const concated = [...p, ...users]
            // setPlayingUsers(p => concated.filter((name, index) => concated.indexOf(name) == index));
            setPlayingUsers(users);
        });

    }, [socket]);

    return (
        <div className="App">
            <NavBar />
            <div>
                {
                    !user
                        ?
                        <Login />
                        :
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
                }
            </div>
        </div>
    )
}

export default App;
