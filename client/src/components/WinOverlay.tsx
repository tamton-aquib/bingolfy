import { useEffect } from "react";
import { useConfetti } from "../hooks/useConfetti";

interface WinOverlayProps {
    winnerName: string;
    onPlayAgain: () => void;
    onGoHome: () => void;
    visible: boolean;
}

const WinOverlay = ({ winnerName, onPlayAgain, onGoHome, visible }: WinOverlayProps) => {
    const { start, stop } = useConfetti();

    useEffect(() => {
        if (visible) {
            start();
        } else {
            stop();
        }
    }, [visible, start, stop]);

    return (
        <>
            <div className={`win-overlay${visible ? ' active' : ''}`} role="dialog" aria-modal="true" aria-label="Winner announcement">
                <div className="win-card">
                    <h1>BINGO!</h1>
                    <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: 'var(--fg)', marginBottom: 0, fontWeight: 700 }}>
                        {winnerName}
                    </p>
                    <p style={{ marginBottom: 'var(--space-lg)', fontSize: '.875rem', color: 'var(--muted)' }}>Called BINGO!</p>
                    <div style={{ display: 'flex', gap: 'var(--space-sm)', justifyContent: 'center', marginBottom: 'var(--space-lg)' }}>
                        {['B', 'I', 'N', 'G', 'O'].map(l => (
                            <span key={l} className="win-letter">{l}</span>
                        ))}
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'center' }}>
                        <button className="btn" onClick={onGoHome}>GO HOME</button>
                        <button className="btn btn-primary btn-lg" onClick={onPlayAgain}>PLAY AGAIN</button>
                    </div>
                </div>
            </div>
            <canvas id="confetti-canvas" />
        </>
    );
};

export default WinOverlay;
