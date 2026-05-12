const BingoProgress = ({ lines }: { lines: number }) => {
    const letters = ['B', 'I', 'N', 'G', 'O'];
    return (
        <div className="bingo-progress" aria-label="BINGO progress">
            {letters.map((l, i) => (
                <span
                    key={l}
                    className={
                        i < lines ? 'completed' :
                        i === lines ? 'lit' : ''
                    }
                >
                    {l}
                </span>
            ))}
        </div>
    );
};

export default BingoProgress;
