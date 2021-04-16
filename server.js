const app = require('express')();
const http = require('http');
const server = http.createServer(app);
const io = require('socket.io')(server,{
  cors: {
    origin: "*",
	   methods: ["GET"]
   }
  });
const {Game, Line, Square} = require("./game.js");

let games = {};
let roomCodes = {};

const PORT = process.env.PORT || 3000;

app.get('/game.js', (req, res) => {
  res.sendFile(__dirname + '/Frontend/game.js');
});

app.get('/index.js', (req, res) => {
  res.sendFile(__dirname + '/Frontend/index.js');
});

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/Frontend/index.html');
});

io.on("connection", (socket) => {
  socket.on("joinGame", (code) => {
    if (code=="" || code==null) return;
    if (!(code in games)) {
      games[code] = new Game(code);
    }
    let game = games[code];
    game.players.push({id: socket.id});
    if (game.started) {
      socket.emit("gameJoin", {"success": false, "errorMessage": "Game has already started"});
    } else {
      roomCodes[socket.id] = code;
      socket.join("Room:"+code);
      socket.emit("gameJoin", {"success": true});
    }
    console.log(code);
  });

  socket.on("gameStart", () => {
    let code = roomCodes[socket.id];
    if (code=="" || code==null) return;
    if (!(code in games)) return;
    let game = games[code];
    if (game==null) return;
    game.started = true;
    io.to("Room:"+code).emit("gameStart", {width: game.width, height: game.height});
  });

  socket.on("move", (startPosition, endPosition) => {
    if (!(socket.id in roomCodes)) return;
    let gameCode = roomCodes[socket.id];
    let game = games[gameCode];
    if (game==null) return;
    if (!(game.started==true)) return false;
    game.createLine(startPosition, endPosition);
    io.to("Room:"+game.room).emit("gameState", {lines: game.lines, squares: game.squares});
    console.log("Room:"+game);
  });

  socket.on("leave", () => {
    if (!(socket.id in roomCodes)) return;
    let gameCode = roomCodes[socket.id];
    if (gameCode==null) return;
    io.to("Room:"+gameCode).emit("gameEnd");
    for (let player of games[gameCode].players) {
      delete roomCodes[player.id];
    }
    if (!(gameCode in games)) return;
    delete games[gameCode];
    io.of("/").adapter.rooms.delete("Room:"+gameCode);
    console.log(games);
    console.log(roomCodes);
  });
  socket.on("disconnecting", () => {
    if (!(socket.id in roomCodes)) return;
    let gameCode = roomCodes[socket.id];
    if (gameCode==null) return;
    io.to("Room:"+gameCode).emit("gameEnd");
    for (let player of games[gameCode].players) {
      delete roomCodes[player.id];
    }
    if (!(gameCode in games)) return;
    delete games[gameCode];
    io.of("/").adapter.rooms.delete("Room:"+gameCode);
    console.log(games);
    console.log(roomCodes);
  });
})

server.listen(PORT, () => {
  console.log('listening on *:', PORT);
})
