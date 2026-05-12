import { useRef, useState } from "react";
import { GoogleAuthProvider, signInWithRedirect } from "firebase/auth";
import { auth } from "../firebase";

const provider = new GoogleAuthProvider();

const Spinner = () => (
    <span className="spinner" aria-hidden="true" />
);

const GoogleSvg = () => (
    <svg viewBox="0 0 48 48">
        <path fill="#ffc107" d="M43.6 20.1H42V20H24v8h11.3a12 12 0 0 1-11.3 8c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.2 8 3l5.6-5.6A20 20 0 0 0 24 4 20 20 0 1 0 44 24c0-1.3-.1-2.6-.4-3.9z" />
        <path fill="#ff3d00" d="m6.3 14.7 6.6 4.8C14.7 15 19 12 24 12c3 0 5.8 1.2 8 3l5.6-5.6A20 20 0 0 0 24 4a20 20 0 0 0-17.7 10.7z" />
        <path fill="#4caf50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2A12 12 0 0 1 24 36a12 12 0 0 1-11.3-8l-6.5 5A20 20 0 0 0 24 44z" />
        <path fill="#1976d2" d="M43.6 20.1H42V20H24v8h11.3a12 12 0 0 1-4 5.6l6.2 5.2A20 20 0 0 0 44 24c0-1.3-.1-2.6-.4-3.9z" />
    </svg>
);

const Login = ({ setAnonUser }: { setAnonUser: (name: string) => void }) => {
    const inpRef = useRef<HTMLInputElement>(null);
    const [googleLoading, setGoogleLoading] = useState(false);

    const googleSignIn = () => {
        setGoogleLoading(true);
        signInWithRedirect(auth, provider);
    };

    const handleAnonSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const name = inpRef.current?.value.trim();
        if (name && name.length >= 2) {
            setAnonUser(name);
        }
    };

    return (
        <div className="login-layout">
            <div className="login-brand">
                <h1><span className="accent">BINGO</span>LFY</h1>
                <p className="tagline">Real-time multiplayer bingo. Pick numbers, fill lines, call it first.</p>
            </div>
            <div className="login-form">
                <h2>PLAY</h2>
                <button className="google-btn" onClick={googleSignIn} disabled={googleLoading} aria-label="Sign in with Google">
                    {googleLoading ? <Spinner /> : <GoogleSvg />}
                    {googleLoading ? 'SIGNING IN...' : 'SIGN IN WITH GOOGLE'}
                </button>
                <div className="divider">or</div>
                <form className="anon-form" onSubmit={handleAnonSubmit} aria-label="Anonymous login">
                    <p style={{ fontSize: '.75rem', color: 'var(--muted)', marginBottom: 'var(--space-xs)' }}>
                        Play with a nickname — no account needed
                    </p>
                    <div className="anon-row">
                        <input
                            type="text"
                            ref={inpRef}
                            placeholder="noobmaster69"
                            required
                            minLength={2}
                            maxLength={20}
                            aria-label="Display name"
                        />
                        <button className="btn btn-primary" type="submit">PLAY</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Login;
