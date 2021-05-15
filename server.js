const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);

const io = require('socket.io')(server, {
  cors: {
    origin: "*",
	   methods: ["GET"]
   }
  });


require('dotenv').config() //Load environment variables

//Setup Sessions

var session = require("express-session")({
    secret: process.env.SESSION_SECRET,
    resave: true,
    saveUninitialized: true
});
var sharedsession = require("express-socket.io-session");
app.use(session);
io.use(sharedsession(session, {
    autoSave:true
}));


app.use(express.urlencoded({ extended: false }))
app.set('view engine', 'ejs');


//Include required classes from external files
const {Game, Line} = require("./game.js");
const {Player} = require("./player.js");

//Empty games dictionary
let games = {};


const PORT = process.env.PORT || 3000;

//Set public folder to serve static content
app.use(express.static('public'));

app.get('/', (req, res) => {
  let roomCode = req.query.room;
  if (roomCode!=null) {
    joinOrCreateGame(roomCode, req, res); //Automatically joins game if a url parameter with roomCode is defined
    return;
  }

  let error = null;
  if (req.session.error != null) error = req.session.error;
  req.session.error = null;
  res.render("joinScreen", {error: error, loggedIn: req.session.loggedIn});
});

app.get("/play", (req, res) => {
  if (req.session.roomCode==null || req.session.roomCode=="") {
    req.session.error = {message: "Invalid room code"};
    res.redirect("/");
    return;
  }
  let game = games[req.session.roomCode];

  if (game==null || game.started) {
    if (game!=null && game.started) req.session.error = {message: "Game has already started"}
    res.redirect("/");
    return;
  }

  let playerNum = 0;
  let admin = false;
  let role = -1;
  for (let player of game.players) {
    if (player.id==req.session.playerId) {
      playerNum = player.number;
      admin = player.admin;
      role = player.role;
    }
  }

  res.render("gameAndWaitingRoom", {
    playerNumber: playerNum,
    width: game.width,
    height: game.height,
    room: game.room,
    role: role,
    admin: admin,
    SERVER_ADDRESS: process.env.SERVER_ADDRESS
  });
})

app.post('/', (req, res) => {
  let code = req.body.code;
  if (code == null || req.session.roomCode=="") {
    req.session.error = {message: "Invalid room code"};
    return res.redirect("/");
  }
  joinOrCreateGame(code, req, res);
});

app.post('/logout', (req, res) => {
  req.session.loggedIn = false;
  req.session.user = null;
  res.redirect('/');
});

//Routes
app.use('/register', require('./routes/register'));
app.use('/login', require('./routes/login'));
app.use('/account', require('./routes/profile'));
app.use('/profile', require('./routes/profile'));
app.use('/activate', require('./routes/activate'));

app.get('*', (req, res) => {res.redirect("/");});

function joinOrCreateGame(code, req, res) {
  if (!(code in games)) {
    games[code] = new Game(code);
  }
  let game = games[code];
  req.session.playerId = req.sessionID;
  if (req.session.loggedIn) req.session.playerId = req.session.user._id;

  for (let player of game.players) {
    if (player.id==req.session.playerId) {
      req.session.error = {message: "You are already in this game."};
      return res.redirect("/");
    }
  }

  let playerNum = 0;
  if (game.players.length > 0) playerNum = game.players[game.players.length-1].number+1;

  let role = -1;
  let name = null;
  if (req.session.loggedIn==true) {
    if (req.session.user.role==0 || req.session.user.role==null) {
      req.session.error = {message: "Your account is not activated, please wait while your account is activated before you can play games."};
      return res.redirect("/");
    }
    role = req.session.user.role;
    name = req.session.user.displayName;
  }

  let admin = false; //Check if admin access
  if (game.players.length==0) admin = true;
  if (req.session.loggedIn && (req.session.user.role == 2 || req.session.user.role == 3)) admin = true; //Give admins and moderators admin access in any room they join


  let newPlayer = new Player(req.session.playerId, playerNum, admin, role, name);

  //New player created
  game.players.push(newPlayer); //Add new player object to room

  if (game.started) {
    req.session.error = {message: "Game has already started"}
    res.redirect("/");
    return;
  } else {
    req.session.roomCode = code;
    res.redirect("/play")
  }
}

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

//Socket methods

