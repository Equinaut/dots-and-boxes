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
const COLOURS = ["red","green","yellow","blue","brown","cyan","light green","orange","gold","pink","purple"];


app.get('/game.js', (req, res) => {
  res.sendFile(__dirname + '/Frontend/game.js');
});

app.get('/index.js', (req, res) => {
  res.sendFile(__dirname + '/Frontend/index.js');
});

app.get('/style.css', (req, res) => {
  res.sendFile(__dirname + '/Frontend/style.css');
});

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/Frontend/index.html');
});

function sendGameState(game) {
  io.to("Room:"+game.room).emit("gameState", {lines: game.lines, squares: game.squares, currentTurn: game.currentTurn});
}

io.on("connection", (socket) => {
  socket.on("joinGame", (code) => {
    if (code=="" || code==null) return;
    if (!(code in games)) {
      games[code] = new Game(code);
    }
    let game = games[code];
    for (let player of game.players) {
      if (player.id==socket.id) {
        socket.emit("gameJoin", {"success": false, "errorMessage": "You are already in this game"});
        return;
      }
    }
    let playerNum = 0;
    if (game.players.length>0) playerNum = game.players[game.players.length-1].number+1;
    game.players.push({id: socket.id, number: playerNum, name: "Player "+(playerNum+1).toString(), colour: COLOURS[playerNum%(COLOURS.length)]});
    if (game.started) {
      socket.emit("gameJoin", {"success": false, "errorMessage": "Game has already started"});
    } else {
      roomCodes[socket.id] = code;
      socket.join("Room:"+code);
      socket.emit("gameJoin", {success: true, playerNumber: playerNum});
      io.to("Room:"+game.room).emit("playerList",game.updatePlayerNames());
    }
    console.log(code);
  });

  socket.on("setName", (name) => {
    if (!(name.length>3&&name.length<25)) return;
    let code = roomCodes[socket.id];
    if (code=="" || code==null) return;
    if (!(code in games)) return;
    let game = games[code];
    if (game==null) return;
    for (let player of game.players) {
      if (player.id==socket.id) {
        player.name = name;
      }
    }
    console.log("Room:"+game.room, game.updatePlayerNames());
    io.to("Room:"+game.room).emit("playerList",game.updatePlayerNames());
  });

  socket.on("gameStart", () => {
    let code = roomCodes[socket.id];
    if (code=="" || code==null) return;
    if (!(code in games)) return;
    let game = games[code];
    if (game==null) return;
    game.started = true;
    io.to("Room:"+code).emit("gameStart", {width: game.width, height: game.height});
    sendGameState(game);
  });

  socket.on("move", (startPosition, endPosition) => {
    if (!(socket.id in roomCodes)) return;
    let gameCode = roomCodes[socket.id];
    let game = games[gameCode];
    if (game==null) return;
    if (!(game.started==true)) return;
    if (game.players[game.currentTurn].id!=socket.id) return;
    game.createLine(startPosition, endPosition, game.currentTurn);
    sendGameState(game);
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
