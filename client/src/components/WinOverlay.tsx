import { useEffect, useRef, useCallback } from "react";
import { useConfetti } from "../hooks/useConfetti";

interface WinOverlayProps {
    winnerName: string;
    onGoHome: () => void;
    onPlayAgain: () => void;
    visible: boolean;
}

const WinOverlay = ({ winnerName, onGoHome, onPlayAgain, visible }: WinOverlayProps) => {
    const { start, stop } = useConfetti();
    const cardRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (visible) {
            start();
        } else {
            stop();
        }
    }, [visible, start, stop]);

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (!visible) return;

        if (e.key === 'Escape') {
            e.preventDefault();
            onGoHome();
            return;
        }

        if (e.key === 'Tab' && cardRef.current) {
            const focusable = cardRef.current.querySelectorAll<HTMLElement>(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
            if (focusable.length === 0) return;
            const first = focusable[0];
            const last = focusable[focusable.length - 1];

            if (e.shiftKey) {
                if (document.activeElement === first) {
                    e.preventDefault();
                    last.focus();
                }
            } else {
                if (document.activeElement === last) {
                    e.preventDefault();
                    first.focus();
                }
            }
        }
    }, [visible, onGoHome]);

    useEffect(() => {
        if (visible) {
            document.addEventListener('keydown', handleKeyDown);
            const firstBtn = cardRef.current?.querySelector<HTMLElement>('button');
            firstBtn?.focus();
        }
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [visible, handleKeyDown]);

    return (
        <>
            <div className={`win-overlay${visible ? ' active' : ''}`} role="dialog" aria-modal="true" aria-label="Winner announcement">
                <div className="win-card" ref={cardRef}>
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
                        <button className="btn btn-primary btn-lg" onClick={onPlayAgain}>PLAY AGAIN</button>
                        <button className="btn btn-lg" onClick={onGoHome}>GO HOME</button>
                    </div>
                </div>
            </div>
            <canvas id="confetti-canvas" aria-hidden="true" />
        </>
    );
};

export default WinOverlay;
