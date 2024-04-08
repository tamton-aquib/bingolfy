import GoogleSignin from "../assets/google_signin.png";
import { auth } from "../firebase";
import { useRef } from "react";
import { GoogleAuthProvider, signInWithRedirect } from "firebase/auth";
import "./styles/Login.css";


const Login = ({setAnonUser}) => {
    const inpRef = useRef();

    const onClickHandler = () => {
        setAnonUser(inpRef.current.value)
    }

    const googleSignIn = () => {
        const provider = new GoogleAuthProvider();
        signInWithRedirect(auth, provider);
		console.log("Called google sign in!")
    };

    return (
        <div className="login-container">
            <div className="login">
				<button type="submit" className="sign-in">
					{/* biome-ignore lint/a11y/useKeyWithClickEvents: <explanation> */}
					<img
						onClick={googleSignIn}
						src={GoogleSignin}
						alt="sign in with google"
						type="button"
					/>
				</button>
            </div>
			<div className="OR"> OR </div>
            <span className="spanned">
                <input name="name" ref={inpRef} className="create-room-input" placeholder="Login anonymously..." />
                <button type="button" className="setup-button" onClick={onClickHandler}>
                    PLAY
                </button>
            </span>
        </div>
    )
};

export default Login;
