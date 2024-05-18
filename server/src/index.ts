import express from "express";
import cors from "cors";
import { Server } from "socket.io";
import http from "http";
import { User, Rooms } from "../../types/types";

const app = express();
app.use(cors());

const rooms: Rooms = {}

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: process.env.DEBUG ?
            "http://localhost:5173" :
            "https://bingolfy.onrender.com"
    }
})

io.on("connection", (socket) => {
    console.log(`User ${socket.id} connected!`);

    socket.on("join_room", ({room, name}) => {
        if (rooms.hasOwnProperty(room)) {
            const foundUser = rooms[room].find((user: User) => user.name === name)
            if (!foundUser) {
                rooms[room].push({name: name, ready: false});
            } else {
                const foundItem = rooms[room].find((user: User) => user.name === name);
                if (foundItem)
                    foundItem.ready = false;
            }
        } else {
            rooms[room] = [{name: name, ready: false}];
        }

        socket.join(room);

        console.log("Users in the room: ", rooms[room])
        io.to(room).emit("user_joined", rooms[room]);
    })

    socket.on("tile_clicked", (data) => {
        socket.to(data.room).emit("flush", data.tiles);
    })

    socket.on("user_won", (data) => {
        io.to(data.room).emit("game_over", data);
    })

    socket.on("user_ready", (data) => {
        const foundItem = rooms[data.room].find((user: User) => user.name === data.user);
        if (foundItem)
            foundItem.ready = true;

        io.to(data.room).emit("user_joined", rooms[data.room]);

        if (!rooms[data.room].filter((player: User) => !player.ready).length) {
            let randomPlayer = rooms[data.room][Math.floor(Math.random() * rooms[data.room].length)];
            console.log("Everyones ready, sending random player: ", randomPlayer.name)
            io.to(data.room).emit("next_player", randomPlayer.name)
        }
    })

    socket.on("set_next_player", (data) => {
        io.to(data.room).emit("next_player", data.user)
    })

    socket.on("error", (error) => {
        console.error("Socket error:", error);
    });

})

server.listen(5174, () => {
    console.log("Server started!");
})
