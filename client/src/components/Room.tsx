import { useRef } from "react";
import "./styles/Room.css";

const Room = ({ setRoom, socket, name }) => {
    const roomInputRef = useRef();

    const clickHandler = (room) => {
        const selectedRoom = room ?? roomInputRef.current.value
        setRoom(selectedRoom);
        socket.emit("join_room", {room: selectedRoom, name: name});
    }

    return (
        <div className="room-container">
            <div>
                <h1><u>Select a Room</u></h1>
                {
                    ["one", "two", "three"].map(room => {
                        return (
                            <button
                                type="button"
                                key={room}
                                className="butt"
                                onClick={() => clickHandler(room)}
                            >
                                {room}
                            </button>
                        );
                    })
                }
            </div>

            <div className="divider" />

            <div>
                <h1><u>Create a Room</u></h1>
                <input
                    ref={roomInputRef}
                    placeholder="Enter room name..."
                    className="create-room-input"
                />
                <button
                    type="button"
                    onClick={() => clickHandler()}
                    className="create-room-button"
                >
                    Join
                </button>
            </div>
        </div>
    );
}

export default Room;
