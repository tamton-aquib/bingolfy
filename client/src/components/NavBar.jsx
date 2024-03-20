import GoogleSignin from "../assets/google_signin.png";

import { auth } from "../firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { GoogleAuthProvider, signInWithRedirect } from "firebase/auth";

import "./styles/NavBar.css";

const NavBar = () => {
    const [user] = useAuthState(auth);

    const googleSignIn = () => {
        const provider = new GoogleAuthProvider();
        signInWithRedirect(auth, provider);
    };
    const googleSignOut = () => {
        auth.signOut();
    };

    return (
        <nav className="nav-bar">
            {user ? (
                <button onClick={googleSignOut} className="sign-out" type="button">
                    Sign Out
                </button>
            ) : (
                    <button type="submit" className="sign-in">
                        {/* biome-ignore lint/a11y/useKeyWithClickEvents: <explanation> */}
                        <img
                            onClick={googleSignIn}
                            src={GoogleSignin}
                            alt="sign in with google"
                            type="button"
                        />
                    </button>
                )}
        </nav>
    );
};
export default NavBar;
