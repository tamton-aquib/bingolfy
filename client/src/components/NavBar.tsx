import ThemeToggle from "./ThemeToggle";

interface NavBarProps {
    signedIn: boolean;
    onSignOut: () => void;
    onNavigateToLeaderboard?: () => void;
}

const NavBar = ({ signedIn, onSignOut, onNavigateToLeaderboard }: NavBarProps) => {
    return (
        <nav className="nav" role="navigation" aria-label="Main navigation">
            <div className="nav-logo"><span className="accent">BINGO</span>LFY</div>
            <div className="nav-actions">
                {signedIn && onNavigateToLeaderboard && (
                    <button className="sign-out-btn" onClick={onNavigateToLeaderboard}>LEADERBOARD</button>
                )}
                <ThemeToggle />
                {signedIn && (
                    <button className="sign-out-btn" onClick={onSignOut}>SIGN OUT</button>
                )}
            </div>
        </nav>
    );
};

export default NavBar;
