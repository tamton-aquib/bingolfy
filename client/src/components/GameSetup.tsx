import { useState } from "react";
import "./styles/Game.css";

const GRID = [
    [1, 2, 3, 4, 5],
    [6, 7, 8, 9, 10],
    [11, 12, 13, 14, 15],
    [16, 17, 18, 19, 20],
    [21, 22, 23, 24, 25]
];

const GameSetup = ({ setGrid }) => {
    const shuffleGrid = (grid) =>  {
        const cgrid = [...grid];
        for (let i = cgrid.length - 1; i > 0; i--) {
            for (let j = cgrid[i].length - 1; j > 0; j--) {
                const randomRow = Math.floor(Math.random() * (i + 1));
                const randomCol = Math.floor(Math.random() * (j + 1));
                [grid[i][j], grid[randomRow][randomCol]] = [grid[randomRow][randomCol], grid[i][j]];
            }
        }
        return cgrid;
    }

    const [gridNumbers, setGridNumbers] = useState(shuffleGrid(GRID));

    return (
        <div style={{display: "flex", flexDirection: "column"}}>
            <div className="game-grid">
                {gridNumbers.map(row => {
                    return row.map(col => {
                        return <div
                            key={col}
                            className="game-grid-box"
                            id={col}
                        >
                            {col}
                        </div>
                    })
                })}
            </div>

            <div className="setup-button-container">
                <button className="setup-button" onClick={() => {
                    setGridNumbers(g => shuffleGrid(g))
                }}>Shuffle</button>
                <button className="setup-button" onClick={() => setGrid(gridNumbers)}>Continue</button>
            </div>
        </div>
    )
};

export default GameSetup;
