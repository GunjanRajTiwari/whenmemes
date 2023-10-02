const { Server } = require("socket.io");
const { generateRoomId } = require("./util/room");
const express = require("express");
const app = express();
const server = require("http").createServer(app);

app.use(express.static("client/build"));

// app.get("*", function (req, res) {
// 	res.sendFile("index.html");
// });

if (process.env.NODE_ENV === "production") {
	const path = require("path");
	app.use(express.static(path.resolve(__dirname, "client", "build")));
	app.get("*", (req, res) => {
		res.sendFile(
			path.resolve(__dirname, "client", "build", "index.html"),
			function (err) {
				if (err) {
					res.status(500).send(err);
				}
			}
		);
	});
}

server.listen(process.env.PORT || 8000, () => {
	console.log("Server Started");
});

const io = new Server(server);

// TODO
const MAX_PLAYERS = 7;
const MIN_PLAYERS = 3;
const rooms = {};

io.on("connection", socket => {
	socket.on("room.create", callback => {
		const roomId = generateRoomId(8);
		rooms[roomId] = { turn: 0, players: [] };
		callback({ roomId });
	});

	socket.on("room.join", (roomId, nickname, callback) => {
		if (!rooms[roomId]) rooms[roomId] = { turn: 0, players: [] };
		if (rooms[roomId]?.players?.some(p => p.socketId == socket.id))
			return;
		rooms[roomId]?.players?.push({
			nickname,
			socketId: socket.id,
			ready: false,
			score: 0,
			choice: null,
			voted: false,
		});
		socket.join(roomId);
		console.log("room joined");
		callback(rooms[roomId]);
		socket.broadcast.to(roomId).emit("room.changed", rooms[roomId]);
	});

	socket.on("player.ready", (roomId, ready) => {
		let readyCount = 0;
		rooms[roomId]?.players?.map(player => {
			if (player.socketId === socket.id) {
				player.ready = ready;
			}
			if (player.ready) ++readyCount;
			return player;
		});
		io.to(roomId).emit("room.changed", rooms[roomId]);
		if (
			readyCount >= MIN_PLAYERS &&
			readyCount == rooms[roomId]?.players?.length
		) {
			io.to(roomId).emit("room.start", rooms[roomId]);
		}
	});

	socket.on("room.choice.post", (roomId, image, callback) => {
		let readyCount = 0;
		rooms[roomId]?.players?.map(player => {
			if (player.socketId === socket.id) {
				player.choice = image;
			}
			if (player.choice) ++readyCount;
			return player;
		});
		callback();
		if (
			readyCount >= MIN_PLAYERS &&
			readyCount == rooms[roomId]?.players?.length
		) {
			io.to(roomId).emit("room.vote", rooms[roomId]);
		}
	});

	socket.on("room.vote.post", (roomId, vote, callback) => {
		let voteCount = 0;
		rooms[roomId]?.players?.map(player => {
			if (player.socketId === vote) {
				player.score = player.score + 5;
			}
			if (player.socketId === socket.id) {
				player.voted = true;
			}
			if (player.voted) ++voteCount;
			return player;
		});

		callback();
		if (
			voteCount >= MIN_PLAYERS &&
			voteCount == rooms[roomId]?.players?.length
		) {
			rooms[roomId].turn =
				(rooms[roomId].turn + 1) % rooms[roomId].players.length;
			console.log(rooms[roomId].turn);
			rooms[roomId]?.players?.map(player => {
				player.ready = false;
				player.choice = null;
				player.voted = false;
				return player;
			});
			io.to(roomId).emit("room.gameover", rooms[roomId]);
		}
	});

	socket.on("room.prompt.post", (roomId, prompt) => {
		io.to(roomId).emit("room.prompt", prompt);
	});

	socket.on("disconnecting", () => {
		if (socket.rooms.length < 2) return;
		socket.rooms.forEach(roomId => {
			if (roomId.length === 8) {
				rooms[roomId] = rooms[roomId]?.players?.filter(
					player => player.socketId != socket.id
				);
				// if (rooms[roomId].turn >= rooms[roomId].players.length)
				// 	rooms[roomId].turn = rooms[roomId].players.length - 1;
			}
			socket.broadcast
				.to(roomId)
				.emit("room.changed", rooms[roomId]);
		});
	});
});

module.exports = server;
