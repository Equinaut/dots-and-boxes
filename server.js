const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const mongoose = require('mongoose');
const User = require('./models/User');

const io = require('socket.io')(server, {
  cors: {
    origin: "*",
	   methods: ["GET"]
   }
  });


require('dotenv').config() //Load environment variables

mongoose.connect(process.env.MONGO_DB_URL, {
  useNewUrlParser: true, useUnifiedTopology: true
});

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
  let error = null;
  if (req.session.error != null) error = req.session.error;
  req.session.error = null;
  res.render("joinScreen", {error: error, loggedIn: req.session.loggedIn});
});

async function joinOrCreateGame(req, res, next) {
  let code = req.params.roomCode;

  if (!(/^[a-zA-Z0-9]{1,25}$/.test(code))) {
    req.session.error = {message: "Invalid room code"};
    return res.redirect("/");
  }

  if (!(code in games)) {
    games[code] = new Game(code);
  }
  let game = games[code];

  req.session.playerId = req.sessionID;
  if (req.session.loggedIn) req.session.playerId = req.session.user._id;

  for (let player of game.players) {
    if (player.id==req.session.playerId) { //Joining when already in the game (On other clients)
      req.session.roomCode = code;
      player.connectedClients++; //Add one to connected clients count
      next(); //Continue to join game;
      return;
    }
  }

  if (game.started) {
    req.session.error = {message: "Game has already started"}
    return res.redirect("/");
  }

  let playerNum = game.players.length;

  let role = -1;
  let name = null;
  let pattern = null;

  if (req.session.loggedIn==true) {


    let user = await User.findOne(
      {
        _id: req.session.user._id
      }, {
        username: 1,
        displayName: 1,
        password: 1,
        role: 1,
        createdAt: 1,
        pattern: 1
      });

    if (user==null) { //Find if user exists
      req.session.error = {message: "User doesn't exist"};
      return res.redirect('/login')
    }

    let userObject = {
        username: user.username,
        displayName: user.displayName,
        role: user.role,
        createdAt: user.createdAt,
        pattern: user.pattern,
        _id: user._id
    };

    user.lastOnline = Date.now() || 0; //Update lastOnline field
    await user.save();

    req.session.user = userObject;

    if (req.session.user.role==0 || req.session.user.role==null) {
      req.session.error = {message: "Your account is not activated, please wait while an admin activates your account."};
      return res.redirect("/");
    }
    role = req.session.user.role;
    name = req.session.user.displayName;
    pattern = req.session.user.pattern;
  }

  let admin = false; //Check if admin access
  if (game.players.length==0) admin = true;
  if (req.session.loggedIn && (req.session.user.role == 2 || req.session.user.role == 3)) admin = true; //Give admins and moderators admin access in any room they join


  let newPlayer = new Player(req.session.playerId, playerNum, game.nextPlayerNumber++, admin, role, name, pattern);

  //New player created
  game.players.push(newPlayer); //Add new player object to room
  req.session.roomCode = code;

  next();
}

app.get("/play/:roomCode", joinOrCreateGame, (req, res) => {
  let game = games[req.params.roomCode];

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
    width: game.settings.width,
    height: game.settings.height,
    room: game.room,
    role: role,
    admin: admin,
    SERVER_ADDRESS: process.env.SERVER_ADDRESS,
    gamemode: game.settings.gamemode
  });
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
app.get("/findUser", (req, res) => {res.render("otherPlayersProfile");});
app.use('/activate', require('./routes/activate'));
app.use('/accountSettings', require('./routes/accountSettings'));
app.use('/customise', require('./routes/customise'));

app.get('*', (req, res) => {res.redirect("/")});


function sendGameState(game) { //Sends the current game state, whenever an update happens such as someone placing a line
  io.to("Room:"+game.room).emit("gameState",
    {
      lines: game.lines,
      shapes: game.shapes,
      currentTurn: game.currentTurn,
      finished: game.finished
    }
  );
}

//Socket methods

