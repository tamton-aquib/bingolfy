import { useState, useEffect } from "react";
import "./styles/Game.css";

const Game = ({ playingUsers, room, userDetails, socket, grid, setGrid }) => {
    const generateWinningPattern = (g) => {

        // Thanks to chatGPT for generating this.
        return [
            // Rows
            [g[0][0], g[0][1], g[0][2], g[0][3], g[0][4]],
            [g[1][0], g[1][1], g[1][2], g[1][3], g[1][4]],
            [g[2][0], g[2][1], g[2][2], g[2][3], g[2][4]],
            [g[3][0], g[3][1], g[3][2], g[3][3], g[3][4]],
            [g[4][0], g[4][1], g[4][2], g[4][3], g[4][4]],

            // Columns
            [g[0][0], g[1][0], g[2][0], g[3][0], g[4][0]],
            [g[0][1], g[1][1], g[2][1], g[3][1], g[4][1]],
            [g[0][2], g[1][2], g[2][2], g[3][2], g[4][2]],
            [g[0][3], g[1][3], g[2][3], g[3][3], g[4][3]],
            [g[0][4], g[1][4], g[2][4], g[3][4], g[4][4]],

            //Diagonals
            [g[0][0], g[1][1], g[2][2], g[3][3], g[4][4]],
            [g[0][4], g[1][3], g[2][2], g[3][1], g[4][0]]
        ];

    }

    const winningCombos = generateWinningPattern(grid);

    const [clickedTiles, setClickedTiles] = useState([]);
    const [score, setScore] = useState(0);
    const [wonUser, setWonUser] = useState();
    const [currentPlayer, setCurrentPlayer] = useState();

    const gridNumbers = grid.map(row => row.map(col => (
        // biome-ignore lint/a11y/useKeyWithClickEvents: <explanation>
        <div
            key={col}
            id={col}
            className="game-grid-box game-grid-element"
            onClick={() => tileClickHandler(col)}
        >
            {col}
        </div>
    )));

    const tileClickHandler = (n) => {
        if (!currentPlayer || currentPlayer !== userDetails.name || clickedTiles.includes(n)) return;

        document.getElementById(n).style.backgroundColor = "#9ce5c0";
        document.getElementById(n).style.color = "#000000";
        setClickedTiles(p => {
            socket.emit(
                "tile_clicked",
                {
                    tiles: [...p, n],
                    room: room,
                }
            );
            return [...p, n];
        });

        const idx = playingUsers.findIndex(player => player.name === currentPlayer);
        const nextPlayer = playingUsers[(idx+1) % playingUsers.length]
        if (nextPlayer) {
            socket.emit("set_next_player", {user: nextPlayer.name, room: room})
        }
    }

    /// Check GameOver
    // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
    useEffect(() => {
        const score = winningCombos.filter(row => row.filter(item => clickedTiles.includes(item)).length === 5).length;
        setScore(score);
    }, [clickedTiles])

    useEffect(() => {
        socket.on("flush", (data) => {
            document.getElementById(data[data.length-1]).style.backgroundColor = "#9ce5c0"
            document.getElementById(data[data.length-1]).style.color = "#000000"
            setClickedTiles(data);
        })

        socket.on("next_player", (data) => {
            setCurrentPlayer(data)
        })

        socket.on("game_over", (data) => {
            setWonUser(data.user);
        })
    }, [socket]);

    const userReadyHandler = () => {
        socket.emit("user_ready", {user: userDetails.name, room: room})
    }

    const GameOver = () => {
        setWonUser(userDetails.name);
        socket.emit("user_won", {user: userDetails.name, room: room});
    }

    // FIX: reidrect to select room page?
    const restartGame = () => {
        setWonUser(null);
        setScore(0);
        setGrid(null);
    }


    return (
        <div className="game-container">
            {
                wonUser
                    ?
                    <>
                        <h1>{wonUser} Called BINGO!</h1>
                        <button className="bingo-button" onClick={restartGame} type="reset">Restart</button>
                    </>
                    :
                    <>
                        {/* <p> Hi {userDetails.name}</p> */}
                        <h1>Room: {room}</h1>

                        {
                            score >= 5
                                ?
                                <button className="bingo-button" onClick={GameOver} type="button">
                                    BINGO
                                </button>
                                :
                                <span>
                                    {"BINGO".slice(0, score)}
                                </span>
                        }

                        <div className="ingame-container">
                            <div className="game-grid">
                                {gridNumbers}
                            </div>

                            <ul className="user-list">
                                { playingUsers.length ?
                                    <>
                                        {currentPlayer ? `${currentPlayer}'s Turn!` : ""}
                                        <div className="user-list-header">
                                            Players
                                        </div>
                                    </>
                                    : ''
                                }
                                {
                                    playingUsers.map(player => {
                                        return (
                                            <li
                                                className={`user-list-item ${player.ready && "ready-user"}`}
                                                key={player.name}
                                            >
                                                { player.name }
                                                { (player.name === userDetails.name && !player.ready) &&
                                                    <button onClick={userReadyHandler} type="button">
                                                        Ready
                                                    </button>
                                                }
                                            </li>
                                        )
                                    })
                                }
                            </ul>
                        </div>

                    </>
            }
        </div>
    );
}

export default Game;
