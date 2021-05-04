const app = require('express')();
const http = require('http');
const server = http.createServer(app);
const io = require('socket.io')(server,{
  cors: {
    origin: "*",
	   methods: ["GET"]
   }
  });

const {Game, Line} = require("./game.js");
const {Player} = require("./player.js");

let games = {};
let roomCodes = {};

const PORT = process.env.PORT || 3000;

app.get('/game.js', (req, res) => {
  res.sendFile(__dirname + '/Frontend/game.js');
});
app.get('/index.js', (req, res) => {
  res.sendFile(__dirname + '/Frontend/index.js');
});
app.get('/square.js', (req, res) => {
  res.sendFile(__dirname + '/Frontend/square.js');
});
app.get('/style.css', (req, res) => {
  res.sendFile(__dirname + '/Frontend/style.css');
});
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/Frontend/index.html');
});
app.get('/getAdmin', (req, res) => { //Sets cookie that gives this user admin access in every room they join
  res.cookie('admin',"true", { maxAge: 1000 * 86400 * 7 });
  res.redirect('/');
});



function sendGameState(game) { //Sends the current game state, whenever an update happens such as someone placing a line
  io.to("Room:"+game.room).emit("gameState",
    {
      lines: game.lines,
      squares: game.squares,
      currentTurn: game.currentTurn,
      finished: game.finished
    }
  );
}

io.on("connection", (socket) => {
  socket.on("joinGame", (code, cookies) => { //When ever a user tries to join a room
    if (code=="" || code==null) return;
    if (!(code in games)) {
      games[code] = new Game(code);
    }
    let game = games[code];
    for (let player of game.players) {
      if (player.id==socket.id) {
        socket.emit("gameJoin",
          {
            "success": false,
            "errorMessage": "You are already in this game"
          }
        );
        return;
      }
    }

    let playerNum = 0;
    if (game.players.length>0) playerNum = game.players[game.players.length-1].number+1;

    let admin = false; //Check if admin access
    if (game.players.length==0) admin = true;

    cookies = (cookies || "").split("; ");
    let cookiesParsed = {};
    for (let cookie of cookies) cookiesParsed[cookie.split("=")[0]] = cookie.split("=")[1];
    if (cookiesParsed.admin=="true") admin = true;

    //New player created
    game.players.push(new Player(socket.id, playerNum, admin)); //Add new player object to room

    if (game.started) {
      socket.emit("gameJoin", {"success": false, "errorMessage": "Game has already started"});
    } else {
      roomCodes[socket.id] = code; //Find room
      socket.join("Room:"+code);
      socket.emit("gameJoin",
        {
          success: true,
          playerNumber: playerNum,
          width: game.width,
          height: game.height,
          room: game.room,
          admin: admin
        });

      io.to("Room:"+game.room).emit("playerList",game.updatePlayerNames()); //Sends updated player list
    }
  });


  socket.on("setName", (name) => { //When user wants to change their name
    if (! ( name.length >= 2 && name.length <= 25) ) return;

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
    io.to("Room:"+game.room).emit("playerList",game.updatePlayerNames());
  });


  socket.on("sizeChange", (size) => { //Whenever user wants to change size setting of game
    let code = roomCodes[socket.id];
    if (code=="" || code==null) return;
    if (!(code in games)) return;
    let game = games[code];
    if (game==null) return;

    for (let player of game.players) {
      if (player.id==socket.id && player.admin) {
        game.width = size.width || game.width;
        game.height = size.height || game.height;
        io.to("Room:"+game.room).emit("gridSize", game.width, game.height);
      }
    }
  });


  socket.on("colourChange", (colour) => { //Whenever user wants to change their player colour
    let code = roomCodes[socket.id];
    if (code=="" || code==null) return;
    if (!(code in games)) return;
    let game = games[code];
    if (game==null) return;

    for (let player of game.players) {
      if (player.id==socket.id) {
        player.pattern.colour = colour;
        io.to("Room:"+game.room).emit("playerList",game.updatePlayerNames()); //Updates playerlist
        return;
      }
    }
  });


  socket.on("gameStart", () => { //Runs when start button is pressed
    let code = roomCodes[socket.id];
    if (code=="" || code==null) return;
    if (!(code in games)) return;
    let game = games[code];
    if (game==null) return;
    for (let player of game.players) {
      if (player.id==socket.id && player.admin) { //Must have admin access
        game.started = true;
        io.to("Room:"+code).emit("gameStart", {
          width: game.width,
          height: game.height
        });
        sendGameState(game);
        io.to("Room:"+game.room).emit("playerList",game.updatePlayerNames()); //Updates playerlist
      }
    }
  });


  socket.on("restart", () => { //Runs when start button is pressed
    let code = roomCodes[socket.id];
    if (code=="" || code==null) return;
    if (!(code in games)) return;
    let game = games[code];
    if (game==null) return;
    for (let player of game.players) {
      if (game.finished && player.id==socket.id && player.admin) { //Must have admin access
        game.restart();
        sendGameState(game);
        io.to("Room:"+game.room).emit("playerList", game.updatePlayerNames()); //Sends updated player list
      }
    }
  });

  socket.on("move", (startPosition, endPosition) => { //When player places a line
    if (!(socket.id in roomCodes)) return;
    let gameCode = roomCodes[socket.id];
    let game = games[gameCode];
    if (game==null) return;
    if (!(game.started==true)) return;
    if (game.players[game.currentTurn].id!=socket.id) return;
    game.createLine(startPosition, endPosition, game.currentTurn);
    sendGameState(game);
    io.to("Room:"+game.room).emit("playerList", game.updatePlayerNames()); //Sends updated player list
  });


  socket.on("leave", () => { //If leave event is sent
    if (!(socket.id in roomCodes)) return;
    let gameCode = roomCodes[socket.id];
    if (gameCode==null) return;
    io.to("Room:"+gameCode).emit("gameEnd");
    if (!(gameCode in games)) return;
    for (let player of games[gameCode].players) {
      delete roomCodes[player.id];
    }
    delete games[gameCode];
    io.of("/").adapter.rooms.delete("Room:"+gameCode);
  });

  socket.on("disconnecting", () => { //When socket disconnects
    if (!(socket.id in roomCodes)) return;
    let gameCode = roomCodes[socket.id];
    if (gameCode==null) return;
    io.to("Room:"+gameCode).emit("gameEnd");
    if (!(gameCode in games)) return;
    for (let player of games[gameCode].players) {
      if (player.id in roomCodes) delete roomCodes[player.id];
    }
    delete games[gameCode];
    io.of("/").adapter.rooms.delete("Room:"+gameCode);
  });
})


server.listen(PORT, () => { //Listens on PORT (defaults to 3000)
  console.log('listening on *:', PORT);
})