io.on("connection", (socket) => {
  if (socket.handshake.session) {
    let roomCode = socket.handshake.session.roomCode;
    if (!(roomCode==null || roomCode=="")) {
      socket.join("Room:"+roomCode);
    }
    let game = games[roomCode];
    if (game!=null) io.to("Room:"+game.room).emit("playerList", game.updatePlayerNames()); //Sends updated player list
  }

  socket.on("setName", (name) => { //When user wants to change their name
    if (! ( name.length >= 2 && name.length <= 25) ) return;

    if (socket.handshake.session.loggedIn) {
      if (socket.handshake.session.user.role != -1) return;
    }
    let code = socket.handshake.session.roomCode;
    if (code=="" || code==null) return;
    if (!(code in games)) return;
    let game = games[code];
    if (game==null) return;

    for (let player of game.players) {
      if (player.id==socket.handshake.session.playerId) {
        player.name = name;
      }
    }
    io.to("Room:"+game.room).emit("playerList", game.updatePlayerNames());
  });


  socket.on("sizeChange", (size) => { //Whenever user wants to change size setting of game
    let code = socket.handshake.session.roomCode;
    if (code=="" || code==null) return;
    if (!(code in games)) return;
    let game = games[code];
    if (game==null) return;

    for (let player of game.players) {
      if (player.id==socket.handshake.session.playerId && player.admin) {
        game.width = size.width || game.width;
        game.height = size.height || game.height;
        io.to("Room:"+game.room).emit("gridSize", game.width, game.height);
      }
    }
  });


  socket.on("colourChange", (colour) => { //Whenever user wants to change their player colour
    let code = socket.handshake.session.roomCode;
    if (code=="" || code==null) return;
    if (!(code in games)) return;
    let game = games[code];
    if (game==null) return;

    for (let player of game.players) {
      if (player.id==socket.handshake.session.playerId) {
        player.pattern.colour = colour;
        io.to("Room:"+game.room).emit("playerList",game.updatePlayerNames()); //Updates playerlist
        return;
      }
    }
  });


  socket.on("gameStart", () => { //Runs when start button is pressed
    let code = socket.handshake.session.roomCode;

    if (code=="" || code==null) return;
    if (!(code in games)) return;
    let game = games[code];

    if (game==null) return;

    for (let player of game.players) {
      if (player.id==socket.handshake.session.playerId && player.admin) { //Must have admin access
        game.started = true;
        io.to("Room:"+code).emit("gameStart", {
          width: game.width,
          height: game.height
        });
        sendGameState(game);
        io.to("Room:" + game.room).emit("playerList", game.updatePlayerNames()); //Updates playerlist
      }
    }
  });


  socket.on("restart", () => { //Runs when start button is pressed
    let code = socket.handshake.session.roomCode;
    if (code=="" || code==null) return;
    if (!(code in games)) return;
    let game = games[code];
    if (game==null) return;
    for (let player of game.players) {
      if (game.finished && player.id==socket.handshake.session.playerId && player.admin) { //Must have admin access
        game.restart();
        sendGameState(game);
        io.to("Room:"+game.room).emit("playerList", game.updatePlayerNames()); //Sends updated player list
      }
    }
  });

  socket.on("move", (startPosition, endPosition) => { //When player places a line
    let gameCode = socket.handshake.session.roomCode;
    let game = games[gameCode];
    if (game==null) return;
    if (!(game.started==true)) return;
    if (game.players[game.currentTurn].id!=socket.handshake.session.playerId) return;
    game.createLine(startPosition, endPosition, game.currentTurn);
    sendGameState(game);
    io.to("Room:"+game.room).emit("playerList", game.updatePlayerNames()); //Sends updated player list
  });


  socket.on("leave", () => { //If leave event is sent
    let gameCode = socket.handshake.session.roomCode;
    if (gameCode==null) return;
    io.to("Room:"+gameCode).emit("gameEnd");
    if (!(gameCode in games)) return;
    delete games[gameCode];
    io.of("/").adapter.rooms.delete("Room:"+gameCode);
  });

  socket.on("disconnecting", () => { //When socket disconnects
    let gameCode = socket.handshake.session.roomCode;
    if (gameCode==null) return;
    io.to("Room:"+gameCode).emit("gameEnd");
    if (!(gameCode in games)) return;
    delete games[gameCode];
    io.of("/").adapter.rooms.delete("Room:"+gameCode);
  });
})



server.listen(PORT, () => { //Listens on PORT (defaults to 3000)
  console.log('listening on *:', PORT);
})