io.on("connection", (socket) => {
  if (socket.handshake.session) {
    let roomCode = socket.handshake.session.roomCode;
    if (socket.handshake.session.playerId) socket.join("Room:"+roomCode+"Player:"+socket.handshake.session.playerId); //Join socket room unique to gameCode and playerId

    if (!(roomCode==null || roomCode=="")) socket.join("Room:"+roomCode); //Join socket room unique to gameCode
    let game = games[roomCode];
    if (game==null) return;
    io.to("Room:"+game.room).emit("playerList", game.updatePlayerNames()); //Sends updated player list

    if (game.started) {
      io.to("Room:"+roomCode+"Player:"+socket.handshake.session.playerId).emit("gameStart", {
        width: game.settings.width,
        height: game.settings.height
      }); //If joining a game that has started, then send start command and send current gameState out.
      sendGameState(game);
    }
  }

  socket.on("setName", (name) => { //When user wants to change their name
    if (! ( name.length >= 2 && name.length <= 25) ) return;

    if (socket.handshake.session.loggedIn) {
      if (socket.handshake.session.user.role != -1) return; //Don't allow name changes to users who are logged in
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
    let game = games[code];
    if (game==null) return;

    for (let player of game.players) {
      if (player.id==socket.handshake.session.playerId && player.admin) {
        game.nextSettings.width = size.width || game.nextSettings.width;
        game.nextSettings.height = size.height || game.nextSettings.height;
        io.to("Room:"+game.room).emit("settingsChange", "size", {width: game.nextSettings.width, height: game.nextSettings.height});
        if (!game.roundStarted) {
          game.settings = Object.assign({}, game.nextSettings);
          io.to("Room:"+game.room).emit("nextSettings");
        }
      }
    }
  });

  socket.on("settingsChange", (setting, value) => {
    let code = socket.handshake.session.roomCode;
    let game = games[code];
    if (game==null) return;

    for (let player of game.players) {
      if (player.id==socket.handshake.session.playerId && player.admin) {
        if (setting === "gamemode" && (value == 1 || value == 2)) {
          game.nextSettings.gamemode = value;

          io.to("Room:"+game.room).emit("settingsChange", "gamemode", value);
          if (!game.roundStarted) {
            game.settings = Object.assign({}, game.nextSettings);
            io.to("Room:"+game.room).emit("nextSettings");
          }
        }
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
          width: game.settings.width,
          height: game.settings.height
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
        io.to("Room:"+game.room).emit("nextSettings");
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


  function leave() { //Function to handle user leaving game or disconnecting

    let gameCode = socket.handshake.session.roomCode;

    let game = games[gameCode];
    if (game==null) return;
    let thisPlayer = null;
    for (let player of game.players) {
      if (player.id == socket.handshake.session.playerId) thisPlayer = player;
    }

    if ((game.started || game.players.length == 1) && thisPlayer.connectedClients <= 1) { //If game has started then end it

      io.to("Room:"+gameCode).emit("gameEnd");
      if (!(gameCode in games)) return;
      delete games[gameCode];
      io.of("/").adapter.rooms.delete("Room:"+gameCode);

    } else { //Otherwise just remove player from playerlist as game is still in waiting room

      for (let i=0; i<game.players.length; i++) {
        player = game.players[i];
        if (player.id==socket.handshake.session.playerId) {
            if (player.connectedClients <= 1) {
            game.players.splice(i,1); //Remove player from list
            socket.leave("Room:"+gameCode+"Player:"+socket.handshake.session.playerId); //Leave socket room unique to playerId and gameCode
            socket.leave("Room:"+gameCode); //Leave socket room unique to gameCode
            for (let j=0; j<game.players.length; j++) { //Renumber remaining players
              game.players[j].number = j;

              io.to("Room:"+gameCode+"Player:"+game.players[j].id).emit("newPlayerNum", j);
              if (j==0) { //Give admin to new player 0
                game.players[j].admin = true;
                io.to("Room:"+gameCode+"Player:"+game.players[j].id).emit("becomeAdmin");
              }
            }

            io.to("Room:" + game.room).emit("playerList", game.updatePlayerNames()); //Updates playerlist
            return;
          } else {
            player.connectedClients--;
          }
        }
      }
    }
  }
  socket.on("disconnecting", leave); //When socket disconnects
});

server.listen(PORT, () => { //Listens on PORT (defaults to 3000)
  console.log('listening on *:', PORT);
})
