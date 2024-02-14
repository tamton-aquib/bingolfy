import express from "express";
import cors from "cors";
import { Server } from "socket.io";
import http from "http";

const app = express();
app.use(cors());

const users = {}

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "https://bingolfy-a6fx.onrender.com:5173/" } })

io.on("connection", (socket) => {
    console.log(`User ${socket.id} connected!`);

    socket.on("join_room", ({room, name}) => {
        if (users.hasOwnProperty(room)) {
            if (!users[room].includes(name)) {
                users[room].push(name);
            }
        } else {
            users[room] = [name];
        }

        // if (!users[data.room]) users[data.room] = [];

        socket.join(room);

        console.log("Room clients: ", users[room])
        // socket.to(room).emit("user_joined", users[room]);
        socket.broadcast.emit("user_joined", users[room]);
    })

    socket.on("tile_clicked", (data) => {
        socket.to(data.room).emit("flush", data.tiles);
    })

    socket.on("user_won", (data) => {
        socket.broadcast.emit("game_over", data);
    })

    socket.on("error", (error) => {
        console.error("Socket error:", error);
    });

})

server.listen(5174, () => {
    console.log("Server started!");
})
