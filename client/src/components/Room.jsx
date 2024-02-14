import "./styles/Room.css";

const Room = ({ setRoom, socket, name }) => {

    const clickHandler = (room) => {
        setRoom(room);
        socket.emit("join_room", {room: room, name: name});
    }

    return (
        <div className="room-container">
            <h1><u>Select a Room</u></h1>
            {
                ["one", "two", "three"].map(room => {
                    return (
                        <button
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
    );
}

export default Room;
