const express = require("express");
const http = require("http");
const path = require("path");
const socketio = require("socket.io");
const Filter = require("bad-words");

const { generateMessage } = require("./utils/messages");
const { addUser, getUser, getUsersInRoom, removeUser } = require("./utils/users");

const app = express();
const server = http.createServer(app);
const io = socketio(server);

const PORT = process.env.PORT || 3000;
const publicPath = path.join(__dirname, "../public");

app.use(express.static(publicPath));

io.on("connection", (socket) => {
  socket.on("join", ({ username, room }, callback) => {
    const {error, user} = addUser({ id: socket.id, username, room });
    if(error) {
      return callback(error);
    }

    socket.join(user.room);
    
    socket.emit("message", generateMessage("Admin", "Welcome!"));
    socket.broadcast.to(user.room).emit('message', generateMessage("Admin", `${user.username} has joined!`));
    io.to(user.room).emit("roomData", {
      room: user.room,
      users: getUsersInRoom(user.room)
    });
    callback();
  });

  socket.on("sendMessage", (socketMessage, callback) => {
    const user = getUser(socket.id);
    const filter = new Filter();
    if(filter.isProfane(socketMessage)) {
      return callback("Profanity is not allowed");
    }
    io.to(user.room).emit("message", generateMessage(user.username, socketMessage));
    callback();
  });

  socket.on("sendLocation", (socketLocation, callback) => {
    const user = getUser(socket.id);
    socket.broadcast.to(user.room).emit(
      "locationMessage", 
      generateMessage(user.username, `https://www.google.com/maps/?q=${socketLocation.longitude},${socketLocation.latitude}`)
    );
    callback();
  });

  socket.on("disconnect", () => {
    const user = removeUser(socket.id);
    if(user) {
      io.to(user.room).emit("message", generateMessage("Admin", `${user.username} has left.`));
      io.to(user.room).emit("roomData", {
        room: user.room,
        users: getUsersInRoom(user.room)
      });
    } 
  });
});

server.listen(PORT, () => {
  console.log("Server is up on port " + PORT);
})