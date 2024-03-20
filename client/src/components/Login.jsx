import { useRef } from "react";
import "./styles/Login.css";

const Login = ({setAnonUser}) => {
    const inpRef = useRef();

    const onClickHandler = () => {
        setAnonUser(inpRef.current.value)
    }

    return (
        <>
            <div className="login">
                Click navbar to login!
            </div>
            OR Login anonymously!
            <div>
                <input ref={inpRef} placeholder="Enter name..." />
                <button type="button" onClick={onClickHandler}>
                    {"->"}
                </button>
            </div>
        </>
    )
};

export default Login;
