import { auth } from "../firebase";
import { useAuthState } from "react-firebase-hooks/auth";

import "./styles/NavBar.css";

const NavBar = () => {
    const [user] = useAuthState(auth);

    const googleSignOut = () => {
        auth.signOut();
    };

    return (
        <nav className="nav-bar">
            {user && (
                <button onClick={googleSignOut} className="sign-out" type="button">
                    Sign Out
                </button>
            )}
        </nav>
    );
};
export default NavBar;
