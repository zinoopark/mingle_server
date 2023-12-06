import http from "http";
import { Server } from "socket.io";
import express from "express";
import cors from "cors";
import { instrument } from "@socket.io/admin-ui";

const app = express();

app.use(cors());
app.use("/public", express.static(__dirname + "/public"));

const httpServer = http.createServer(app);
const wsServer = new Server(httpServer, {
  cors: {
    origin: "*",
  },
});

// cors에 대한 설정을 하지 않으면, admin ui에서 socket.io를 사용할 수 없다.
// cors origin
instrument(wsServer, {
  auth: false,
});

const countRoomParticipants = (roomId) => {
  return wsServer.sockets.adapter.rooms.get(roomId)?.size;
};

const getPublicRooms = () => {
  const {
    sockets: {
      adapter: { sids, rooms },
    },
  } = wsServer;
  const publicRooms = [];
  rooms.forEach((_, key) => {
    if (sids.get(key) === undefined) {
      publicRooms.push(key);
    }
  });
  return publicRooms;
};

wsServer.on("connection", (socket) => {
  socket.onAny((event) => {
    console.log(`Socket Event: ${event}`);
  });

  socket.on("join_room", (roomId, setCount) => {
    console.log(socket.rooms);
    socket.join(roomId);
    console.log(socket.rooms);
    const newCount = countRoomParticipants(roomId);
    setCount?.(newCount);
    socket.to(roomId).emit("someone_joined", newCount);
  });

  socket.on("leave_room", (roomId) => {
    socket.leave(roomId);
    socket.to(roomId).emit("bye");
    // socket.to(room).emit("someone_left", countRoomParticipants(room) - 1);

    console.log(socket.rooms);
  });

  socket.on("message", (roomId, message, addMessage) => {
    console.log(socket.rooms);
    addMessage(message);
    socket.to(roomId).emit("message", message);
  });

  socket.on("disconnecting", (roomId) => {
    socket.rooms.forEach((room) =>
      socket.to(room).emit("someone_left", countRoomParticipants(room) - 1)
    );
  });

  socket.on("disconnect", () => {
    console.log("Disconnected from the Browser");
    socket.to();
    console.log(socket.rooms);
  });

  socket.on("offer", (roomId, offer) => {
    socket.to(roomId).emit("offer", offer);
  });

  socket.on("answer", (roomId, answer) => {
    socket.to(roomId).emit("answer", answer);
  });

  // socket.on("offer", (offer, roomId) => {
  //   socket.to(roomId).emit("offer", offer);
  // });
  // socket.on("answer", (answer, roomId) => {
  //   socket.to(roomId).emit("answer", answer);
  // });
  // socket.on("ice", (ice, roomId) => {
  //   socket.to(roomId).emit("ice", ice);
  // });
});

const handleListen = () => console.log("Listening on http://localhost:4000");
httpServer.listen(4000, handleListen);
